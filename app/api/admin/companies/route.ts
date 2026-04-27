import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

const updatePlanSchema = z.object({
  companyId: z.string().cuid(),
  plan: z.enum(['TRIAL', 'STARTER', 'PRO', 'AGENCY']),
  trialEndsAt: z.string().datetime().optional(),
})

// Seul le OWNER du compte admin peut accéder
export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    // Vérification admin global — le OWNER de la première entreprise créée
    requireRole(ctx.role, 'OWNER')

    const { searchParams } = req.nextUrl
    const page = Math.max(1, Number(searchParams.get('page') ?? 1))
    const limit = 20

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        select: {
          id: true, name: true, plan: true, trialEndsAt: true, createdAt: true,
          _count: { select: { users: true, invoices: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.company.count(),
    ])
    return apiSuccess({ companies, total, page, limit })
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}

export async function PATCH(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'OWNER')
    const body = await req.json().catch(() => null)
    const parsed = updatePlanSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422)
    const { companyId, plan, trialEndsAt } = parsed.data
    const updated = await prisma.company.update({
      where: { id: companyId },
      data: { plan, ...(trialEndsAt && { trialEndsAt: new Date(trialEndsAt) }) },
    })
    return apiSuccess(updated)
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
