import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    await requireSuperAdmin(req)
    const payments = await prisma.yelhaPayment.findMany({
      where: { status: 'PENDING', method: 'CCP' },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true, amount: true, planId: true, billingCycle: true,
        ccpRef: true, periodStart: true, periodEnd: true, createdAt: true,
        subscription: { select: { user: { select: { id: true, name: true, email: true } } } },
      },
    })
    return apiSuccess({ payments })
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
