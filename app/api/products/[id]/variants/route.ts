import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess } from '@/lib/security/api-response'
import { productVariantSchema } from '@/lib/validations/product'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getTenantContext()
    const product = await prisma.product.findFirst({ where: { id: params.id, companyId: ctx.companyId } })
    if (!product) return apiError('Produit introuvable', 404)
    const variants = await prisma.productVariant.findMany({
      where: { productId: params.id },
      orderBy: [{ size: 'asc' }, { color: 'asc' }],
    })
    return apiSuccess(variants)
  } catch {
    return apiError('Erreur serveur', 500)
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'EMPLOYEE')
    const product = await prisma.product.findFirst({ where: { id: params.id, companyId: ctx.companyId } })
    if (!product) return apiError('Produit introuvable', 404)
    const body = await req.json().catch(() => null)
    const parsed = productVariantSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422, parsed.error.flatten())
    const variant = await prisma.productVariant.create({ data: { ...parsed.data, productId: params.id } })
    return apiSuccess(variant, 201)
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
