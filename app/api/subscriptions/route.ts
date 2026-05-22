import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getTenantContext } from '@/lib/security/tenant'
import { apiSuccess, apiError, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { hasRole } from '@/lib/security/tenant'
import { sendWelcomeEmail } from '@/lib/subscriptions/send-welcome'
import { checkSubscriptionLimit } from '@/lib/billing/subscription-limits'

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
  notes:       z.string().max(1000).optional(),
  clientEmail: z.string().email().optional(),
})

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()

    const { searchParams } = new URL(req.url)
    const status  = searchParams.get('status')
    const page    = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit   = 20
    const skip    = (page - 1) * limit

    const where: Record<string, unknown> = { userId: ctx.userId }
    if (status && status !== 'ALL') where.status = status

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, name: true, firstName: true, phone: true, email: true } },
          plan:   { select: { id: true, name: true, price: true, currency: true, interval: true, intervalCount: true, trialDays: true } },
        },
      }),
      prisma.subscription.count({ where }),
    ])

    return apiSuccess({ subscriptions, total, page, limit })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    if (e instanceof Error && e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    return apiError('Erreur serveur', 500)
  }
}

export async function POST(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()

    // Seuls OWNER et ADMIN peuvent créer des abonnements
    if (!hasRole(ctx.role, 'ADMIN')) return apiError('Permissions insuffisantes', 403)

    const limitCheck = await checkSubscriptionLimit(ctx.userId, ctx.plan)
    if (!limitCheck.allowed) return apiError(`Limite atteinte : votre plan autorise ${limitCheck.limit} abonnements actifs maximum.`, 403)

    let body: unknown
    try { body = await req.json() } catch { return apiError('Corps invalide', 400) }
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 400)

    const { planId, clientId, newClient, notes, clientEmail } = parsed.data

    const plan = await prisma.subscriptionPlan.findFirst({
      where: { id: planId, userId: ctx.userId, isActive: true },
    })
    if (!plan) return apiError('Plan introuvable ou inactif', 422)

    let resolvedClientId: string
    if (clientId) {
      const cl = await prisma.client.findFirst({ where: { id: clientId, userId: ctx.userId } })
      if (!cl) return apiError('Client introuvable', 422)
      resolvedClientId = cl.id
    } else if (newClient) {
      const created = await prisma.client.create({
        data: { userId: ctx.userId, ...newClient },
      })
      resolvedClientId = created.id
    } else {
      return apiError('Veuillez sélectionner ou créer un client', 422)
    }

    // Status and nextBilling are auto-computed from the plan
    const status = (plan.trialDays && plan.trialDays > 0) ? 'TRIAL' : 'PENDING'
    const start = new Date()
    let computedNextBilling: Date | null = null
    if (status === 'TRIAL') {
      computedNextBilling = new Date(start)
      computedNextBilling.setDate(start.getDate() + plan.trialDays!)
    }

    const subscription = await prisma.subscription.create({
      data: {
        userId:      ctx.userId,
        clientId:    resolvedClientId,
        planId,
        status,
        startDate:   start,
        endDate:     null,
        nextBilling: computedNextBilling,
        notes,
        clientEmail: clientEmail || undefined,
      },
      include: {
        client: { select: { id: true, name: true, firstName: true, phone: true, email: true } },
        plan:   { select: { id: true, name: true, price: true, currency: true, interval: true, intervalCount: true, trialDays: true } },
      },
    })

    // Send start/payment email (awaited so Vercel doesn't kill it before it completes)
    try { await sendWelcomeEmail(subscription.id) } catch (e) { console.error('[welcome]', e) }

    return apiSuccess(subscription, 201)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    if (e instanceof Error && e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    return apiError('Erreur serveur', 500)
  }
}
