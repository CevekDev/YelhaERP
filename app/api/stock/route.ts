import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { stockMovementSchema } from '@/lib/validations/product'

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    const { searchParams } = req.nextUrl
    const productId = searchParams.get('productId')
    const page = Math.max(1, Number(searchParams.get('page') ?? 1))
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? 20)))

    const where = {
      companyId: ctx.companyId,
      ...(productId && { productId }),
    }
    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: { product: { select: { id: true, name: true, sku: true, unit: true } } },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.stockMovement.count({ where }),
    ])
    return apiSuccess({ movements, total, page, limit })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500)
  }
}

export async function POST(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'EMPLOYEE')
    const body = await req.json().catch(() => null)
    const parsed = stockMovementSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422)

    // Vérifier que le produit appartient à la company
    const product = await prisma.product.findFirst({
      where: { id: parsed.data.productId, companyId: ctx.companyId },
    })
    if (!product) return apiError('Produit introuvable', 404)

    // Calculer le nouveau stock
    const delta = parsed.data.type === 'IN'
      ? parsed.data.quantity
      : parsed.data.type === 'OUT'
      ? -parsed.data.quantity
      : parsed.data.quantity - Number(product.stockQty)

    const newQty = Number(product.stockQty) + delta
    if (newQty < 0) return apiError('Stock insuffisant', 409)

    // Transaction atomique
    const [movement] = await prisma.$transaction([
      prisma.stockMovement.create({
        data: { ...parsed.data, companyId: ctx.companyId },
        include: { product: { select: { name: true, unit: true } } },
      }),
      prisma.product.update({
        where: { id: parsed.data.productId },
        data: { stockQty: newQty },
      }),
    ])
    return apiSuccess(movement, 201)
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
