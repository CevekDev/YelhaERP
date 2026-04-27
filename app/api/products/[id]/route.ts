import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess } from '@/lib/security/api-response'
import { productSchema } from '@/lib/validations/product'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getTenantContext()
    const product = await prisma.product.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
      include: { stockMovements: { orderBy: { createdAt: 'desc' }, take: 20 } },
    })
    if (!product) return apiError('Produit introuvable', 404)
    return apiSuccess(product)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500)
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'EMPLOYEE')
    const exists = await prisma.product.findFirst({ where: { id: params.id, companyId: ctx.companyId } })
    if (!exists) return apiError('Produit introuvable', 404)
    const body = await req.json().catch(() => null)
    const parsed = productSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422)
    const updated = await prisma.product.update({ where: { id: params.id }, data: parsed.data })
    return apiSuccess(updated)
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
