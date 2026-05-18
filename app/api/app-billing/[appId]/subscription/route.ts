import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { getAppPlanConfig, getAppPlan } from '@/lib/pricing/app-plans'

export async function GET(req: NextRequest, { params }: { params: { appId: string } }) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const { companyId } = await getTenantContext()
    const { appId } = params

    const config = getAppPlanConfig(appId)
    if (!config) return apiError('App introuvable', 404)

    const sub = await prisma.appSubscription.findUnique({
      where: { companyId_appId: { companyId, appId } },
      include: { payments: { orderBy: { createdAt: 'desc' }, take: 5 } },
    })

    if (!sub) return apiSuccess({ subscription: null })

    const now = new Date()

    // Repair: sync trialEndsAt from old system if AppSubscription is missing it
    if (sub.status === 'TRIAL' && (!sub.trialEndsAt || sub.trialEndsAt < now)) {
      const yelhaSub = await prisma.yelhaSubscription.findUnique({ where: { companyId } })
      const oldEndsIso = (yelhaSub?.appTrialsEndsAt as Record<string, string> | null)?.[appId]
      const oldEnds = oldEndsIso ? new Date(oldEndsIso) : null
      if (oldEnds && oldEnds > now) {
        const repaired = await prisma.appSubscription.update({
          where: { id: sub.id },
          data: { trialEndsAt: oldEnds, currentPeriodEnd: oldEnds },
        })
        sub.trialEndsAt = repaired.trialEndsAt
        sub.currentPeriodEnd = repaired.currentPeriodEnd
      }
    }

    const plan = getAppPlan(appId, sub.planId)
    const isTrialExpired = sub.status === 'TRIAL' && sub.trialEndsAt && sub.trialEndsAt < now
    const effectiveStatus = isTrialExpired ? 'EXPIRED' : sub.status

    return apiSuccess({ subscription: { ...sub, effectiveStatus, plan } })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500)
  }
}
