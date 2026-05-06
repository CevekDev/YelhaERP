import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { z } from 'zod'

const paySchema = z.object({
  method: z.enum(['CASH', 'CHARGILY_EDAHABIA', 'CHARGILY_CIB', 'CCP_VIREMENT']),
  amountPaid: z.number().min(0).optional(),
})

function calculateTier(totalSpent: number): 'STANDARD' | 'SILVER' | 'GOLD' | 'VIP' {
  if (totalSpent >= 5000) return 'VIP'
  if (totalSpent >= 2000) return 'GOLD'
  if (totalSpent >= 500) return 'SILVER'
  return 'STANDARD'
}

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

    const parsed = paySchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422, parsed.error.flatten())

    const { method, amountPaid } = parsed.data

    const order = await prisma.restaurantOrder.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
    })
    if (!order) return apiError('Commande introuvable', 404)

    if (order.paymentStatus === 'PAID') {
      return apiError('Commande déjà payée', 400)
    }

    // Chargily placeholder
    if (method === 'CHARGILY_EDAHABIA' || method === 'CHARGILY_CIB') {
      return apiSuccess({ message: 'Paiement Chargily non configuré', chargilyLink: null })
    }

    // CCP Virement — awaiting transfer
    if (method === 'CCP_VIREMENT') {
      const updated = await prisma.restaurantOrder.update({
        where: { id: params.id },
        data: {
          paymentMethod: 'CCP_VIREMENT',
          paymentStatus: 'PARTIAL',
        },
      })
      return apiSuccess(updated)
    }

    // CASH payment
    const now = new Date()
    const config = await prisma.restaurantConfig.findUnique({
      where: { companyId: ctx.companyId },
    })

    const result = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.restaurantOrder.update({
        where: { id: params.id },
        data: {
          paymentMethod: 'CASH',
          paymentStatus: 'PAID',
          paidAt: now,
          status: 'CLOSED',
        },
      })

      // Free table if DINE_IN and no other active orders
      if (order.type === 'DINE_IN' && order.tableId) {
        const otherActive = await tx.restaurantOrder.count({
          where: {
            tableId: order.tableId,
            companyId: ctx.companyId,
            status: { notIn: ['CANCELLED', 'CLOSED'] },
            id: { not: params.id },
          },
        })
        if (otherActive === 0) {
          await tx.restaurantTable.update({
            where: { id: order.tableId },
            data: { status: 'AVAILABLE' },
          })
        }
      }

      // Loyalty points
      if (order.loyaltyClientId && config && Number(config.loyaltyPointsRate) > 0) {
        const loyaltyClient = await tx.loyaltyClient.findUnique({
          where: { id: order.loyaltyClientId },
        })
        if (loyaltyClient) {
          const pointsEarned = Math.floor(Number(order.total) / Number(config.loyaltyPointsRate))
          const newTotalSpent = Number(loyaltyClient.totalSpent) + Number(order.total)
          const newPoints = loyaltyClient.points + pointsEarned
          const newTier = calculateTier(newTotalSpent)

          await tx.loyaltyTransaction.create({
            data: {
              clientId: order.loyaltyClientId,
              type: 'EARNED',
              points: pointsEarned,
              description: `Points gagnés — Commande ${order.number}`,
              orderId: order.id,
            },
          })

          await tx.loyaltyClient.update({
            where: { id: order.loyaltyClientId },
            data: {
              points: newPoints,
              totalSpent: newTotalSpent,
              visitsCount: { increment: 1 },
              lastVisit: now,
              tier: newTier,
            },
          })
        }
      }

      return updatedOrder
    })

    return apiSuccess({ order: result, amountPaid: amountPaid ?? Number(order.total) })
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
