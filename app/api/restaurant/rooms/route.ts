import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

const createRoomSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(255).optional().nullable(),
  sortOrder: z.number().int().optional(),
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

  const rooms = await prisma.restaurantRoom.findMany({
    where: { companyId: ctx.companyId },
    include: { _count: { select: { tables: true } } },
    orderBy: { sortOrder: 'asc' },
  })

  return apiSuccess(rooms)
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
    body = createRoomSchema.parse(await req.json())
  } catch (e) {
    return apiError('Données invalides', 400, e)
  }

  const room = await prisma.restaurantRoom.create({
    data: {
      companyId: ctx.companyId,
      name: body.name,
      description: body.description,
      sortOrder: body.sortOrder ?? 0,
    },
    include: { _count: { select: { tables: true } } },
  })

  return apiSuccess(room, 201)
}
