import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

const stockMovementSchema = z.object({
  type: z.enum(['IN', 'ADJUSTMENT', 'WASTE']),
  quantity: z.number().positive(),
  unitCost: z.number().min(0).optional(),
  note: z.string().max(500).optional().nullable(),
})

export async function POST(
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
    body = stockMovementSchema.parse(await req.json())
  } catch (e) {
    return apiError('Données invalides', 400, e)
  }

  const result = await prisma.$transaction(async (tx) => {
    let stockUpdate: { increment?: number; decrement?: number; set?: number }

    if (body.type === 'IN') {
      stockUpdate = { increment: body.quantity }
    } else if (body.type === 'ADJUSTMENT') {
      stockUpdate = { set: body.quantity }
    } else {
      // WASTE
      const current = Number(ingredient.currentStock)
      if (current < body.quantity) {
        throw new Error('INSUFFICIENT_STOCK')
      }
      stockUpdate = { decrement: body.quantity }
    }

    const updatedIngredient = await tx.ingredient.update({
      where: { id: params.id },
      data: { currentStock: stockUpdate },
    })

    const movement = await tx.ingredientMovement.create({
      data: {
        companyId: ctx.companyId,
        ingredientId: params.id,
        type: body.type === 'WASTE' ? 'WASTE' : body.type === 'IN' ? 'IN' : 'ADJUSTMENT',
        quantity: body.quantity,
        unitCost: body.unitCost,
        note: body.note,
      },
    })

    return { ingredient: updatedIngredient, movement }
  })

  return apiSuccess(result, 201)
}
