import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

const updateIngredientSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  unit: z.string().min(1).max(20).optional(),
  currentStock: z.number().min(0).optional(),
  minStock: z.number().min(0).optional(),
  unitCost: z.number().min(0).optional(),
  erpProductId: z.string().optional().nullable(),
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

  const ingredient = await prisma.ingredient.findFirst({
    where: { id: params.id, companyId: ctx.companyId },
  })
  if (!ingredient) return apiError('Ingrédient introuvable', 404)

  let body
  try {
    body = updateIngredientSchema.parse(await req.json())
  } catch (e) {
    return apiError('Données invalides', 400, e)
  }

  const updated = await prisma.ingredient.update({
    where: { id: params.id },
    data: body,
    include: { _count: { select: { menuIngredients: true } } },
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

  const ingredient = await prisma.ingredient.findFirst({
    where: { id: params.id, companyId: ctx.companyId },
  })
  if (!ingredient) return apiError('Ingrédient introuvable', 404)

  await prisma.ingredient.update({
    where: { id: params.id },
    data: { isActive: false },
  })

  return apiSuccess({ success: true })
}
