import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  nameAr: z.string().max(100).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
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

  const category = await prisma.menuCategory.findFirst({
    where: { id: params.id, companyId: ctx.companyId },
  })
  if (!category) return apiError('Catégorie introuvable', 404)

  let body
  try {
    body = updateCategorySchema.parse(await req.json())
  } catch (e) {
    return apiError('Données invalides', 400, e)
  }

  const updated = await prisma.menuCategory.update({
    where: { id: params.id },
    data: body,
    include: { _count: { select: { items: true } } },
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

  const category = await prisma.menuCategory.findFirst({
    where: { id: params.id, companyId: ctx.companyId },
  })
  if (!category) return apiError('Catégorie introuvable', 404)

  await prisma.menuCategory.update({
    where: { id: params.id },
    data: { isActive: false },
  })

  return apiSuccess({ success: true })
}
