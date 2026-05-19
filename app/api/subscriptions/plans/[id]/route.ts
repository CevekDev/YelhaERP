import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getTenantContext } from '@/lib/security/tenant'
import { apiSuccess, apiError } from '@/lib/security/api-response'

const patchSchema = z.object({
  name:          z.string().min(1).max(100).optional(),
  description:   z.string().max(500).optional().nullable(),
  price:         z.number().min(0).optional(),
  currency:      z.string().optional(),
  interval:      z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY']).optional(),
  intervalCount: z.number().int().min(1).optional(),
  trialDays:     z.number().int().min(0).optional().nullable(),
  features:      z.array(z.string().max(200)).max(20).optional(),
  isActive:      z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getTenantContext()
  if (!ctx) return apiError('Non autorisé', 401)

  const plan = await prisma.subscriptionPlan.findFirst({
    where: { id: params.id, userId: ctx.userId },
  })
  if (!plan) return apiError('Plan introuvable', 404)

  let body: unknown
  try { body = await req.json() } catch { return apiError('Corps invalide', 400) }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return apiError('Données invalides', 400)

  const updated = await prisma.subscriptionPlan.update({
    where: { id: params.id },
    data: parsed.data,
  })
  return apiSuccess(updated)
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getTenantContext()
  if (!ctx) return apiError('Non autorisé', 401)

  const plan = await prisma.subscriptionPlan.findFirst({
    where: { id: params.id, userId: ctx.userId },
  })
  if (!plan) return apiError('Plan introuvable', 404)

  const activeCount = await prisma.subscription.count({
    where: { planId: params.id, status: { in: ['ACTIVE', 'TRIAL'] } },
  })
  if (activeCount > 0) return apiError(`Ce plan a ${activeCount} abonné(s) actif(s). Désactivez-le plutôt.`, 422)

  await prisma.subscriptionPlan.delete({ where: { id: params.id } })
  return apiSuccess({ deleted: true })
}
