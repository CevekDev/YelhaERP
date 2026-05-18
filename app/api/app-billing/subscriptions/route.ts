import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { APP_PLANS, getAppPlanConfig } from '@/lib/pricing/app-plans'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const { companyId } = await getTenantContext()

    const subs = await prisma.appSubscription.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    })

    const now = new Date()

    // Repair: si une AppSubscription a status=TRIAL mais trialEndsAt invalide,
    // et que l'ancien système (YelhaSubscription.trialApps) a un essai encore
    // valide, on sync. Corrige les données créées par l'ancien bug du checkout.
    const yelhaSub = await prisma.yelhaSubscription.findUnique({ where: { companyId } })
    const oldTrials = (yelhaSub?.appTrialsEndsAt as Record<string, string> | null) ?? {}
    for (const sub of subs) {
      const needsRepair =
        sub.status === 'TRIAL' &&
        (!sub.trialEndsAt || sub.trialEndsAt < now)
      if (!needsRepair) continue
      const oldEndsIso = oldTrials[sub.appId]
      if (!oldEndsIso) continue
      const oldEnds = new Date(oldEndsIso)
      if (oldEnds <= now) continue
      // Repair in DB
      const repaired = await prisma.appSubscription.update({
        where: { id: sub.id },
        data: { trialEndsAt: oldEnds, currentPeriodEnd: oldEnds },
      })
      sub.trialEndsAt = repaired.trialEndsAt
      sub.currentPeriodEnd = repaired.currentPeriodEnd
    }

    const enriched = subs.map(sub => {
      const config = getAppPlanConfig(sub.appId)
      const planConfig = config ? Object.values(config.plans).find(p => p.id === sub.planId) : null

      let effectiveStatus = sub.status
      if (sub.status === 'TRIAL' && sub.trialEndsAt && sub.trialEndsAt < now) {
        effectiveStatus = 'EXPIRED'
      }
      if (sub.status === 'ACTIVE' && sub.currentPeriodEnd < now) {
        effectiveStatus = 'EXPIRED'
      }

      return {
        ...sub,
        effectiveStatus,
        appName: config?.appName ?? sub.appId,
        planName: planConfig?.name ?? sub.planId,
        planFeatures: planConfig?.features ?? [],
      }
    })

    return apiSuccess({ subscriptions: enriched })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500)
  }
}
