import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

const createReservationSchema = z.object({
  tableId: z.string().cuid().optional().nullable(),
  guestName: z.string().min(1).max(100),
  guestPhone: z.string().min(1).max(30),
  guestCount: z.number().int().min(1).optional(),
  date: z.string().datetime(),
  duration: z.number().int().min(1).optional(),
  notes: z.string().max(500).optional().nullable(),
})

export async function GET(req: NextRequest) {
  const rl = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!rl.success) return rateLimitResponse(rl.reset)

  let ctx
  try {
    ctx = await getTenantContext()
  } catch (e) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    throw e
  }

  const { searchParams } = new URL(req.url)
  const dateParam = searchParams.get('date')
  const status = searchParams.get('status')

  let dateFilter = {}
  if (dateParam) {
    const start = new Date(dateParam)
    start.setHours(0, 0, 0, 0)
    const end = new Date(dateParam)
    end.setHours(23, 59, 59, 999)
    dateFilter = { date: { gte: start, lte: end } }
  }

  const reservations = await prisma.reservation.findMany({
    where: {
      companyId: ctx.companyId,
      ...dateFilter,
      ...(status ? { status: status as 'CONFIRMED' | 'ARRIVED' | 'CANCELLED' | 'NO_SHOW' } : {}),
    },
    include: {
      table: { select: { id: true, number: true } },
    },
    orderBy: { date: 'asc' },
  })

  return apiSuccess(reservations)
}

export async function POST(req: NextRequest) {
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

  let body
  try {
    body = createReservationSchema.parse(await req.json())
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

  const reservation = await prisma.$transaction(async (tx) => {
    const created = await tx.reservation.create({
      data: {
        companyId: ctx.companyId,
        tableId: body.tableId ?? null,
        guestName: body.guestName,
        guestPhone: body.guestPhone,
        guestCount: body.guestCount ?? 2,
        date: new Date(body.date),
        duration: body.duration ?? 90,
        notes: body.notes,
      },
      include: {
        table: { select: { id: true, number: true } },
      },
    })

    if (body.tableId) {
      await tx.restaurantTable.update({
        where: { id: body.tableId },
        data: { status: 'RESERVED' },
      })
    }

    return created
  })

  return apiSuccess(reservation, 201)
}
