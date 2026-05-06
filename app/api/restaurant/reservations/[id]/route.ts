import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

const updateReservationSchema = z.object({
  tableId: z.string().cuid().optional().nullable(),
  guestName: z.string().min(1).max(100).optional(),
  guestPhone: z.string().min(1).max(30).optional(),
  guestCount: z.number().int().min(1).optional(),
  date: z.string().datetime().optional(),
  duration: z.number().int().min(1).optional(),
  status: z.enum(['CONFIRMED', 'ARRIVED', 'CANCELLED', 'NO_SHOW']).optional(),
  notes: z.string().max(500).optional().nullable(),
})

export async function PATCH(
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

  let body
  try {
    body = updateReservationSchema.parse(await req.json())
  } catch (e) {
    return apiError('Données invalides', 400, e)
  }

  // Verify tableId belongs to company if provided
  if (body.tableId) {
    const table = await prisma.restaurantTable.findFirst({
      where: { id: body.tableId, companyId: ctx.companyId },
    })
    if (!table) return apiError('Table introuvable', 404)
  }

  const updated = await prisma.reservation.update({
    where: { id: params.id },
    data: {
      ...body,
      date: body.date ? new Date(body.date) : undefined,
    },
    include: {
      table: { select: { id: true, number: true } },
    },
  })

  return apiSuccess(updated)
}

export async function DELETE(
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

  const updated = await prisma.reservation.update({
    where: { id: params.id },
    data: { status: 'CANCELLED' },
    include: {
      table: { select: { id: true, number: true } },
    },
  })

  return apiSuccess(updated)
}
