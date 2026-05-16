import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { getAppPlanConfig, getAppPlan } from '@/lib/pricing/app-plans'
import { sendAppTrialWelcome } from '@/lib/email/resend'

const APP_PLANS_CONFIG_PREFIX = 'app_pricing_'

const CHARGILY_BASE = 'https://pay.chargily.net/api/v2'

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

    // Bloquer l'essai si un abonnement existe déjà (peu importe le statut)
    if (existing && planId === 'trial') return apiError('Essai déjà utilisé pour cette application', 409)

    // Bloquer un doublon de paiement pour le même plan actif (pas encore expiré)
    if (existing?.status === 'ACTIVE' && existing.planId === planId) {
      return apiError('Cet abonnement est déjà actif. Attendez l\'expiration pour renouveler.', 409)
    }

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

      // Email bienvenue essai
      prisma.company.findUnique({
        where: { id: companyId },
        include: { users: { where: { role: 'OWNER' }, take: 1 } },
      }).then(company => {
        const owner = company?.users[0]
        if (owner && trialEndsAt) {
          sendAppTrialWelcome({
            to: owner.email,
            name: owner.name,
            appName: config.appName,
            trialEndsAt,
            appId,
          })
        }
      }).catch(() => {})

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

      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://erp.yelha.net'

      const chargilyRes = await fetch(`${CHARGILY_BASE}/checkouts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${chargilySecret}` },
        body: JSON.stringify({
          amount: effectivePrice,
          currency: 'dzd',
          locale: 'fr',
          success_url: `${appUrl}/subscriptions/success?method=chargily&app=${appId}&plan=${planId}`,
          failure_url: `${appUrl}/subscriptions/checkout?app=${appId}`,
          metadata: { appPaymentId: payment.id, appId, planId, companyId },
        }),
      })

      if (!chargilyRes.ok) {
        const detail = await chargilyRes.text()
        await prisma.appPayment.delete({ where: { id: payment.id } })
        return apiError(`Chargily: ${detail}`, 400)
      }

      const chargilyData = await chargilyRes.json()
      const checkoutUrl: string = chargilyData.checkout_url ?? chargilyData.url ?? chargilyData.payment_url ?? ''
      const ccpRef = `APP-${payment.id.slice(0, 8).toUpperCase()}`

      await prisma.appPayment.update({
        where: { id: payment.id },
        data: { chargilyId: chargilyData.id, chargilyLink: checkoutUrl || null, ccpRef },
      })

      if (!checkoutUrl) {
        return apiError(`URL Chargily introuvable. Clés réponse: ${Object.keys(chargilyData).join(', ')}`, 500)
      }

      return apiSuccess({ type: 'chargily', url: checkoutUrl })
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
