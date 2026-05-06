import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

const updateItemSchema = z.object({
  categoryId: z.string().cuid().optional(),
  name: z.string().min(1).max(100).optional(),
  nameAr: z.string().max(100).optional().nullable(),
  description: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  price: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  preparationTime: z.number().int().min(0).optional(),
  isAvailable: z.boolean().optional(),
  isActive: z.boolean().optional(),
  allergens: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  sortOrder: z.number().int().optional(),
  loyaltyPoints: z.number().int().min(0).optional(),
})

const ingredientInclude = {
  ingredients: {
    include: {
      ingredient: {
        select: { id: true, name: true, unit: true, currentStock: true, minStock: true },
      },
    },
  },
}

export async function GET(
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

  const item = await prisma.menuItem.findFirst({
    where: { id: params.id, companyId: ctx.companyId },
    include: {
      category: { select: { id: true, name: true } },
      ...ingredientInclude,
    },
  })
  if (!item) return apiError('Article introuvable', 404)

  return apiSuccess(item)
}

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
    body = updateItemSchema.parse(await req.json())
  } catch (e) {
    return apiError('Données invalides', 400, e)
  }

  // Verify categoryId belongs to company if provided
  if (body.categoryId) {
    const category = await prisma.menuCategory.findFirst({
      where: { id: body.categoryId, companyId: ctx.companyId },
    })
    if (!category) return apiError('Catégorie introuvable', 404)
  }

  const updated = await prisma.menuItem.update({
    where: { id: params.id },
    data: body,
    include: {
      category: { select: { id: true, name: true } },
      ...ingredientInclude,
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
    requireRole(ctx.role, 'ADMIN')
  } catch {
    return apiError('Accès refusé', 403)
  }

  const item = await prisma.menuItem.findFirst({
    where: { id: params.id, companyId: ctx.companyId },
  })
  if (!item) return apiError('Article introuvable', 404)

  await prisma.menuItem.update({
    where: { id: params.id },
    data: { isActive: false },
  })

  return apiSuccess({ success: true })
}
