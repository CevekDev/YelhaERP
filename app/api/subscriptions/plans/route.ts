import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getTenantContext } from '@/lib/security/tenant'
import { apiSuccess, apiError } from '@/lib/security/api-response'

const planSchema = z.object({
  name:          z.string().min(1).max(100),
  description:   z.string().max(500).optional(),
  price:         z.number().min(0),
  currency:      z.string().default('DZD'),
  interval:      z.enum(['WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']).default('MONTHLY'),
  intervalCount: z.number().int().min(1).default(1),
  trialDays:     z.number().int().min(0).optional().nullable(),
  features:      z.array(z.string().max(200)).max(20).default([]),
  isActive:      z.boolean().default(true),
})

export async function GET() {
  const ctx = await getTenantContext()
  if (!ctx) return apiError('Non autorisé', 401)

  const plans = await prisma.subscriptionPlan.findMany({
    where: { userId: ctx.userId },
    orderBy: { price: 'asc' },
    include: {
      _count: { select: { subscriptions: true } },
    },
  })
  return apiSuccess(plans)
}

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx) return apiError('Non autorisé', 401)

  let body: unknown
  try { body = await req.json() } catch { return apiError('Corps invalide', 400) }
  const parsed = planSchema.safeParse(body)
  if (!parsed.success) return apiError('Données invalides', 400)

  const plan = await prisma.subscriptionPlan.create({
    data: { userId: ctx.userId, ...parsed.data },
  })
  return apiSuccess(plan, 201)
}
