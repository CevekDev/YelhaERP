import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { withV1Auth, v1Success, v1Error, requireWriteScope } from '../../_auth'

const schema = z.object({
  type:      z.enum(['IN', 'OUT', 'ADJUSTMENT']),
  quantity:  z.number().positive(),
  reference: z.string().max(200).optional(),
  note:      z.string().max(500).optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { productId: string } }) {
  return withV1Auth(req, async (ctx) => {
    const scopeErr = requireWriteScope(ctx)
    if (scopeErr) return scopeErr

    let body: unknown
    try { body = await req.json() } catch { return v1Error('Corps invalide', 400, 'INVALID_BODY') }
    const parsed = schema.safeParse(body)
    if (!parsed.success) return v1Error('Données invalides: ' + JSON.stringify(parsed.error.flatten().fieldErrors), 400, 'INVALID_PARAMS')

    const { type, quantity, reference, note } = parsed.data

    const product = await prisma.product.findFirst({
      where: { id: params.productId, companyId: ctx.companyId, isActive: true },
    })
    if (!product) return v1Error('Produit introuvable', 404, 'NOT_FOUND')

    // Calculate new stock
    let delta = quantity
    if (type === 'OUT') delta = -quantity
    if (type === 'ADJUSTMENT') delta = quantity - Number(product.stockQty)

    const newQty = Number(product.stockQty) + delta
    if (newQty < 0) {
      return v1Error(`Stock insuffisant. Disponible : ${product.stockQty} ${product.unit ?? 'unités'}`, 422, 'INSUFFICIENT_STOCK')
    }

    const [updatedProduct, movement] = await prisma.$transaction([
      prisma.product.update({
        where: { id: params.productId },
        data: { stockQty: newQty },
        select: { id: true, name: true, sku: true, stockQty: true, stockAlert: true, unit: true },
      }),
      prisma.stockMovement.create({
        data: {
          companyId: ctx.companyId,
          productId: params.productId,
          type,
          quantity,
          reference: reference ?? 'API v1',
          note,
        },
      }),
    ])

    return v1Success({
      product: {
        ...updatedProduct,
        isLowStock: Number(updatedProduct.stockQty) <= Number(updatedProduct.stockAlert) && Number(updatedProduct.stockAlert) > 0,
      },
      movement: { id: movement.id, type, quantity, newStock: newQty },
    })
  })
}
