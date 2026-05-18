import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { APPS, type AppId } from '@/lib/pricing/config'

// DELETE — résilier un essai ou un abonnement d'app
export async function DELETE(
  req: NextRequest,
  { params }: { params: { appId: string } }
) {
  try {
    const rl = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
    if (!rl.success) return rateLimitResponse(rl.reset)

    const { companyId } = await getTenantContext()
    const appId = params.appId as AppId

    if (!APPS[appId]) return apiError('App introuvable', 404)
    if (APPS[appId].core) return apiError('Impossible de résilier une app core gratuite', 400)

    const sub = await prisma.yelhaSubscription.findUnique({ where: { companyId } })
    if (!sub) return apiError('Abonnement introuvable', 404)

    // Remove from trialApps and/or extraApps
    const newTrialApps = sub.trialApps.filter(a => a !== appId)
    const newExtraApps = sub.extraApps.filter(a => a !== appId)

    // Remove from appTrialsEndsAt
    const appTrialsEndsAt = { ...((sub.appTrialsEndsAt as Record<string, string>) ?? {}) }
    delete appTrialsEndsAt[appId]

    const [updated] = await prisma.$transaction([
      prisma.yelhaSubscription.update({
        where: { companyId },
        data: {
          trialApps: newTrialApps,
          extraApps: newExtraApps,
          appTrialsEndsAt,
        },
      }),
      // Cascade : annuler l'AppSubscription correspondante si présente —
      // sinon canAccessApp continuerait à grant access via la nouvelle table.
      prisma.appSubscription.updateMany({
        where: { companyId, appId, status: { in: ['ACTIVE', 'TRIAL'] } },
        data: { status: 'CANCELLED' },
      }),
    ])

    return apiSuccess({ subscription: updated })
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500, err)
  }
}
