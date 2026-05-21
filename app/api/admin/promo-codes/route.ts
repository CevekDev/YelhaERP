import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

const createSchema = z.object({
  code: z.string().min(3).max(32).regex(/^[A-Z0-9_-]+$/, 'Code : majuscules, chiffres, - et _ uniquement'),
  discountType: z.enum(['PERCENT', 'FREE_MONTHS']),
  discountValue: z.number().int().min(1).max(100),
  planId: z.string().optional().nullable(),
  maxUses: z.number().int().min(1).optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
})

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    await requireSuperAdmin(req)
    const codes = await prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } })
    return apiSuccess({ codes })
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}

export async function POST(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    await requireSuperAdmin(req)

    let body: unknown
    try { body = await req.json() } catch { return apiError('Corps invalide', 400) }
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.errors[0].message, 422)

    const { code, discountType, discountValue, planId, maxUses, expiresAt } = parsed.data

    const existing = await prisma.promoCode.findUnique({ where: { code } })
    if (existing) return apiError('Ce code existe déjà', 409)

    const promoCode = await prisma.promoCode.create({
      data: {
        code,
        discountType,
        discountValue,
        planId: planId ?? null,
        maxUses: maxUses ?? null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    })
    return apiSuccess({ promoCode })
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
