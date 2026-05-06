import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { z } from 'zod'

const patchOrderSchema = z.object({
  notes: z.string().max(1000).optional(),
  customerName: z.string().max(200).optional(),
  customerPhone: z.string().max(50).optional(),
  customerAddress: z.string().max(500).optional(),
  deliveryFee: z.number().min(0).optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)

  try {
    const ctx = await getTenantContext()

    const order = await prisma.restaurantOrder.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
      include: {
        table: true,
        lines: {
          include: {
            menuItem: { select: { id: true, name: true, imageUrl: true, preparationTime: true } },
          },
        },
        loyaltyClient: { select: { id: true, name: true, phone: true, points: true, tier: true } },
        kdsTickets: true,
      },
    })

    if (!order) return apiError('Commande introuvable', 404)

    return apiSuccess(order)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500)
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)

  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'EMPLOYEE')

    let body: unknown
    try { body = await req.json() } catch { return apiError('Corps invalide', 400) }

    const parsed = patchOrderSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422, parsed.error.flatten())

    const order = await prisma.restaurantOrder.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
    })
    if (!order) return apiError('Commande introuvable', 404)

    const updated = await prisma.restaurantOrder.update({
      where: { id: params.id },
      data: {
        ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
        ...(parsed.data.customerName !== undefined && { customerName: parsed.data.customerName }),
        ...(parsed.data.customerPhone !== undefined && { customerPhone: parsed.data.customerPhone }),
        ...(parsed.data.customerAddress !== undefined && { customerAddress: parsed.data.customerAddress }),
        ...(parsed.data.deliveryFee !== undefined && {
          deliveryFee: parsed.data.deliveryFee,
          total: Number(order.subtotal) + Number(order.taxAmount) + Number(order.serviceCharge) + parsed.data.deliveryFee - Number(order.discount),
        }),
      },
      include: {
        table: { select: { id: true, number: true } },
        lines: true,
        loyaltyClient: { select: { id: true, name: true, points: true } },
        kdsTickets: true,
      },
    })

    return apiSuccess(updated)
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
