import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { PLANS } from '@/lib/pricing/config'
import type { PlanId } from '@/lib/pricing/config'

const grantSchema = z.union([
  z.object({
    type: z.literal('confirm_ccp'),
    paymentId: z.string(),
    companyId: z.string().optional(),
    planId: z.string().optional(),
    months: z.number().optional(),
  }),
  z.object({
    type: z.enum(['free', 'activate']),
    companyId: z.string().cuid(),
    planId: z.string().optional(),
    months: z.number().int().min(1).max(24).optional().default(1),
    paymentId: z.string().optional(),
  }),
])

function getPlanLimits(planId: string) {
  const plan = PLANS[planId as PlanId]
  if (!plan || !('limits' in plan)) return null
  return plan.limits
}

export async function POST(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'OWNER')

    let body: unknown
    try { body = await req.json() } catch { return apiError('Corps invalide', 400) }
    const parsed = grantSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422)

    const { type } = parsed.data
    const companyId = 'companyId' in parsed.data ? parsed.data.companyId : undefined
    const planId = parsed.data.planId
    const months = 'months' in parsed.data ? (parsed.data.months ?? 1) : 1
    const paymentId = parsed.data.paymentId

    if (type === 'confirm_ccp') {
      if (!paymentId) return apiError('paymentId requis', 422)

      const payment = await prisma.yelhaPayment.findUnique({
        where: { id: paymentId },
        include: { subscription: true },
      })
      if (!payment) return apiError('Paiement introuvable', 404)
      if (payment.status !== 'PENDING') return apiError('Ce paiement n\'est pas en attente', 409)

      const now = new Date()
      await prisma.$transaction([
        prisma.yelhaPayment.update({
          where: { id: paymentId },
          data: { status: 'PAID', paidAt: now },
        }),
        prisma.yelhaSubscription.update({
          where: { id: payment.subscriptionId },
          data: {
            status: 'ACTIVE',
            planId: payment.planId,
            currentPeriodStart: payment.periodStart,
            currentPeriodEnd: payment.periodEnd,
            lastPaymentAt: now,
            lastPaymentRef: payment.ccpRef ?? payment.id,
            monthlyAmount: payment.amount,
          },
        }),
      ])
      return apiSuccess({ confirmed: true })
    }

    // free or activate
    if (!companyId) return apiError('companyId requis', 422)
    const sub = await prisma.yelhaSubscription.findUnique({ where: { companyId } })
    if (!sub) return apiError('Abonnement introuvable', 404)

    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setDate(periodEnd.getDate() + months * 30)

    const effectivePlanId = planId ?? sub.planId
    const limits = getPlanLimits(effectivePlanId)

    const updateData: Record<string, unknown> = {
      status: 'ACTIVE',
      planId: effectivePlanId,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      lastPaymentAt: now,
      lastPaymentRef: `ADMIN-GRANT-${Date.now()}`,
    }
    if (type === 'free') updateData.monthlyAmount = 0
    if (limits) {
      updateData.limitEmails = limits.emails
      updateData.limitApiReq = limits.apiRequests
      updateData.limitDeliverers = limits.deliverers
      updateData.limitSkus = limits.skus
      updateData.limitAiReq = limits.aiRequests
    }

    const planEnum = effectivePlanId.toUpperCase() as 'TRIAL' | 'STARTER' | 'PRO' | 'AGENCY' | 'BUSINESS' | 'ENTERPRISE'
    const validPlans = ['TRIAL', 'STARTER', 'PRO', 'AGENCY', 'BUSINESS', 'ENTERPRISE']

    await prisma.$transaction([
      prisma.yelhaSubscription.update({ where: { companyId }, data: updateData }),
      ...(validPlans.includes(planEnum)
        ? [prisma.company.update({ where: { id: companyId }, data: { plan: planEnum } })]
        : []),
      prisma.yelhaPayment.create({
        data: {
          subscriptionId: sub.id,
          amount: type === 'free' ? 0 : (sub.monthlyAmount ?? 0),
          planId: effectivePlanId,
          extraApps: sub.extraApps,
          billingCycle: 'MONTHLY',
          method: type === 'free' ? 'ADMIN_FREE' : 'ADMIN_ACTIVATE',
          status: 'PAID',
          paidAt: now,
          periodStart: now,
          periodEnd,
        },
      }),
    ])

    return apiSuccess({ granted: true, type, planId: effectivePlanId, periodEnd })
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
