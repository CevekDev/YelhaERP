import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withSubApi, ok, apiError } from '@/lib/sub-api/auth'

export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  name:          z.string().min(1).max(200).optional(),
  description:   z.string().max(2000).optional().nullable(),
  price:         z.number().min(0).optional(),
  currency:      z.string().max(10).optional(),
  interval:      z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']).optional(),
  intervalCount: z.number().int().min(1).optional(),
  trialDays:     z.number().int().min(0).optional().nullable(),
  features:      z.array(z.string().max(200)).optional(),
  isActive:      z.boolean().optional(),
})

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return withSubApi(req, async (ctx) => {
    const plan = await prisma.subscriptionPlan.findFirst({
      where: { id: params.id, userId: ctx.userId },
    })
    if (!plan) return apiError('Plan introuvable', 404, 'NOT_FOUND')
    return ok({ data: plan })
  })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return withSubApi(req, async (ctx) => {
    const exists = await prisma.subscriptionPlan.findFirst({
      where: { id: params.id, userId: ctx.userId },
    })
    if (!exists) return apiError('Plan introuvable', 404, 'NOT_FOUND')

    let body: unknown
    try { body = await req.json() } catch { return apiError('Corps invalide', 400, 'BAD_BODY') }
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422, 'VALIDATION_ERROR')

    const plan = await prisma.subscriptionPlan.update({
      where: { id: params.id },
      data: parsed.data,
    })
    return ok({ data: plan })
  })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return withSubApi(req, async (ctx) => {
    const plan = await prisma.subscriptionPlan.findFirst({
      where: { id: params.id, userId: ctx.userId },
    })
    if (!plan) return apiError('Plan introuvable', 404, 'NOT_FOUND')

    const activeCount = await prisma.subscription.count({
      where: { planId: params.id, status: { in: ['ACTIVE', 'TRIAL'] } },
    })
    if (activeCount > 0) {
      return apiError(
        `Ce plan a ${activeCount} abonné(s) actif(s). Désactivez-le plutôt (isActive: false).`,
        409, 'CONFLICT'
      )
    }

    await prisma.subscriptionPlan.delete({ where: { id: params.id } })
    return ok({ data: { deleted: true } })
  })
}
