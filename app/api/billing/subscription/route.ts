import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

export async function GET(req: NextRequest) {
  try {
    const rl = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
    if (!rl.success) return rateLimitResponse(rl.reset)

    const { userId } = await getTenantContext()

    let sub = await prisma.yelhaSubscription.findUnique({
      where: { userId },
      include: { payments: { orderBy: { createdAt: 'desc' }, take: 10 } },
    })

    // Auto-create trial subscription for companies sans abonnement existant
    if (!sub) {
      const trialEnd = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
      sub = await prisma.yelhaSubscription.create({
        data: {
          userId,
          planId: 'trial',
          status: 'TRIAL',
          billingCycle: 'MONTHLY',
          trialEndsAt: trialEnd,
          currentPeriodStart: new Date(),
          currentPeriodEnd: trialEnd,
          monthlyAmount: 0,
          limitEmails: 50,
          limitApiReq: 500,
        },
        include: { payments: true },
      })
    }

    return apiSuccess({ subscription: sub })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur'
    if (msg === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500, err)
  }
}
