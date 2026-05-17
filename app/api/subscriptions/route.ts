import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getTenantContext } from '@/lib/security/tenant'
import { apiSuccess, apiError, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { hasRole } from '@/lib/security/tenant'
import { sendWelcomeEmail } from '@/lib/subscriptions/send-welcome'

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
  status:      z.enum(['PENDING', 'TRIAL', 'ACTIVE', 'PAUSED']).default('PENDING'),
  startDate:   z.string().datetime().optional(),
  endDate:     z.string().datetime().optional().nullable(),
  nextBilling: z.string().datetime().optional().nullable(),
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

    const where: Record<string, unknown> = { companyId: ctx.companyId }
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

    let body: unknown
    try { body = await req.json() } catch { return apiError('Corps invalide', 400) }
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 400)

    const { planId, clientId, newClient, status, startDate, endDate, nextBilling, notes, clientEmail } = parsed.data

    const plan = await prisma.subscriptionPlan.findFirst({
      where: { id: planId, companyId: ctx.companyId, isActive: true },
    })
    if (!plan) return apiError('Plan introuvable ou inactif', 422)

    let resolvedClientId: string
    if (clientId) {
      const cl = await prisma.client.findFirst({ where: { id: clientId, companyId: ctx.companyId } })
      if (!cl) return apiError('Client introuvable', 422)
      resolvedClientId = cl.id
    } else if (newClient) {
      const created = await prisma.client.create({
        data: { companyId: ctx.companyId, ...newClient },
      })
      resolvedClientId = created.id
    } else {
      return apiError('Veuillez sélectionner ou créer un client', 422)
    }

    // Compute nextBilling (only for non-PENDING statuses)
    let computedNextBilling = nextBilling ? new Date(nextBilling) : null
    if (!computedNextBilling && status !== 'PENDING') {
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

    const subscription = await prisma.subscription.create({
      data: {
        companyId:   ctx.companyId,
        clientId:    resolvedClientId,
        planId,
        status,
        startDate:   startDate ? new Date(startDate) : new Date(),
        endDate:     endDate ? new Date(endDate) : null,
        nextBilling: computedNextBilling,
        notes,
        clientEmail: clientEmail || undefined,
      },
      include: {
        client: { select: { id: true, name: true, firstName: true, phone: true, email: true } },
        plan:   { select: { id: true, name: true, price: true, currency: true, interval: true, intervalCount: true, trialDays: true } },
      },
    })

    // Always try to send start email (fire-and-forget — skips if no email configured)
    sendWelcomeEmail(subscription.id).catch(console.error)

    return apiSuccess(subscription, 201)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    if (e instanceof Error && e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    return apiError('Erreur serveur', 500)
  }
}
