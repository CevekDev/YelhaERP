import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

const statusSchema = z.object({
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING']),
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
    body = statusSchema.parse(await req.json())
  } catch (e) {
    return apiError('Données invalides', 400, e)
  }

  const updated = await prisma.restaurantTable.update({
    where: { id: params.id },
    data: { status: body.status },
    include: { room: { select: { id: true, name: true } } },
  })

  return apiSuccess(updated)
}
