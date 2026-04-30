import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { generateApiKey } from '@/lib/security/api-key-auth'
import { z } from 'zod'

const createSchema = z.object({
  name:   z.string().min(1).max(80),
  scopes: z.array(z.enum(['read', 'write'])).min(1).default(['read']),
})

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'ADMIN')
    const keys = await prisma.apiKey.findMany({
      where: { companyId: ctx.companyId, isActive: true },
      select: { id: true, name: true, keyPrefix: true, scopes: true, lastUsedAt: true, createdAt: true },
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
    requireRole(ctx.role, 'ADMIN')

    // Max 10 keys per company
    const count = await prisma.apiKey.count({ where: { companyId: ctx.companyId, isActive: true } })
    if (count >= 10) return apiError('Maximum 10 clés API par entreprise', 400)

    let body: unknown
    try { body = await req.json() } catch { return apiError('Corps invalide', 400) }
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 400)

    const mode = process.env.CHARGILY_MODE === 'live' ? 'live' : 'test'
    const { raw, hash, prefix } = generateApiKey(mode as 'live' | 'test')

    const key = await prisma.apiKey.create({
      data: {
        companyId: ctx.companyId,
        name: parsed.data.name,
        keyHash: hash,
        keyPrefix: prefix,
        scopes: parsed.data.scopes,
      },
      select: { id: true, name: true, keyPrefix: true, scopes: true, createdAt: true },
    })

    // Return raw key ONCE — never stored in plain text
    return apiSuccess({ ...key, rawKey: raw }, 201)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    if (e instanceof Error && e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    return apiError('Erreur serveur', 500)
  }
}
