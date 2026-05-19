import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { rateLimitByKey } from '@/lib/security/ratelimit'
import { canAccessSubs } from '@/lib/billing/check-access'

const KEY_PREFIX = 'yelha_sub_'

export interface SubApiContext {
  userId: string
  keyId: string
}

export function generateRawKey(): { rawKey: string; keyHash: string; keyPrefix: string } {
  const random = crypto.randomBytes(32).toString('hex') // 64 chars
  const rawKey = `${KEY_PREFIX}${random}`
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex')
  // Stocke un préfixe identifiable (16 chars après "yelha_sub_") sans révéler tout
  const keyPrefix = rawKey.slice(0, KEY_PREFIX.length + 8)
  return { rawKey, keyHash, keyPrefix }
}

export function hashKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex')
}

export function maskKey(prefix: string): string {
  return `${prefix}${'•'.repeat(32)}`
}

function errorRes(message: string, status: number, code: string): NextResponse {
  return NextResponse.json({ error: message, code }, { status })
}

function jsonOk<T>(data: T, status = 200, extraHeaders: Record<string, string> = {}): NextResponse {
  const res = NextResponse.json(data, { status })
  for (const [k, v] of Object.entries(extraHeaders)) res.headers.set(k, v)
  return res
}

const SUB_API_RATE_LIMIT = { limit: 60, windowMs: 60_000 }

export async function withSubApi(
  req: NextRequest,
  handler: (ctx: SubApiContext) => Promise<NextResponse>,
): Promise<NextResponse> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return errorRes('Clé API manquante. Utilisez le header Authorization: Bearer <clé>.', 401, 'UNAUTHENTICATED')
  }
  const rawKey = authHeader.slice('Bearer '.length).trim()
  if (!rawKey.startsWith(KEY_PREFIX)) {
    return errorRes('Format de clé invalide.', 401, 'INVALID_KEY_FORMAT')
  }
  const keyHash = hashKey(rawKey)
  const key = await prisma.subApiKey.findUnique({ where: { keyHash } })
  if (!key || !key.isActive) {
    return errorRes('Clé API invalide ou révoquée.', 401, 'INVALID_KEY')
  }

  // Rate limit per key
  const rl = await rateLimitByKey(`sub-api_${key.id}`, SUB_API_RATE_LIMIT)
  if (!rl.success) {
    const reset = Math.ceil((rl.reset - Date.now()) / 1000)
    const res = errorRes('Trop de requêtes. Réessayez plus tard.', 429, 'RATE_LIMIT_EXCEEDED')
    res.headers.set('Retry-After', String(reset))
    res.headers.set('X-RateLimit-Limit', String(SUB_API_RATE_LIMIT.limit))
    res.headers.set('X-RateLimit-Remaining', '0')
    res.headers.set('X-RateLimit-Reset', String(rl.reset))
    return res
  }

  // Vérifier que l'abonnement YelhaSubs est toujours actif
  const hasAccess = await canAccessSubs(key.userId)
  if (!hasAccess) {
    return errorRes(
      'Votre abonnement YelhaSubs a expiré. Renouvelez sur subs.yelha.net/dashboard/settings/billing',
      403,
      'SUBSCRIPTION_EXPIRED',
    )
  }

  // Touch lastUsedAt (fire & forget)
  prisma.subApiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
    .catch(() => { /* ignore */ })

  const response = await handler({ userId: key.userId, keyId: key.id })
  response.headers.set('X-RateLimit-Limit', String(SUB_API_RATE_LIMIT.limit))
  response.headers.set('X-RateLimit-Remaining', String(rl.remaining))
  response.headers.set('X-RateLimit-Reset', String(rl.reset))
  return response
}

export const ok = jsonOk
export const apiError = errorRes
