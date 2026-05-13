import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { APPS, type AppId } from '@/lib/pricing/config'

const TRIAL_DAYS = 15

const postSchema = z.object({
  appId: z.enum(Object.keys(APPS) as [AppId, ...AppId[]]),
})

// POST — démarrer un essai de 15 jours pour une app
export async function POST(req: NextRequest) {
  try {
    const rl = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
    if (!rl.success) return rateLimitResponse(rl.reset)

    const { companyId } = await getTenantContext()

    const body = await req.json()
    const parsed = postSchema.safeParse(body)
    if (!parsed.success) return apiError('App invalide', 422, parsed.error.flatten())

    const { appId } = parsed.data
    const app = APPS[appId]

    // Core apps are always free — no trial needed
    if (app.core) return apiError('Cette app est incluse gratuitement', 400)

    const sub = await prisma.yelhaSubscription.findUnique({ where: { companyId } })
    if (!sub) return apiError('Abonnement introuvable', 404)

    // Already in extraApps (paid)
    if (sub.extraApps.includes(appId)) return apiError('Cette app est déjà active dans votre abonnement', 409)

    // Already trialing
    if (sub.trialApps.includes(appId)) {
      const existing = (sub.appTrialsEndsAt as Record<string, string>)?.[appId]
      const endsAt = existing ? new Date(existing) : null
      if (endsAt && endsAt > new Date()) {
        const daysLeft = Math.ceil((endsAt.getTime() - Date.now()) / 86400000)
        return apiError(`Un essai est déjà en cours pour cette app (${daysLeft} jours restants)`, 409)
      }
    }

    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
    const appTrialsEndsAt = { ...((sub.appTrialsEndsAt as Record<string, string>) ?? {}) }
    appTrialsEndsAt[appId] = trialEndsAt.toISOString()

    const updated = await prisma.yelhaSubscription.update({
      where: { companyId },
      data: {
        trialApps: { push: appId },
        appTrialsEndsAt,
      },
    })

    return apiSuccess({ subscription: updated, trialEndsAt: trialEndsAt.toISOString() }, 201)
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500, err)
  }
}
