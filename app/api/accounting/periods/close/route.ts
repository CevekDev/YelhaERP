import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { z } from 'zod'

const schema = z.object({
  year: z.number().int().min(2000).max(2100),
  month: z.number().int().min(1).max(12),
})

export async function POST(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'ACCOUNTANT')
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 400, parsed.error.flatten())
    const { year, month } = parsed.data
    const existing = await prisma.fiscalPeriod.findFirst({
      where: { companyId: ctx.companyId, year, month },
    })
    if (existing?.isClosed) return apiError('Période déjà clôturée', 409)
    const period = await prisma.fiscalPeriod.upsert({
      where: { companyId_year_month: { companyId: ctx.companyId, year, month } },
      update: { isClosed: true, closedAt: new Date(), closedBy: ctx.userId },
      create: { companyId: ctx.companyId, year, month, isClosed: true, closedAt: new Date(), closedBy: ctx.userId },
    })
    return apiSuccess(period)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non autorisé', 401)
    if (e instanceof Error && e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    return apiError('Erreur serveur', 500, e)
  }
}
