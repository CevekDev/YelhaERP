import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

const createItemSchema = z.object({
  categoryId: z.string().cuid(),
  name: z.string().min(1).max(100),
  nameAr: z.string().max(100).optional().nullable(),
  description: z.string().optional().nullable(),
  imageUrl: z.string().url().optional().nullable(),
  price: z.number().min(0),
  taxRate: z.number().min(0).max(100).optional(),
  preparationTime: z.number().int().min(0).optional(),
  isAvailable: z.boolean().optional(),
  allergens: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  sortOrder: z.number().int().optional(),
  loyaltyPoints: z.number().int().min(0).optional(),
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
  const categoryId = searchParams.get('categoryId')

  const items = await prisma.menuItem.findMany({
    where: {
      companyId: ctx.companyId,
      isActive: true,
      ...(categoryId ? { categoryId } : {}),
    },
    include: {
      category: { select: { id: true, name: true } },
      ingredients: {
        include: {
          ingredient: {
            select: { id: true, name: true, unit: true, currentStock: true, minStock: true },
          },
        },
      },
    },
    orderBy: { sortOrder: 'asc' },
  })

  return apiSuccess(items)
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
    body = createItemSchema.parse(await req.json())
  } catch (e) {
    return apiError('Données invalides', 400, e)
  }

  // Verify category belongs to company
  const category = await prisma.menuCategory.findFirst({
    where: { id: body.categoryId, companyId: ctx.companyId },
  })
  if (!category) return apiError('Catégorie introuvable', 404)

  const item = await prisma.menuItem.create({
    data: {
      companyId: ctx.companyId,
      categoryId: body.categoryId,
      name: body.name,
      nameAr: body.nameAr,
      description: body.description,
      imageUrl: body.imageUrl,
      price: body.price,
      taxRate: body.taxRate ?? 19,
      preparationTime: body.preparationTime ?? 10,
      isAvailable: body.isAvailable ?? true,
      allergens: body.allergens ?? [],
      tags: body.tags ?? [],
      sortOrder: body.sortOrder ?? 0,
      loyaltyPoints: body.loyaltyPoints ?? 0,
    },
    include: {
      category: { select: { id: true, name: true } },
      ingredients: {
        include: {
          ingredient: {
            select: { id: true, name: true, unit: true, currentStock: true, minStock: true },
          },
        },
      },
    },
  })

  return apiSuccess(item, 201)
}
