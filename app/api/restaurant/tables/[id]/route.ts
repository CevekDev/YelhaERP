import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

const updateTableSchema = z.object({
  number: z.string().min(1).max(20).optional(),
  capacity: z.number().int().min(1).optional(),
  shape: z.enum(['SQUARE', 'ROUND', 'RECTANGLE']).optional(),
  posX: z.number().int().optional(),
  posY: z.number().int().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  isActive: z.boolean().optional(),
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

  const table = await prisma.restaurantTable.findFirst({
    where: { id: params.id, companyId: ctx.companyId },
  })
  if (!table) return apiError('Table introuvable', 404)

  let body
  try {
    body = updateTableSchema.parse(await req.json())
  } catch (e) {
    return apiError('Données invalides', 400, e)
  }

  const updated = await prisma.restaurantTable.update({
    where: { id: params.id },
    data: body,
    include: { room: { select: { id: true, name: true } } },
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
    requireRole(ctx.role, 'ADMIN')
  } catch {
    return apiError('Accès refusé', 403)
  }

  const table = await prisma.restaurantTable.findFirst({
    where: { id: params.id, companyId: ctx.companyId },
  })
  if (!table) return apiError('Table introuvable', 404)

  await prisma.restaurantTable.update({
    where: { id: params.id },
    data: { isActive: false },
  })

  return apiSuccess({ success: true })
}
