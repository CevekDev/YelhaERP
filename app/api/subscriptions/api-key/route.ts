import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenantContext, hasRole } from '@/lib/security/tenant'
import { apiSuccess, apiError, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { generateRawKey } from '@/lib/sub-api/auth'

const postSchema = z.object({
  name: z.string().max(100).optional(),
})

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()

    if (!hasRole(ctx.role, 'ADMIN')) return apiError('Permissions insuffisantes', 403)

    const keys = await prisma.subApiKey.findMany({
      where: { userId: ctx.userId, isActive: true },
      select: { id: true, name: true, keyPrefix: true, lastUsedAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })
    return apiSuccess(keys)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    if (e instanceof Error && e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    return apiError('Erreur serveur', 500)
  }
}

export async function POST(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()

    // Seuls OWNER et ADMIN peuvent créer des clés API
    if (!hasRole(ctx.role, 'ADMIN')) return apiError('Permissions insuffisantes', 403)

    let body: unknown = {}
    try { body = await req.json() } catch { /* nom optionnel */ }
    const parsed = postSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 400)

    const activeCount = await prisma.subApiKey.count({
      where: { userId: ctx.userId, isActive: true },
    })
    if (activeCount >= 5) {
      return apiError('Limite atteinte : 5 clés actives maximum. Révoquez une clé existante.', 409)
    }

    const { rawKey, keyHash, keyPrefix } = generateRawKey()

    const created = await prisma.subApiKey.create({
      data: {
        userId: ctx.userId,
        name:      parsed.data.name || null,
        keyHash,
        keyPrefix,
      },
      select: { id: true, name: true, keyPrefix: true, createdAt: true },
    })

    return apiSuccess({ ...created, key: rawKey }, 201)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    if (e instanceof Error && e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    return apiError('Erreur serveur', 500)
  }
}
