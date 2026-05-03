import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withV1Auth, v1Success, v1Error } from '../../_auth'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return withV1Auth(req, async (ctx) => {
    const product = await prisma.product.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
      select: {
        id: true, name: true, sku: true, description: true,
        unitPrice: true, taxRate: true, stockQty: true, stockAlert: true,
        unit: true, isActive: true,
      },
    })
    if (!product) return v1Error('Produit introuvable', 404, 'NOT_FOUND')
    return v1Success({
      ...product,
      isLowStock: Number(product.stockQty) <= Number(product.stockAlert) && Number(product.stockAlert) > 0,
    })
  })
}
