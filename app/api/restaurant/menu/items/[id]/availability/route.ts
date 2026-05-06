import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

const availabilitySchema = z.object({
  isAvailable: z.boolean(),
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

  const item = await prisma.menuItem.findFirst({
    where: { id: params.id, companyId: ctx.companyId },
  })
  if (!item) return apiError('Article introuvable', 404)

  let body
  try {
    body = availabilitySchema.parse(await req.json())
  } catch (e) {
    return apiError('Données invalides', 400, e)
  }

  const updated = await prisma.menuItem.update({
    where: { id: params.id },
    data: { isAvailable: body.isAvailable },
    select: { id: true, isAvailable: true },
  })

  return apiSuccess(updated)
}
