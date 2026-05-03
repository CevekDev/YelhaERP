import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { withV1Auth, v1Success, v1Error, requireWriteScope } from '../_auth'
import { generateInvoiceNumber } from '@/lib/algerian/format'

const orderSchema = z.object({
  client: z.object({
    email:     z.string().email(),
    name:      z.string().min(1).max(200),
    firstName: z.string().max(100).optional(),
    phone:     z.string().max(30).optional(),
    address:   z.string().max(500).optional(),
    type:      z.enum(['COMPANY', 'INDIVIDUAL']).default('INDIVIDUAL'),
  }),
  items: z.array(z.object({
    sku:         z.string().optional(),
    productId:   z.string().optional(),
    description: z.string().max(500).optional(),
    quantity:    z.number().positive().max(100_000),
    unitPrice:   z.number().min(0).optional(),
    taxRate:     z.number().min(0).max(100).optional(),
  })).min(1).max(100),
  notes:       z.string().max(2000).optional(),
  currency:    z.string().length(3).default('DZD'),
  issueDate:   z.string().datetime().optional(),
  status:      z.enum(['DRAFT', 'SENT']).default('SENT'),
  checkStock:  z.boolean().default(true),
  externalRef: z.string().max(200).optional(),
})

export async function POST(req: NextRequest) {
  return withV1Auth(req, async (ctx) => {
    const scopeErr = requireWriteScope(ctx)
    if (scopeErr) return scopeErr

    let body: unknown
    try { body = await req.json() } catch { return v1Error('Corps invalide', 400, 'INVALID_BODY') }
    const parsed = orderSchema.safeParse(body)
    if (!parsed.success) {
      return v1Error('Données invalides', 400, 'INVALID_PARAMS')
    }

    const { client: clientData, items, notes, currency, issueDate, status, checkStock, externalRef } = parsed.data

    // 1. Find or create client by email
    let client = await prisma.client.findFirst({
      where: { companyId: ctx.companyId, email: clientData.email },
    })
    if (!client) {
      client = await prisma.client.create({
        data: {
          companyId:  ctx.companyId,
          email:      clientData.email,
          name:       clientData.name,
          firstName:  clientData.firstName ?? null,
          phone:      clientData.phone ?? null,
          address:    clientData.address ?? null,
          clientType: clientData.type,
        },
      })
    }

    // 2. Resolve products (by sku or id) — must belong to this company
    const resolvedItems: Array<{
      productId: string | null
      description: string
      quantity: number
      unitPrice: number
      taxRate: number
      sku: string | null
      stockQty: number
    }> = []

    for (const item of items) {
      if (!item.sku && !item.productId && !item.description) {
        return v1Error('Chaque ligne doit avoir un sku, productId ou description', 400, 'INVALID_PARAMS')
      }

      let product = null
      if (item.productId) {
        product = await prisma.product.findFirst({ where: { id: item.productId, companyId: ctx.companyId, isActive: true } })
        if (!product) return v1Error(`Produit introuvable: ${item.productId}`, 422, 'PRODUCT_NOT_FOUND')
      } else if (item.sku) {
        product = await prisma.product.findFirst({ where: { sku: item.sku, companyId: ctx.companyId, isActive: true } })
        if (!product) return v1Error(`SKU introuvable: ${item.sku}`, 422, 'PRODUCT_NOT_FOUND')
      }

      resolvedItems.push({
        productId:   product?.id ?? null,
        description: item.description ?? product?.name ?? '',
        quantity:    item.quantity,
        unitPrice:   item.unitPrice ?? (product ? Number(product.unitPrice) : 0),
        taxRate:     item.taxRate ?? (product ? Number(product.taxRate) : 19),
        sku:         product?.sku ?? item.sku ?? null,
        stockQty:    product ? Number(product.stockQty) : Infinity,
      })
    }

    // 3. Check stock availability if requested
    if (checkStock) {
      const outOfStock = resolvedItems.filter(i => i.productId && i.stockQty < i.quantity)
      if (outOfStock.length > 0) {
        return v1Error(
          `Stock insuffisant pour : ${outOfStock.map(i => `${i.description} (dispo: ${i.stockQty}, demandé: ${i.quantity})`).join(', ')}`,
          422,
          'INSUFFICIENT_STOCK'
        )
      }
    }

    // 4. Calculate totals
    const lines = resolvedItems.map(item => {
      const lineTotal = Math.round(item.quantity * item.unitPrice * (1 + item.taxRate / 100) * 100) / 100
      const taxAmount = Math.round(item.quantity * item.unitPrice * (item.taxRate / 100) * 100) / 100
      return { ...item, taxAmount, lineTotal }
    })

    const subtotal  = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0)
    const taxAmount = lines.reduce((s, l) => s + l.taxAmount, 0)
    const total     = Math.round((subtotal + taxAmount) * 100) / 100

    // 5. Generate invoice number
    const count = await prisma.invoice.count({ where: { companyId: ctx.companyId } })
    const number = generateInvoiceNumber('FA', count + 1, new Date().getFullYear())

    // 6. Create invoice + lines + stock movements in one transaction
    const invoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          companyId: ctx.companyId,
          clientId:  client!.id,
          number,
          type:      'STANDARD',
          status,
          issueDate: issueDate ? new Date(issueDate) : new Date(),
          subtotal,
          taxAmount,
          total,
          currency,
          notes:     [notes, externalRef ? `Réf. externe: ${externalRef}` : null].filter(Boolean).join('\n') || null,
          lines: {
            create: lines.map(l => ({
              productId:   l.productId,
              description: l.description,
              quantity:    l.quantity,
              unitPrice:   l.unitPrice,
              taxRate:     l.taxRate,
              total:       l.lineTotal,
            })),
          },
        },
        include: {
          lines: true,
          client: { select: { id: true, name: true, email: true } },
        },
      })

      // Decrement stock + create movement for each product
      for (const item of lines) {
        if (!item.productId) continue
        await tx.product.update({
          where: { id: item.productId },
          data: { stockQty: { decrement: item.quantity } },
        })
        await tx.stockMovement.create({
          data: {
            companyId: ctx.companyId,
            productId: item.productId,
            type: 'OUT',
            quantity: item.quantity,
            reference: `FA-API/${inv.number}`,
            note: `Vente via API v1${externalRef ? ` — Réf: ${externalRef}` : ''}`,
          },
        })
      }

      return inv
    })

    return v1Success(invoice, { stockDecremented: lines.filter(l => l.productId).length > 0 })
  })
}

// GET — list orders (alias for invoices from API)
export async function GET(req: NextRequest) {
  return withV1Auth(req, async (ctx) => {
    const page  = Math.max(1, Number(req.nextUrl.searchParams.get('page') ?? 1))
    const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get('limit') ?? 20)))

    const [orders, total] = await Promise.all([
      prisma.invoice.findMany({
        where: { companyId: ctx.companyId, type: 'STANDARD' },
        select: {
          id: true, number: true, status: true, total: true, currency: true,
          issueDate: true, notes: true,
          client: { select: { id: true, name: true, email: true } },
          _count: { select: { lines: true } },
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.invoice.count({ where: { companyId: ctx.companyId, type: 'STANDARD' } }),
    ])

    return v1Success(orders, { page, limit, total, pages: Math.ceil(total / limit) })
  })
}
