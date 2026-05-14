import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const { companyId } = await getTenantContext()

    const payments = await prisma.appPayment.findMany({
      where: { appSubscription: { companyId } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return apiSuccess({ payments })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500)
  }
}
