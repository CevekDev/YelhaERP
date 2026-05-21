import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withSubApi, ok, apiError } from '@/lib/sub-api/auth'
import { sendWelcomeEmail } from '@/lib/subscriptions/send-welcome'
import { canAccessSubs } from '@/lib/billing/check-access'
import { checkSubscriptionLimit } from '@/lib/billing/subscription-limits'

export const dynamic = 'force-dynamic'

const createSchema = z.object({
  planId:      z.string(),
  clientId:    z.string().optional(),
  newClient: z.object({
    name:      z.string().min(1).max(200),
    firstName: z.string().max(100).optional(),
    phone:     z.string().max(30).optional(),
    email:     z.string().email().optional(),
    wilaya:    z.string().max(100).optional(),
    address:   z.string().max(300).optional(),
    clientType: z.enum(['COMPANY', 'INDIVIDUAL']).default('INDIVIDUAL'),
  }).optional(),
  clientEmail: z.string().email().optional(),
  status:      z.enum(['TRIAL', 'ACTIVE', 'PAUSED']).default('ACTIVE'),
  startDate:   z.string().datetime().optional(),
  endDate:     z.string().datetime().optional().nullable(),
  nextBilling: z.string().datetime().optional().nullable(),
  notes:       z.string().max(1000).optional(),
})

const SUB_SELECT = {
  id: true, status: true, startDate: true, endDate: true, nextBilling: true,
  cancelledAt: true, notes: true, clientEmail: true, planId: true, clientId: true,
  createdAt: true, updatedAt: true,
}

export async function GET(req: NextRequest) {
  return withSubApi(req, async (ctx) => {
    if (!await canAccessSubs(ctx.userId)) {
      return apiError('Abonnement app Abonnements requis', 403, 'APP_ACCESS_DENIED')
    }
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '50'))
    const status = searchParams.get('status')
    const clientId = searchParams.get('clientId')
    const planId = searchParams.get('planId')

    const where: Record<string, unknown> = { userId: ctx.userId }
    if (status) where.status = status
    if (clientId) where.clientId = clientId
    if (planId) where.planId = planId

    const [subs, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          ...SUB_SELECT,
          client: { select: { id: true, name: true, firstName: true, email: true } },
          plan:   { select: { id: true, name: true, price: true, interval: true } },
        },
      }),
      prisma.subscription.count({ where }),
    ])
    return ok({ data: subs, meta: { total, page, limit } })
  })
}

export async function POST(req: NextRequest) {
  return withSubApi(req, async (ctx) => {
    if (!await canAccessSubs(ctx.userId)) {
      return apiError('Abonnement app Abonnements requis', 403, 'APP_ACCESS_DENIED')
    }

    const user = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { plan: true } })
    const limitCheck = await checkSubscriptionLimit(ctx.userId, user?.plan ?? 'TRIAL')
    if (!limitCheck.allowed) return apiError(`Limite atteinte : votre plan autorise ${limitCheck.limit} abonnements actifs maximum.`, 403, 'SUBSCRIPTION_LIMIT')

    let body: unknown
    try { body = await req.json() } catch { return apiError('Corps invalide', 400, 'BAD_BODY') }
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422, 'VALIDATION_ERROR')

    const { planId, clientId, newClient, clientEmail, status, startDate, endDate, nextBilling, notes } = parsed.data

    const plan = await prisma.subscriptionPlan.findFirst({
      where: { id: planId, userId: ctx.userId, isActive: true },
    })
    if (!plan) return apiError('Plan introuvable ou inactif', 422, 'PLAN_NOT_FOUND')

    let resolvedClientId: string
    if (clientId) {
      const cl = await prisma.client.findFirst({ where: { id: clientId, userId: ctx.userId } })
      if (!cl) return apiError('Client introuvable', 422, 'CLIENT_NOT_FOUND')
      resolvedClientId = cl.id
    } else if (newClient) {
      const created = await prisma.client.create({ data: { userId: ctx.userId, ...newClient } })
      resolvedClientId = created.id
    } else {
      return apiError('clientId ou newClient requis', 422, 'CLIENT_REQUIRED')
    }

    let computedNextBilling = nextBilling ? new Date(nextBilling) : null
    if (!computedNextBilling) {
      const start = startDate ? new Date(startDate) : new Date()
      if (status === 'TRIAL' && plan.trialDays && plan.trialDays > 0) {
        computedNextBilling = new Date(start)
        computedNextBilling.setDate(start.getDate() + plan.trialDays)
      } else if (status === 'ACTIVE') {
        computedNextBilling = new Date(start)
        const count = plan.intervalCount
        switch (plan.interval) {
          case 'DAILY':     computedNextBilling.setDate(start.getDate() + count); break
          case 'WEEKLY':    computedNextBilling.setDate(start.getDate() + count * 7); break
          case 'MONTHLY':   computedNextBilling.setMonth(start.getMonth() + count); break
          case 'QUARTERLY': computedNextBilling.setMonth(start.getMonth() + count * 3); break
          case 'YEARLY':    computedNextBilling.setFullYear(start.getFullYear() + count); break
        }
      }
    }

    const sub = await prisma.subscription.create({
      data: {
        userId:      ctx.userId,
        clientId:    resolvedClientId,
        planId,
        status,
        startDate:   startDate ? new Date(startDate) : new Date(),
        endDate:     endDate ? new Date(endDate) : null,
        nextBilling: computedNextBilling,
        notes,
        clientEmail: clientEmail || undefined,
      },
      select: {
        ...SUB_SELECT,
        client: { select: { id: true, name: true, firstName: true, email: true } },
        plan:   { select: { id: true, name: true, price: true, interval: true } },
      },
    })
    if (sub.clientEmail) {
      await sendWelcomeEmail(sub.id)
    }

    return ok({ data: sub }, 201)
  })
}
