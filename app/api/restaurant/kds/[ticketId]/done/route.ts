import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

export async function POST(
  req: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)

  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'EMPLOYEE')

    const ticket = await prisma.kdsTicket.findFirst({
      where: { id: params.ticketId, companyId: ctx.companyId },
      include: { order: { select: { id: true, status: true } } },
    })
    if (!ticket) return apiError('Ticket KDS introuvable', 404)

    const now = new Date()

    const result = await prisma.$transaction(async (tx) => {
      const updatedTicket = await tx.kdsTicket.update({
        where: { id: params.ticketId },
        data: { status: 'DONE', doneAt: now },
      })

      // Check if all tickets for this order are DONE
      const remainingTickets = await tx.kdsTicket.count({
        where: {
          orderId: ticket.order.id,
          status: { not: 'DONE' },
          id: { not: params.ticketId },
        },
      })

      if (remainingTickets === 0) {
        await tx.restaurantOrder.update({
          where: { id: ticket.order.id },
          data: { status: 'READY', readyAt: now },
        })
      }

      return updatedTicket
    })

    return apiSuccess(result)
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
