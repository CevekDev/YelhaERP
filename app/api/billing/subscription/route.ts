import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { isAppIncluded, APPS, type AppId } from '@/lib/pricing/config'

const CORE_APPS: AppId[] = ['invoices', 'quotes', 'clients', 'purchases', 'stock']

const patchSchema = z.object({
  addApps:    z.array(z.enum(Object.keys(APPS) as [AppId, ...AppId[]])).optional(),
  removeApps: z.array(z.enum(Object.keys(APPS) as [AppId, ...AppId[]])).optional(),
})

export async function GET(req: NextRequest) {
  try {
    const rl = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
    if (!rl.success) return rateLimitResponse(rl.reset)

    const { companyId } = await getTenantContext()

    let sub = await prisma.yelhaSubscription.findUnique({
      where: { companyId },
      include: { payments: { orderBy: { createdAt: 'desc' }, take: 10 } },
    })

    // Auto-create trial subscription for companies created before the billing system
    if (!sub) {
      const trialEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      sub = await prisma.yelhaSubscription.create({
        data: {
          companyId,
          planId: 'trial',
          status: 'TRIAL',
          billingCycle: 'MONTHLY',
          trialEndsAt: trialEnd,
          currentPeriodStart: new Date(),
          currentPeriodEnd: trialEnd,
          monthlyAmount: 0,
          limitEmails: 50,
          limitApiReq: 500,
          limitDeliverers: 0,
          limitSkus: 50,
          limitAiReq: 15,
        },
        include: { payments: true },
      })
    }

    // Compute active apps — includes per-app subscriptions (AppSubscription)
    const now = new Date()
    const appSubs = await prisma.appSubscription.findMany({
      where: { companyId },
    })
    const activeAppSubIds = new Set(
      appSubs
        .filter(a =>
          a.status === 'ACTIVE' ||
          (a.status === 'TRIAL' && a.trialEndsAt && a.trialEndsAt > now)
        )
        .map(a => a.appId)
    )

    const allAppIds = Object.keys(APPS) as AppId[]
    const planId = sub.planId as Parameters<typeof isAppIncluded>[0]
    const subTrialActive = sub.status === 'TRIAL' && sub.trialEndsAt && sub.trialEndsAt > now
    const subActive = sub.status === 'ACTIVE'

    const activeApps = allAppIds.filter(appId => {
      if (CORE_APPS.includes(appId)) return true
      if (activeAppSubIds.has(appId)) return true
      if (planId === 'enterprise') return true
      if ((subActive || subTrialActive) && isAppIncluded(planId, appId)) return true
      if ((subActive || subTrialActive) && sub!.extraApps.includes(appId)) return true
      if (subTrialActive && sub!.trialApps.includes(appId)) return true
      return false
    })

    return apiSuccess({ subscription: sub, activeApps })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur'
    if (msg === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500, err)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const rl = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
    if (!rl.success) return rateLimitResponse(rl.reset)

    const { companyId } = await getTenantContext()

    const body = await req.json()
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422, parsed.error.flatten())

    const { addApps = [], removeApps = [] } = parsed.data

    const sub = await prisma.yelhaSubscription.findUnique({ where: { companyId } })
    if (!sub) return apiError('Abonnement introuvable', 404)

    const planId = sub.planId as Parameters<typeof isAppIncluded>[0]

    // Cannot remove core apps or plan-included apps
    const illegalRemovals = removeApps.filter(
      a => CORE_APPS.includes(a) || isAppIncluded(planId, a)
    )
    if (illegalRemovals.length > 0) {
      return apiError(`Impossible de retirer ces apps : ${illegalRemovals.join(', ')}`, 422)
    }

    const currentExtras = new Set<string>(sub.extraApps)
    for (const a of addApps)    currentExtras.add(a)
    for (const a of removeApps) currentExtras.delete(a)

    const updated = await prisma.yelhaSubscription.update({
      where: { companyId },
      data: { extraApps: Array.from(currentExtras) },
    })

    return apiSuccess({ subscription: updated })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur'
    if (msg === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500, err)
  }
}
