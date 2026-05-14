import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { getAppPlan, getAppPlanConfig } from '@/lib/pricing/app-plans'
import { sendAppPaymentConfirmation, sendAppGiftSubscription } from '@/lib/email/resend'

const APP_PLANS_CONFIG_PREFIX = 'app_pricing_'

const grantSchema = z.union([
  z.object({
    type: z.literal('confirm_payment'),
    paymentId: z.string(),
  }),
  z.object({
    type: z.enum(['free', 'activate', 'gift']),
    companyId: z.string().cuid(),
    appId: z.string(),
    planId: z.string(),
    months: z.number().int().min(1).max(24).default(1),
  }),
])

export async function POST(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    await requireSuperAdmin()

    let body: unknown
    try { body = await req.json() } catch { return apiError('Corps invalide', 400) }
    const parsed = grantSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422)

    const now = new Date()

    if (parsed.data.type === 'confirm_payment') {
      const payment = await prisma.appPayment.findUnique({
        where: { id: parsed.data.paymentId },
        include: {
          appSubscription: {
            include: { company: { include: { users: { orderBy: { createdAt: 'asc' }, take: 1 } } } },
          },
        },
      })
      if (!payment) return apiError('Paiement introuvable', 404)
      if (payment.status !== 'PENDING') return apiError('Ce paiement n\'est pas en attente', 409)

      await prisma.$transaction([
        prisma.appPayment.update({
          where: { id: payment.id },
          data: { status: 'PAID', paidAt: now },
        }),
        prisma.appSubscription.update({
          where: { id: payment.appSubscriptionId },
          data: {
            status: 'ACTIVE',
            planId: payment.planId,
            currentPeriodStart: payment.periodStart,
            currentPeriodEnd: payment.periodEnd,
            monthlyAmount: payment.amount,
            lastPaymentAt: now,
            lastPaymentRef: payment.ccpRef ?? payment.id,
          },
        }),
      ])

      const owner = payment.appSubscription.company.users[0]
      if (owner) {
        const appConfig = getAppPlanConfig(payment.appId)
        await sendAppPaymentConfirmation({
          to: owner.email,
          name: owner.name,
          appName: appConfig?.appName ?? payment.appId,
          planName: payment.planId,
          amount: payment.amount,
          periodStart: payment.periodStart,
          periodEnd: payment.periodEnd,
        }).catch(() => {})
      }

      return apiSuccess({ confirmed: true })
    }

    const { type, companyId, appId, planId, months } = parsed.data

    const plan = getAppPlan(appId, planId)
    if (!plan) return apiError('Plan introuvable', 404)

    const dbConfig = await prisma.systemConfig.findUnique({
      where: { key: `${APP_PLANS_CONFIG_PREFIX}${appId}` },
    })
    const overrides = (dbConfig?.value as Record<string, number> | null) ?? {}
    const effectivePrice = (type === 'free' || type === 'gift') ? 0 : (overrides[planId] ?? plan.price)

    const periodEnd = new Date(now)
    periodEnd.setDate(periodEnd.getDate() + months * 30)

    const existing = await prisma.appSubscription.findUnique({
      where: { companyId_appId: { companyId, appId } },
    })

    const subRecord = existing
      ? await prisma.appSubscription.update({
          where: { id: existing.id },
          data: {
            planId, status: 'ACTIVE',
            trialEndsAt: null,
            currentPeriodStart: now, currentPeriodEnd: periodEnd,
            monthlyAmount: effectivePrice,
            lastPaymentAt: now,
            lastPaymentRef: `ADMIN-GRANT-${Date.now()}`,
          },
        })
      : await prisma.appSubscription.create({
          data: {
            companyId, appId, planId, status: 'ACTIVE',
            trialEndsAt: null,
            currentPeriodStart: now, currentPeriodEnd: periodEnd,
            monthlyAmount: effectivePrice,
            lastPaymentAt: now,
            lastPaymentRef: `ADMIN-GRANT-${Date.now()}`,
          },
        })

    const paymentMethod = type === 'gift' ? 'ADMIN_GIFT' : type === 'free' ? 'ADMIN_FREE' : 'ADMIN_ACTIVATE'

    await prisma.appPayment.create({
      data: {
        appSubscriptionId: subRecord.id,
        appId, planId,
        amount: effectivePrice,
        method: paymentMethod,
        status: 'PAID',
        paidAt: now,
        periodStart: now,
        periodEnd,
      },
    })

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { users: { orderBy: { createdAt: 'asc' }, take: 1 } },
    })
    const owner = company?.users[0]
    if (owner) {
      const appConfig = getAppPlanConfig(appId)
      if (type === 'gift') {
        await sendAppGiftSubscription({
          to: owner.email,
          name: owner.name,
          appName: appConfig?.appName ?? appId,
          planName: plan.name,
          periodStart: now,
          periodEnd,
          months,
        }).catch(() => {})
      } else if (type === 'activate') {
        await sendAppPaymentConfirmation({
          to: owner.email,
          name: owner.name,
          appName: appConfig?.appName ?? appId,
          planName: plan.name,
          amount: effectivePrice,
          periodStart: now,
          periodEnd,
        }).catch(() => {})
      }
    }

    return apiSuccess({ granted: true, type, appId, planId, periodEnd })
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
