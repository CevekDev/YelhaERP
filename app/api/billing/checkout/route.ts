import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import {
  PLANS,
  APPS,
  calcMonthlyTotal,
  type AppId,
  type PlanId,
} from '@/lib/pricing/config'

const schema = z.object({
  planId:       z.enum(Object.keys(PLANS) as [PlanId, ...PlanId[]]),
  extraApps:    z.array(z.enum(Object.keys(APPS) as [AppId, ...AppId[]])).default([]),
  billingCycle: z.enum(['MONTHLY', 'ANNUAL']),
  method:       z.enum(['CHARGILY', 'CCP']),
})

export async function POST(req: NextRequest) {
  try {
    const rl = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
    if (!rl.success) return rateLimitResponse(rl.reset)

    const { companyId } = await getTenantContext()

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422, parsed.error.flatten())

    const { planId, extraApps, billingCycle, method } = parsed.data
    const isAnnual = billingCycle === 'ANNUAL'

    const monthlyAmount = calcMonthlyTotal(planId, extraApps, isAnnual)
    const totalDA = isAnnual ? monthlyAmount * 12 : monthlyAmount

    const sub = await prisma.yelhaSubscription.findUnique({ where: { companyId } })
    if (!sub) return apiError('Abonnement introuvable', 404)

    const periodStart = new Date()
    const periodEnd = new Date(periodStart)
    if (isAnnual) {
      periodEnd.setDate(periodEnd.getDate() + 365)
    } else {
      periodEnd.setDate(periodEnd.getDate() + 30)
    }

    if (method === 'CHARGILY') {
      const chargilySecret = process.env.CHARGILY_SECRET_KEY
      if (!chargilySecret) return apiError('Paiement Chargily non configuré', 500)

      const chargilyRes = await fetch('https://pay.chargily.net/api/v2/checkouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${chargilySecret}`,
        },
        body: JSON.stringify({
          amount: totalDA,
          currency: 'dzd',
          success_url: 'https://erp.yelha.net/subscriptions/success',
          failure_url: 'https://erp.yelha.net/subscriptions/checkout',
          locale: 'fr',
          metadata: {
            planId,
            extraApps: extraApps.join(','),
            billingCycle,
            companyId,
          },
        }),
      })

      if (!chargilyRes.ok) {
        const detail = await chargilyRes.text()
        return apiError('Erreur Chargily', 502, detail)
      }

      const chargilyData = await chargilyRes.json()

      await prisma.yelhaPayment.create({
        data: {
          subscriptionId: sub.id,
          amount: totalDA,
          planId,
          extraApps,
          billingCycle: billingCycle === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY',
          method: 'CHARGILY',
          status: 'PENDING',
          chargilyId: chargilyData.id ?? null,
          chargilyLink: chargilyData.checkout_url ?? null,
          periodStart,
          periodEnd,
        },
      })

      return apiSuccess({ url: chargilyData.checkout_url })
    }

    // CCP method
    const payment = await prisma.yelhaPayment.create({
      data: {
        subscriptionId: sub.id,
        amount: totalDA,
        planId,
        extraApps,
        billingCycle: billingCycle === 'ANNUAL' ? 'ANNUAL' : 'MONTHLY',
        method: 'CCP',
        status: 'PENDING',
        periodStart,
        periodEnd,
      },
    })

    const ccpRef = 'YELHA-' + payment.id.slice(0, 8).toUpperCase()

    await prisma.yelhaPayment.update({
      where: { id: payment.id },
      data: { ccpRef },
    })

    return apiSuccess({
      ccpRef,
      amount: totalDA,
      instructions: `Effectuez un virement CCP avec la référence ${ccpRef}. Montant : ${totalDA} DA. Votre abonnement sera activé sous 24h après réception du virement.`,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur'
    if (msg === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500, err)
  }
}
