import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { z } from 'zod'

const statusSchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'DELIVERED', 'CLOSED', 'CANCELLED']),
  cancelReason: z.string().max(500).optional(),
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

    const parsed = statusSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422, parsed.error.flatten())

    const { status: newStatus, cancelReason } = parsed.data

    const order = await prisma.restaurantOrder.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
      include: { kdsTickets: true },
    })
    if (!order) return apiError('Commande introuvable', 404)

    const now = new Date()
    const updateData: Record<string, unknown> = { status: newStatus }

    if (newStatus === 'CANCELLED') {
      updateData.cancelledAt = now
      updateData.cancelReason = cancelReason ?? null
    } else {
      // Status machine validation
      const validTransitions: Record<string, string[]> = {
        PENDING: ['ACCEPTED'],
        ACCEPTED: ['PREPARING'],
        PREPARING: ['READY'],
        READY: ['DELIVERED'],
        DELIVERED: ['CLOSED'],
      }

      const allowed = validTransitions[order.status] ?? []
      if (!allowed.includes(newStatus)) {
        return apiError(`Transition invalide: ${order.status} → ${newStatus}`, 400)
      }

      if (newStatus === 'ACCEPTED') {
        updateData.acceptedAt = now
      } else if (newStatus === 'READY') {
        updateData.readyAt = now
      } else if (newStatus === 'DELIVERED') {
        updateData.deliveredAt = now
      } else if (newStatus === 'CLOSED') {
        if (order.paymentStatus !== 'PAID') {
          return apiError('La commande doit être payée avant clôture', 400)
        }
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.restaurantOrder.update({
        where: { id: params.id },
        data: updateData as never,
      })

      // KDS ticket updates
      if (newStatus === 'PREPARING') {
        await tx.kdsTicket.updateMany({
          where: { orderId: params.id },
          data: { status: 'ACCEPTED' },
        })
      } else if (newStatus === 'READY') {
        await tx.kdsTicket.updateMany({
          where: { orderId: params.id },
          data: { status: 'DONE', doneAt: now },
        })
      }

      // Free table if cancelled and DINE_IN
      if (newStatus === 'CANCELLED' && order.type === 'DINE_IN' && order.tableId) {
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

      return updatedOrder
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
