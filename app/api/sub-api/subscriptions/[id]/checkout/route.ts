import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withSubApi, ok, apiError } from '@/lib/sub-api/auth'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  successUrl: z.string().url().optional(),
  failureUrl: z.string().url().optional(),
}).optional()

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://subs.yelha.net'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withSubApi(req, async (ctx) => {
    const sub = await prisma.subscription.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
      include: { plan: true, company: { include: { subscriptionSettings: true } } },
    })
    if (!sub) return apiError('Abonnement introuvable', 404, 'NOT_FOUND')

    if (sub.status === 'EXPIRED' || sub.status === 'CANCELLED') {
      return apiError(
        'Impossible de générer un paiement pour un abonnement expiré ou annulé.',
        409,
        'SUBSCRIPTION_NOT_RENEWABLE',
      )
    }

    const settings = sub.company.subscriptionSettings
    if (!settings?.chargilyKey) {
      return apiError(
        'Clé Chargily non configurée. Configurez-la dans Paramètres > Paiement.',
        409, 'CHARGILY_NOT_CONFIGURED'
      )
    }

    let body: unknown = null
    try { body = await req.json() } catch { /* body optionnel */ }
    const parsed = bodySchema.safeParse(body ?? {})
    if (!parsed.success) return apiError('Données invalides', 422, 'VALIDATION_ERROR')

    const successUrl = parsed.data?.successUrl ?? APP_URL
    const failureUrl = parsed.data?.failureUrl ?? APP_URL
    const amount = Number(sub.plan.price)

    try {
      const res = await fetch('https://pay.chargily.net/api/v2/checkouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.chargilyKey}` },
        body: JSON.stringify({
          amount: Math.round(amount),
          currency: 'dzd',
          success_url: successUrl,
          failure_url: failureUrl,
          description: `Renouvellement ${sub.plan.name}`,
          metadata: {
            type: 'sub_renewal',
            subscriptionId: sub.id,
            companyId: ctx.companyId,
          },
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        return apiError(`Erreur Chargily : ${text.slice(0, 200)}`, 502, 'CHARGILY_ERROR')
      }
      const data = await res.json()
      const url = data.checkout_url ?? data.url
      if (!url) return apiError('Réponse Chargily invalide', 502, 'CHARGILY_ERROR')
      return ok({ data: { checkoutUrl: url, amount, currency: 'DZD' } })
    } catch (e) {
      console.error('Chargily checkout error:', e)
      return apiError('Erreur Chargily', 502, 'CHARGILY_ERROR')
    }
  })
}
