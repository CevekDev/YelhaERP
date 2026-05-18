import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { APP_PLANS } from '@/lib/pricing/app-plans'

const schema = z.object({ action: z.enum(['promote', 'demote']) })

// Date très lointaine pour les partenaires
const PARTNER_PERIOD_END = new Date('2099-12-31T23:59:59Z')

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    await requireSuperAdmin()

    let body: unknown
    try { body = await req.json() } catch { return apiError('Corps invalide', 400) }
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422)

    const { action } = parsed.data
    const company = await prisma.company.findUnique({ where: { id: params.id } })
    if (!company) return apiError('Entreprise introuvable', 404)

    const now = new Date()

    if (action === 'promote') {
      // Active tous les apps disponibles en partenaire (plan le plus élevé, gratuit, sans fin)
      await prisma.company.update({
        where: { id: params.id },
        data: { isPartner: true, partnerSince: now },
      })

      for (const [appId, config] of Object.entries(APP_PLANS)) {
        // Choisir le plan payant le plus cher
        const paidPlans = Object.values(config.plans).filter(p => p.id !== 'trial' && p.price > 0)
        const bestPlan = paidPlans.sort((a, b) => b.price - a.price)[0]
        if (!bestPlan) continue

        const existing = await prisma.appSubscription.findUnique({
          where: { companyId_appId: { companyId: params.id, appId } },
        })

        const subData = {
          planId: bestPlan.id,
          status: 'ACTIVE' as const,
          currentPeriodStart: now,
          currentPeriodEnd: PARTNER_PERIOD_END,
          monthlyAmount: 0,
          lastPaymentAt: now,
          lastPaymentRef: 'PARTNER-GRANT',
        }

        const sub = existing
          ? await prisma.appSubscription.update({ where: { id: existing.id }, data: subData })
          : await prisma.appSubscription.create({ data: { companyId: params.id, appId, ...subData } })

        await prisma.appPayment.create({
          data: {
            appSubscriptionId: sub.id,
            appId, planId: bestPlan.id,
            amount: 0,
            method: 'PARTNER_GRANT',
            status: 'PAID',
            paidAt: now,
            periodStart: now,
            periodEnd: PARTNER_PERIOD_END,
          },
        })
      }
    } else {
      // Retirer le statut partenaire et annuler tous les abonnements
      await prisma.company.update({
        where: { id: params.id },
        data: { isPartner: false, partnerSince: null },
      })

      await prisma.appSubscription.updateMany({
        where: { companyId: params.id, status: 'ACTIVE' },
        data: { status: 'CANCELLED' },
      })
    }

    return apiSuccess({ isPartner: action === 'promote' })
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
