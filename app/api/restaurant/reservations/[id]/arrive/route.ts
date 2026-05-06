import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const rl = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!rl.success) return rateLimitResponse(rl.reset)

  let ctx
  try {
    ctx = await getTenantContext()
  } catch (e) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    throw e
  }

  try {
    requireRole(ctx.role, 'EMPLOYEE')
  } catch {
    return apiError('Accès refusé', 403)
  }

  const reservation = await prisma.reservation.findFirst({
    where: { id: params.id, companyId: ctx.companyId },
  })
  if (!reservation) return apiError('Réservation introuvable', 404)

  const updated = await prisma.$transaction(async (tx) => {
    const updatedReservation = await tx.reservation.update({
      where: { id: params.id },
      data: { status: 'ARRIVED' },
      include: {
        table: { select: { id: true, number: true } },
      },
    })

    if (reservation.tableId) {
      await tx.restaurantTable.update({
        where: { id: reservation.tableId },
        data: { status: 'OCCUPIED' },
      })
    }

    return updatedReservation
  })

  return apiSuccess(updated)
}
