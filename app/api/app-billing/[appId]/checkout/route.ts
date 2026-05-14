import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { getAppPlanConfig, getAppPlan } from '@/lib/pricing/app-plans'

const APP_PLANS_CONFIG_PREFIX = 'app_pricing_'

const CHARGILY_BASE = process.env.CHARGILY_MODE === 'live'
  ? 'https://pay.chargily.net/api/v2'
  : 'https://pay.chargily.net/test/api/v2'

const checkoutSchema = z.object({
  planId: z.string(),
  method: z.enum(['CCP', 'TRIAL', 'CHARGILY']),
})

export async function POST(req: NextRequest, { params }: { params: { appId: string } }) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const { companyId } = await getTenantContext()
    const { appId } = params

    const config = getAppPlanConfig(appId)
    if (!config) return apiError('App introuvable', 404)

    let body: unknown
    try { body = await req.json() } catch { return apiError('Corps invalide', 400) }
    const parsed = checkoutSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422)

    const { planId, method } = parsed.data
    const plan = getAppPlan(appId, planId)
    if (!plan) return apiError('Plan introuvable', 404)

    if (method === 'TRIAL' && planId !== 'trial') return apiError('La méthode TRIAL est réservée au plan gratuit', 422)
    if (method === 'CHARGILY' && planId === 'trial') return apiError('Chargily n\'est pas disponible pour l\'essai gratuit', 422)

    // Récupère le prix avec éventuelles surcharges admin
    const dbConfig = await prisma.systemConfig.findUnique({
      where: { key: `${APP_PLANS_CONFIG_PREFIX}${appId}` },
    })
    const overrides = (dbConfig?.value as Record<string, number> | null) ?? {}
    const effectivePrice = overrides[planId] ?? plan.price

    const now = new Date()
    let trialEndsAt: Date | undefined
    let periodEnd: Date

    if (planId === 'trial') {
      trialEndsAt = new Date(now)
      trialEndsAt.setDate(trialEndsAt.getDate() + 15)
      periodEnd = trialEndsAt
    } else {
      periodEnd = new Date(now)
      periodEnd.setMonth(periodEnd.getMonth() + 1)
    }

    const existing = await prisma.appSubscription.findUnique({
      where: { companyId_appId: { companyId, appId } },
    })

    if (existing?.status === 'ACTIVE') return apiError('Vous avez déjà un abonnement actif pour cette app', 409)
    if (existing?.status === 'TRIAL' && planId === 'trial') return apiError('Essai déjà en cours', 409)

    // ── TRIAL ──────────────────────────────────────────────────────────────────
    if (method === 'TRIAL') {
      const sub = existing
        ? await prisma.appSubscription.update({
            where: { id: existing.id },
            data: { planId: 'trial', status: 'TRIAL', trialEndsAt, currentPeriodStart: now, currentPeriodEnd: periodEnd, monthlyAmount: 0 },
          })
        : await prisma.appSubscription.create({
            data: { companyId, appId, planId: 'trial', status: 'TRIAL', trialEndsAt, currentPeriodStart: now, currentPeriodEnd: periodEnd, monthlyAmount: 0 },
          })
      return apiSuccess({ type: 'trial', subscription: sub })
    }

    // Crée ou met à jour l'AppSubscription + AppPayment
    const existingStatus = existing?.status ?? 'TRIAL'
    const existingTrialEndsAt = existing?.trialEndsAt ?? null
    const existingPeriodStart = existing?.currentPeriodStart ?? now
    const existingPeriodEnd = existing?.currentPeriodEnd ?? periodEnd

    const subRecord = existing
      ? await prisma.appSubscription.update({
          where: { id: existing.id },
          data: { planId, monthlyAmount: effectivePrice },
        })
      : await prisma.appSubscription.create({
          data: {
            companyId, appId, planId,
            status: existingStatus,
            trialEndsAt: existingTrialEndsAt,
            currentPeriodStart: existingPeriodStart,
            currentPeriodEnd: existingPeriodEnd,
            monthlyAmount: effectivePrice,
          },
        })

    const payment = await prisma.appPayment.create({
      data: {
        appSubscriptionId: subRecord.id,
        appId,
        planId,
        amount: effectivePrice,
        method,
        status: 'PENDING',
        periodStart: now,
        periodEnd,
      },
    })

    // ── CHARGILY ───────────────────────────────────────────────────────────────
    if (method === 'CHARGILY') {
      const chargilySecret = process.env.CHARGILY_SECRET_KEY
      if (!chargilySecret) return apiError('Paiement Chargily non configuré', 500)

      const appUrl = process.env.NEXTAUTH_URL ?? 'https://yelhaerp.com'

      const chargilyRes = await fetch(`${CHARGILY_BASE}/checkouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${chargilySecret}` },
        body: JSON.stringify({
          amount: effectivePrice,
          currency: 'dzd',
          success_url: `${appUrl}/subscriptions/success?method=chargily&app=${appId}&plan=${planId}`,
          failure_url: `${appUrl}/subscriptions/checkout?app=${appId}`,
          webhook_url: `${appUrl}/api/webhooks/chargily-app`,
          metadata: { appPaymentId: payment.id, appId, planId, companyId },
        }),
      })

      if (!chargilyRes.ok) {
        await prisma.appPayment.delete({ where: { id: payment.id } })
        return apiError('Erreur Chargily — réessayez', 502)
      }

      const chargilyData = await chargilyRes.json()
      const ccpRef = `APP-${payment.id.slice(0, 8).toUpperCase()}`

      await prisma.appPayment.update({
        where: { id: payment.id },
        data: { chargilyId: chargilyData.id, chargilyLink: chargilyData.checkout_url, ccpRef },
      })

      return apiSuccess({ type: 'chargily', url: chargilyData.checkout_url })
    }

    // ── CCP ────────────────────────────────────────────────────────────────────
    const ccpRef = `APP-${payment.id.slice(0, 8).toUpperCase()}`
    await prisma.appPayment.update({ where: { id: payment.id }, data: { ccpRef } })

    return apiSuccess({ type: 'ccp', ccpRef, amount: effectivePrice, planId, paymentId: payment.id })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500)
  }
}
