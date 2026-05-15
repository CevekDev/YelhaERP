import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withSubApi, ok, apiError } from '@/lib/sub-api/auth'

export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  status:      z.enum(['TRIAL', 'ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED']).optional(),
  planId:      z.string().optional(),
  endDate:     z.string().datetime().optional().nullable(),
  nextBilling: z.string().datetime().optional().nullable(),
  notes:       z.string().max(1000).optional(),
  clientEmail: z.string().email().optional().nullable(),
})

const SUB_INCLUDE = {
  client: { select: { id: true, name: true, firstName: true, email: true } },
  plan:   { select: { id: true, name: true, price: true, interval: true } },
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return withSubApi(req, async (ctx) => {
    const sub = await prisma.subscription.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
      include: SUB_INCLUDE,
    })
    if (!sub) return apiError('Abonnement introuvable', 404, 'NOT_FOUND')
    return ok({ data: sub })
  })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return withSubApi(req, async (ctx) => {
    const sub = await prisma.subscription.findFirst({ where: { id: params.id, companyId: ctx.companyId } })
    if (!sub) return apiError('Abonnement introuvable', 404, 'NOT_FOUND')

    let body: unknown
    try { body = await req.json() } catch { return apiError('Corps invalide', 400, 'BAD_BODY') }
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422, 'VALIDATION_ERROR')

    if (parsed.data.planId) {
      const plan = await prisma.subscriptionPlan.findFirst({
        where: { id: parsed.data.planId, companyId: ctx.companyId },
      })
      if (!plan) return apiError('Plan introuvable', 422, 'PLAN_NOT_FOUND')
    }

    const updateData: Record<string, unknown> = { ...parsed.data }
    if (parsed.data.status === 'CANCELLED') updateData.cancelledAt = new Date()
    if (parsed.data.endDate) updateData.endDate = new Date(parsed.data.endDate)
    if (parsed.data.nextBilling) updateData.nextBilling = new Date(parsed.data.nextBilling)

    const updated = await prisma.subscription.update({
      where: { id: params.id },
      data: updateData,
      include: SUB_INCLUDE,
    })
    return ok({ data: updated })
  })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return withSubApi(req, async (ctx) => {
    const sub = await prisma.subscription.findFirst({ where: { id: params.id, companyId: ctx.companyId } })
    if (!sub) return apiError('Abonnement introuvable', 404, 'NOT_FOUND')

    const cancelled = await prisma.subscription.update({
      where: { id: params.id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
      include: SUB_INCLUDE,
    })
    return ok({ data: cancelled })
  })
}
