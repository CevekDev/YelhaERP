import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

const createIngredientSchema = z.object({
  name: z.string().min(1).max(100),
  unit: z.string().min(1).max(20).optional(),
  currentStock: z.number().min(0).optional(),
  minStock: z.number().min(0).optional(),
  unitCost: z.number().min(0).optional(),
  erpProductId: z.string().optional().nullable(),
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

  const ingredients = await prisma.ingredient.findMany({
    where: { companyId: ctx.companyId, isActive: true },
    include: { _count: { select: { menuIngredients: true } } },
    orderBy: { name: 'asc' },
  })

  return apiSuccess(ingredients)
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
    body = createIngredientSchema.parse(await req.json())
  } catch (e) {
    return apiError('Données invalides', 400, e)
  }

  const ingredient = await prisma.ingredient.create({
    data: {
      companyId: ctx.companyId,
      name: body.name,
      unit: body.unit ?? 'g',
      currentStock: body.currentStock ?? 0,
      minStock: body.minStock ?? 0,
      unitCost: body.unitCost ?? 0,
      erpProductId: body.erpProductId,
    },
    include: { _count: { select: { menuIngredients: true } } },
  })

  return apiSuccess(ingredient, 201)
}
