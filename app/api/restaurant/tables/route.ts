import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

const createTableSchema = z.object({
  roomId: z.string().cuid(),
  number: z.string().min(1).max(20),
  capacity: z.number().int().min(1).optional(),
  shape: z.enum(['SQUARE', 'ROUND', 'RECTANGLE']).optional(),
  posX: z.number().int().optional(),
  posY: z.number().int().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
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
  const roomId = searchParams.get('roomId')
  const status = searchParams.get('status')

  const tables = await prisma.restaurantTable.findMany({
    where: {
      companyId: ctx.companyId,
      isActive: true,
      ...(roomId ? { roomId } : {}),
      ...(status ? { status: status as 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' } : {}),
    },
    include: { room: { select: { id: true, name: true } } },
    orderBy: { number: 'asc' },
  })

  return apiSuccess(tables)
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
    body = createTableSchema.parse(await req.json())
  } catch (e) {
    return apiError('Données invalides', 400, e)
  }

  // Verify room belongs to company
  const room = await prisma.restaurantRoom.findFirst({
    where: { id: body.roomId, companyId: ctx.companyId },
  })
  if (!room) return apiError('Salle introuvable', 404)

  const table = await prisma.restaurantTable.create({
    data: {
      companyId: ctx.companyId,
      roomId: body.roomId,
      number: body.number,
      capacity: body.capacity ?? 4,
      shape: body.shape ?? 'SQUARE',
      posX: body.posX ?? 0,
      posY: body.posY ?? 0,
      width: body.width ?? 80,
      height: body.height ?? 80,
      qrToken: crypto.randomUUID(),
    },
    include: { room: { select: { id: true, name: true } } },
  })

  return apiSuccess(table, 201)
}
