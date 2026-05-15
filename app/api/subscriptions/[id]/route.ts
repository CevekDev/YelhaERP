import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getTenantContext } from '@/lib/security/tenant'
import { apiSuccess, apiError } from '@/lib/security/api-response'

const patchSchema = z.object({
  status:      z.enum(['TRIAL', 'ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED']).optional(),
  planId:      z.string().optional(),
  endDate:     z.string().datetime().optional().nullable(),
  nextBilling: z.string().datetime().optional().nullable(),
  notes:       z.string().max(1000).optional(),
  clientEmail: z.string().email().optional().nullable(),
})

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getTenantContext()
  if (!ctx) return apiError('Non autorisé', 401)

  const sub = await prisma.subscription.findFirst({
    where: { id: params.id, companyId: ctx.companyId },
    include: {
      client: true,
      plan:   true,
    },
  })
  if (!sub) return apiError('Abonnement introuvable', 404)
  return apiSuccess(sub)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getTenantContext()
  if (!ctx) return apiError('Non autorisé', 401)

  const sub = await prisma.subscription.findFirst({
    where: { id: params.id, companyId: ctx.companyId },
  })
  if (!sub) return apiError('Abonnement introuvable', 404)

  let body: unknown
  try { body = await req.json() } catch { return apiError('Corps invalide', 400) }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return apiError('Données invalides', 400)

  if (parsed.data.planId) {
    const plan = await prisma.subscriptionPlan.findFirst({
      where: { id: parsed.data.planId, companyId: ctx.companyId },
    })
    if (!plan) return apiError('Plan introuvable', 422)
  }

  const updateData: Record<string, unknown> = { ...parsed.data }
  if (parsed.data.status === 'CANCELLED') updateData.cancelledAt = new Date()
  if (parsed.data.endDate) updateData.endDate = new Date(parsed.data.endDate)
  if (parsed.data.nextBilling) updateData.nextBilling = new Date(parsed.data.nextBilling)

  const updated = await prisma.subscription.update({
    where: { id: params.id },
    data: updateData,
    include: {
      client: { select: { id: true, name: true, firstName: true, phone: true, email: true } },
      plan:   { select: { id: true, name: true, price: true, currency: true, interval: true, intervalCount: true } },
    },
  })
  return apiSuccess(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getTenantContext()
  if (!ctx) return apiError('Non autorisé', 401)

  const sub = await prisma.subscription.findFirst({
    where: { id: params.id, companyId: ctx.companyId },
  })
  if (!sub) return apiError('Abonnement introuvable', 404)

  await prisma.subscription.delete({ where: { id: params.id } })
  return apiSuccess({ deleted: true })
}
