import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { updatePurchaseOrderSchema } from '@/lib/validations/purchase'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)

  try {
    const ctx = await getTenantContext()

    const order = await prisma.purchaseOrder.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
      include: {
        supplier: true,
        lines: true,
        goodsReceipts: {
          include: { lines: true },
          orderBy: { createdAt: 'desc' },
        },
        supplierInvoices: {
          include: { lines: true },
          orderBy: { createdAt: 'desc' },
        },
        approvals: {
          orderBy: { step: 'asc' },
        },
      },
    })

    if (!order) return apiError('Bon de commande introuvable', 404)

    return apiSuccess(order)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500)
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)

  try {
    const ctx = await getTenantContext()

    const existing = await prisma.purchaseOrder.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
    })
    if (!existing) return apiError('Bon de commande introuvable', 404)
    if (existing.status !== 'DRAFT') return apiError('Seul un brouillon peut être modifié', 422)

    let body: unknown
    try { body = await req.json() } catch { return apiError('Corps invalide', 400) }

    const parsed = updatePurchaseOrderSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422, parsed.error.flatten())

    const data = parsed.data

    // Recalculate totals if lines provided
    let subtotal: number | undefined
    let taxAmount: number | undefined
    let total: number | undefined
    let linesData: {
      productId: string | null
      description: string
      quantity: number
      unitPrice: number
      taxRate: number
      total: number
    }[] | undefined

    if (data.lines) {
      subtotal = 0
      taxAmount = 0
      linesData = data.lines.map(line => {
        const ls = line.quantity * line.unitPrice
        const lt = ls * (line.taxRate / 100)
        subtotal! += ls
        taxAmount! += lt
        return {
          productId: line.productId ?? null,
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          taxRate: line.taxRate,
          total: ls + lt,
        }
      })
      total = subtotal + taxAmount
    }

    const order = await prisma.$transaction(async tx => {
      if (linesData) {
        await tx.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: params.id } })
      }
      return tx.purchaseOrder.update({
        where: { id: params.id },
        data: {
          ...(data.supplierId && { supplierId: data.supplierId }),
          ...(data.orderDate && { orderDate: new Date(data.orderDate) }),
          ...(data.notes !== undefined && { notes: data.notes }),
          ...(subtotal !== undefined && { subtotal, taxAmount, total }),
          ...(linesData && { lines: { create: linesData } }),
        },
        include: {
          supplier: { select: { id: true, name: true } },
          lines: true,
        },
      })
    })

    return apiSuccess(order)
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
