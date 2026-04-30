import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { createPurchaseOrderSchema, purchaseOrderQuerySchema } from '@/lib/validations/purchase'
import { generateInvoiceNumber } from '@/lib/algerian/format'

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)

  try {
    const ctx = await getTenantContext()
    const { searchParams } = req.nextUrl
    const query = purchaseOrderQuerySchema.safeParse(Object.fromEntries(searchParams))
    if (!query.success) return apiError('Paramètres invalides', 400)

    const { page, limit, status, supplierId, search } = query.data
    const skip = (page - 1) * limit

    const where = {
      companyId: ctx.companyId,
      ...(status && { status }),
      ...(supplierId && { supplierId }),
      ...(search && {
        OR: [
          { number: { contains: search, mode: 'insensitive' as const } },
          { supplier: { name: { contains: search, mode: 'insensitive' as const } } },
        ],
      }),
    }

    const [orders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: { select: { id: true, name: true } },
          lines: { select: { id: true, description: true, quantity: true, unitPrice: true, taxRate: true, total: true } },
          _count: { select: { goodsReceipts: true, supplierInvoices: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.purchaseOrder.count({ where }),
    ])

    return apiSuccess({ orders, total, page, limit, pages: Math.ceil(total / limit) })
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

    let body: unknown
    try { body = await req.json() } catch { return apiError('Corps invalide', 400) }

    const parsed = createPurchaseOrderSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422, parsed.error.flatten())

    // Verify supplier belongs to company
    const supplier = await prisma.supplier.findFirst({
      where: { id: parsed.data.supplierId, companyId: ctx.companyId },
    })
    if (!supplier) return apiError('Fournisseur introuvable', 404)

    // Generate PO number: BC-YYYY-NNN
    const count = await prisma.purchaseOrder.count({ where: { companyId: ctx.companyId } })
    const number = generateInvoiceNumber('BC', count + 1)

    // Calculate totals
    let subtotal = 0
    let taxAmount = 0
    const lines = parsed.data.lines.map(line => {
      const lineSubtotal = line.quantity * line.unitPrice
      const lineTax = lineSubtotal * (line.taxRate / 100)
      subtotal += lineSubtotal
      taxAmount += lineTax
      return {
        productId: line.productId ?? null,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        taxRate: line.taxRate,
        total: lineSubtotal + lineTax,
      }
    })
    const total = subtotal + taxAmount

    const order = await prisma.purchaseOrder.create({
      data: {
        companyId: ctx.companyId,
        supplierId: parsed.data.supplierId,
        number,
        orderDate: new Date(parsed.data.orderDate),
        notes: parsed.data.notes,
        subtotal,
        taxAmount,
        total,
        lines: { create: lines },
      },
      include: {
        supplier: { select: { id: true, name: true } },
        lines: true,
      },
    })

    return apiSuccess(order, 201)
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
