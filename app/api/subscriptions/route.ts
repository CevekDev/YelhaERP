import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getTenantContext } from '@/lib/security/tenant'
import { apiSuccess, apiError } from '@/lib/security/api-response'

const createSchema = z.object({
  planId:      z.string(),
  clientId:    z.string().optional(),
  // If no clientId → create client inline
  newClient: z.object({
    name:      z.string().min(1).max(200),
    firstName: z.string().max(100).optional(),
    phone:     z.string().max(30).optional(),
    email:     z.string().email().optional(),
    wilaya:    z.string().max(100).optional(),
    address:   z.string().max(300).optional(),
    clientType: z.enum(['COMPANY', 'INDIVIDUAL']).default('INDIVIDUAL'),
  }).optional(),
  status:      z.enum(['TRIAL', 'ACTIVE', 'PAUSED']).default('ACTIVE'),
  startDate:   z.string().datetime().optional(),
  endDate:     z.string().datetime().optional().nullable(),
  nextBilling: z.string().datetime().optional().nullable(),
  notes:       z.string().max(1000).optional(),
  // Notifications de renouvellement
  clientEmail:   z.string().email().optional(),
  whatsapp:      z.string().max(30).optional(),
  ccpNumber:     z.string().max(50).optional(),
  chargilyKey:   z.string().max(200).optional(),
  emailLanguage: z.enum(['fr', 'en', 'ar']).default('fr'),
  emailMessage:  z.string().max(2000).optional(),
})

export async function GET(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx) return apiError('Non autorisé', 401)

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
        plan:   { select: { id: true, name: true, price: true, currency: true, interval: true, intervalCount: true } },
      },
    }),
    prisma.subscription.count({ where }),
  ])

  return apiSuccess({ subscriptions, total, page, limit })
}

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx) return apiError('Non autorisé', 401)

  let body: unknown
  try { body = await req.json() } catch { return apiError('Corps invalide', 400) }
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return apiError('Données invalides', 400)

  const { planId, clientId, newClient, status, startDate, endDate, nextBilling, notes,
          clientEmail, whatsapp, ccpNumber, chargilyKey, emailLanguage, emailMessage } = parsed.data

  // Validate plan
  const plan = await prisma.subscriptionPlan.findFirst({
    where: { id: planId, companyId: ctx.companyId, isActive: true },
  })
  if (!plan) return apiError('Plan introuvable ou inactif', 422)

  // Resolve client
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

  // Compute nextBilling if not provided
  let computedNextBilling = nextBilling ? new Date(nextBilling) : null
  if (!computedNextBilling && status === 'ACTIVE') {
    const start = startDate ? new Date(startDate) : new Date()
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

  const subscription = await prisma.subscription.create({
    data: {
      companyId:    ctx.companyId,
      clientId:     resolvedClientId,
      planId,
      status,
      startDate:    startDate ? new Date(startDate) : new Date(),
      endDate:      endDate ? new Date(endDate) : null,
      nextBilling:  computedNextBilling,
      notes,
      clientEmail:  clientEmail || undefined,
      whatsapp:     whatsapp || undefined,
      ccpNumber:    ccpNumber || undefined,
      chargilyKey:  chargilyKey || undefined,
      emailLanguage,
      emailMessage: emailMessage || undefined,
    },
    include: {
      client: { select: { id: true, name: true, firstName: true, phone: true } },
      plan:   { select: { id: true, name: true, price: true, currency: true, interval: true } },
    },
  })

  return apiSuccess(subscription, 201)
}
