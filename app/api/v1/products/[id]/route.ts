import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { withV1Auth, v1Success, v1Error, requireWriteScope } from '../../_auth'

const updateSchema = z.object({
  name:        z.string().min(1).max(200).trim().optional(),
  sku:         z.string().max(50).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  unitPrice:   z.number().min(0).max(99999999).optional(),
  taxRate:     z.number().min(0).max(100).optional(),
  stockAlert:  z.number().min(0).optional(),
  unit:        z.string().max(20).optional().nullable(),
  isActive:    z.boolean().optional(),
})

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return withV1Auth(req, async (ctx) => {
    const product = await prisma.product.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
      select: {
        id: true, name: true, sku: true, description: true,
        unitPrice: true, taxRate: true, stockQty: true, stockAlert: true,
        unit: true, isActive: true, createdAt: true, updatedAt: true,
      },
    })
    if (!product) return v1Error('Produit introuvable', 404, 'NOT_FOUND')
    return v1Success({
      ...product,
      isLowStock: Number(product.stockQty) <= Number(product.stockAlert) && Number(product.stockAlert) > 0,
    })
  })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  return withV1Auth(req, async (ctx) => {
    const writeErr = requireWriteScope(ctx)
    if (writeErr) return writeErr

    const existing = await prisma.product.findFirst({ where: { id: params.id, companyId: ctx.companyId } })
    if (!existing) return v1Error('Produit introuvable', 404, 'NOT_FOUND')

    let body: unknown
    try { body = await req.json() } catch { return v1Error('Corps JSON invalide', 400, 'INVALID_BODY') }

    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return v1Error('Données invalides', 422, 'VALIDATION_ERROR')

    // Check SKU uniqueness if changed
    if (parsed.data.sku && parsed.data.sku !== existing.sku) {
      const duplicate = await prisma.product.findFirst({
        where: { companyId: ctx.companyId, sku: parsed.data.sku, NOT: { id: params.id } },
      })
      if (duplicate) return v1Error('Un produit avec ce SKU existe déjà', 409, 'CONFLICT')
    }

    const product = await prisma.product.update({
      where: { id: params.id },
      data:  parsed.data,
      select: {
        id: true, name: true, sku: true, description: true,
        unitPrice: true, taxRate: true, stockQty: true, stockAlert: true,
        unit: true, isActive: true, updatedAt: true,
      },
    })

    return v1Success({
      ...product,
      isLowStock: Number(product.stockQty) <= Number(product.stockAlert) && Number(product.stockAlert) > 0,
    })
  })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return withV1Auth(req, async (ctx) => {
    const writeErr = requireWriteScope(ctx)
    if (writeErr) return writeErr

    const existing = await prisma.product.findFirst({ where: { id: params.id, companyId: ctx.companyId } })
    if (!existing) return v1Error('Produit introuvable', 404, 'NOT_FOUND')

    // Soft delete: deactivate rather than hard delete to preserve invoice line history
    await prisma.product.update({
      where: { id: params.id },
      data:  { isActive: false },
    })

    return v1Success({ id: params.id, deleted: true, note: 'Produit désactivé (historique préservé)' })
  })
}
