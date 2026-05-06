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

    const [updatedTicket] = await prisma.$transaction(async (tx) => {
      const t = await tx.kdsTicket.update({
        where: { id: params.ticketId },
        data: { status: 'ACCEPTED', acceptedAt: now },
      })

      // If order is still PENDING, advance to ACCEPTED
      if (ticket.order.status === 'PENDING') {
        await tx.restaurantOrder.update({
          where: { id: ticket.order.id },
          data: { status: 'ACCEPTED', acceptedAt: now },
        })
      }

      return [t]
    })

    return apiSuccess(updatedTicket)
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
