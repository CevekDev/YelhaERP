import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getTenantContext, hasRole } from '@/lib/security/tenant'
import { apiSuccess, apiError, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

const patchSchema = z.object({
  status:      z.enum(['TRIAL', 'ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED']).optional(),
  planId:      z.string().optional(),
  endDate:     z.string().datetime().optional().nullable(),
  nextBilling: z.string().datetime().optional().nullable(),
  notes:       z.string().max(1000).optional(),
  clientEmail: z.string().email().optional().nullable(),
})

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()

    const sub = await prisma.subscription.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
      include: { client: true, plan: true },
    })
    if (!sub) return apiError('Abonnement introuvable', 404)
    return apiSuccess(sub)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500)
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()

    if (!hasRole(ctx.role, 'ADMIN')) return apiError('Permissions insuffisantes', 403)

    const sub = await prisma.subscription.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
      include: { plan: true },
    })
    if (!sub) return apiError('Abonnement introuvable', 404)

    let body: unknown
    try { body = await req.json() } catch { return apiError('Corps invalide', 400) }
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 400)

    let newPlan = sub.plan
    if (parsed.data.planId && parsed.data.planId !== sub.planId) {
      const found = await prisma.subscriptionPlan.findFirst({
        where: { id: parsed.data.planId, companyId: ctx.companyId },
      })
      if (!found) return apiError('Plan introuvable', 422)
      newPlan = found
    }

    const updateData: Record<string, unknown> = { ...parsed.data }
    if (parsed.data.status === 'CANCELLED') updateData.cancelledAt = new Date()
    if (parsed.data.endDate !== undefined) updateData.endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : null
    if (parsed.data.nextBilling !== undefined) updateData.nextBilling = parsed.data.nextBilling ? new Date(parsed.data.nextBilling) : null

    // Recalculate nextBilling when planId changes and no explicit nextBilling provided
    if (parsed.data.planId && parsed.data.planId !== sub.planId && parsed.data.nextBilling === undefined && newPlan) {
      const base = new Date()
      const count = newPlan.intervalCount
      const next = new Date(base)
      switch (newPlan.interval) {
        case 'DAILY':     next.setDate(base.getDate() + count); break
        case 'WEEKLY':    next.setDate(base.getDate() + count * 7); break
        case 'MONTHLY':   next.setMonth(base.getMonth() + count); break
        case 'QUARTERLY': next.setMonth(base.getMonth() + count * 3); break
        case 'YEARLY':    next.setFullYear(base.getFullYear() + count); break
      }
      updateData.nextBilling = next
    }

    const updated = await prisma.subscription.update({
      where: { id: params.id },
      data: updateData,
      include: {
        client: { select: { id: true, name: true, firstName: true, phone: true, email: true } },
        plan:   { select: { id: true, name: true, price: true, currency: true, interval: true, intervalCount: true } },
      },
    })
    return apiSuccess(updated)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    if (e instanceof Error && e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    return apiError('Erreur serveur', 500)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()

    if (!hasRole(ctx.role, 'ADMIN')) return apiError('Permissions insuffisantes', 403)

    const sub = await prisma.subscription.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
    })
    if (!sub) return apiError('Abonnement introuvable', 404)

    await prisma.subscription.delete({ where: { id: params.id } })
    return apiSuccess({ deleted: true })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    if (e instanceof Error && e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    return apiError('Erreur serveur', 500)
  }
}
