import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { z } from 'zod'

const discountSchema = z.object({
  type: z.enum(['MANUAL', 'LOYALTY']),
  amount: z.number().min(0),
  reason: z.string().max(500).optional(),
  loyaltyPoints: z.number().int().min(1).optional(),
})

export async function POST(
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

    const parsed = discountSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422, parsed.error.flatten())

    const { type, amount, reason, loyaltyPoints } = parsed.data

    const order = await prisma.restaurantOrder.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
    })
    if (!order) return apiError('Commande introuvable', 404)

    if (['CLOSED', 'CANCELLED'].includes(order.status)) {
      return apiError('Impossible d\'appliquer une remise à une commande terminée', 400)
    }

    const newTotal = Math.max(0, Number(order.total) - amount + Number(order.discount))

    if (type === 'MANUAL') {
      const updated = await prisma.restaurantOrder.update({
        where: { id: params.id },
        data: {
          discount: amount,
          discountReason: reason,
          total: Math.max(0, Number(order.subtotal) + Number(order.taxAmount) + Number(order.serviceCharge) + Number(order.deliveryFee) - amount),
        },
      })
      return apiSuccess(updated)
    }

    // LOYALTY discount
    if (!order.loyaltyClientId) {
      return apiError('Aucun client fidélité associé à cette commande', 400)
    }

    const loyaltyClient = await prisma.loyaltyClient.findFirst({
      where: { id: order.loyaltyClientId, companyId: ctx.companyId },
    })
    if (!loyaltyClient) return apiError('Client fidélité introuvable', 404)

    const pointsToRedeem = loyaltyPoints ?? Math.ceil(amount)
    if (loyaltyClient.points < pointsToRedeem) {
      return apiError(`Points insuffisants. Disponible: ${loyaltyClient.points}, requis: ${pointsToRedeem}`, 400)
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.loyaltyTransaction.create({
        data: {
          clientId: order.loyaltyClientId!,
          type: 'REDEEMED',
          points: -pointsToRedeem,
          description: `Points utilisés — Commande ${order.number}`,
          orderId: order.id,
        },
      })

      await tx.loyaltyClient.update({
        where: { id: order.loyaltyClientId! },
        data: { points: { decrement: pointsToRedeem } },
      })

      return tx.restaurantOrder.update({
        where: { id: params.id },
        data: {
          discount: amount,
          discountReason: reason ?? `Remise fidélité: ${pointsToRedeem} pts`,
          total: newTotal,
        },
      })
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
