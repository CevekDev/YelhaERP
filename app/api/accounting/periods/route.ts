import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    const { searchParams } = req.nextUrl
    const year = searchParams.get('year')
    const periods = await prisma.fiscalPeriod.findMany({
      where: { companyId: ctx.companyId, ...(year && { year: Number(year) }) },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    })
    return apiSuccess(periods)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non autorisé', 401)
    return apiError('Erreur serveur', 500, e)
  }
}
