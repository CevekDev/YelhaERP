import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withSubApi, ok, apiError } from '@/lib/sub-api/auth'

export const dynamic = 'force-dynamic'

const createSchema = z.object({
  name:          z.string().min(1).max(200),
  description:   z.string().max(2000).optional(),
  price:         z.number().min(0),
  currency:      z.string().max(10).default('DZD'),
  interval:      z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']).default('MONTHLY'),
  intervalCount: z.number().int().min(1).default(1),
  trialDays:     z.number().int().min(0).optional(),
  features:      z.array(z.string().max(200)).default([]),
  isActive:      z.boolean().default(true),
})

export async function GET(req: NextRequest) {
  return withSubApi(req, async (ctx) => {
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '50'))
    const skip = (page - 1) * limit

    const [plans, total] = await Promise.all([
      prisma.subscriptionPlan.findMany({
        where: { userId: ctx.userId },
        orderBy: { price: 'asc' },
        skip, take: limit,
      }),
      prisma.subscriptionPlan.count({ where: { userId: ctx.userId } }),
    ])
    return ok({ data: plans, meta: { total, page, limit } })
  })
}

export async function POST(req: NextRequest) {
  return withSubApi(req, async (ctx) => {
    let body: unknown
    try { body = await req.json() } catch { return apiError('Corps invalide', 400, 'BAD_BODY') }
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422, 'VALIDATION_ERROR')

    const plan = await prisma.subscriptionPlan.create({
      data: { userId: ctx.userId, ...parsed.data },
    })
    return ok({ data: plan }, 201)
  })
}
