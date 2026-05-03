import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getTenantContext } from '@/lib/security/tenant'
import { apiSuccess, apiError } from '@/lib/security/api-response'
import { generateInvoiceNumber } from '@/lib/algerian/format'

const saleSchema = z.object({
  items: z.array(z.object({
    productId:   z.string(),
    quantity:    z.number().positive().max(10000),
    unitPrice:   z.number().min(0).optional(),
    taxRate:     z.number().min(0).max(100).optional(),
    description: z.string().max(200).optional(),
  })).min(1).max(50),
  paymentMethod: z.enum(['CASH', 'DEBT']).default('CASH'),
  amountPaid:    z.number().min(0),
  clientId:      z.string().optional(),
  clientName:    z.string().max(200).optional(),
  dueDate:       z.string().datetime().optional(),
  notes:         z.string().max(500).optional(),
})

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx) return apiError('Non autorisé', 401)

  // Find open session
  const session = await prisma.posSession.findFirst({
    where: { companyId: ctx.companyId, status: 'OPEN' },
  })
  if (!session) return apiError("Aucune session de caisse ouverte. Ouvrez une session d'abord.", 422)

  let body: unknown
  try { body = await req.json() } catch { return apiError('Corps invalide', 400) }
  const parsed = saleSchema.safeParse(body)
  if (!parsed.success) return apiError('Données invalides', 400)

  const { items, paymentMethod, amountPaid, clientId, clientName, dueDate, notes } = parsed.data

  // Resolve products
  const resolvedItems: Array<{
    productId: string; name: string; sku: string | null
    quantity: number; unitPrice: number; taxRate: number; stockQty: number
  }> = []

  for (const item of items) {
    const product = await prisma.product.findFirst({
      where: { id: item.productId, companyId: ctx.companyId, isActive: true },
    })
    if (!product) return apiError(`Produit introuvable: ${item.productId}`, 422)
    if (Number(product.stockQty) < item.quantity) {
      return apiError(
        `Stock insuffisant pour ${product.name}: dispo ${product.stockQty}, demandé ${item.quantity}`,
        422
      )
    }
    resolvedItems.push({
      productId: product.id,
      name:      item.description ?? product.name,
      sku:       product.sku,
      quantity:  item.quantity,
      unitPrice: item.unitPrice ?? Number(product.unitPrice),
      taxRate:   item.taxRate ?? Number(product.taxRate),
      stockQty:  Number(product.stockQty),
    })
  }

  // Resolve or create client
  let clientRecord: { id: string } | null = null
  if (clientId) {
    clientRecord = await prisma.client.findFirst({ where: { id: clientId, companyId: ctx.companyId } })
    if (!clientRecord) return apiError('Client introuvable', 422)
  } else if (paymentMethod === 'DEBT') {
    if (!clientName) return apiError('Un nom de client est requis pour les dettes', 422)
    clientRecord = await prisma.client.findFirst({ where: { companyId: ctx.companyId, name: clientName } })
    if (!clientRecord) {
      clientRecord = await prisma.client.create({
        data: { companyId: ctx.companyId, name: clientName, clientType: 'INDIVIDUAL' },
      })
    }
  } else {
    // Anonymous sale → "Client comptoir"
    clientRecord = await prisma.client.findFirst({ where: { companyId: ctx.companyId, name: 'Client comptoir' } })
    if (!clientRecord) {
      clientRecord = await prisma.client.create({
        data: { companyId: ctx.companyId, name: 'Client comptoir', clientType: 'INDIVIDUAL' },
      })
    }
  }

  // Calculate totals
  const lines = resolvedItems.map(item => {
    const lineHT    = item.quantity * item.unitPrice
    const lineTax   = Math.round(lineHT * (item.taxRate / 100) * 100) / 100
    const lineTotal = Math.round((lineHT + lineTax) * 100) / 100
    return { ...item, lineHT, lineTax, lineTotal }
  })
  const subtotal  = Math.round(lines.reduce((s, l) => s + l.lineHT, 0) * 100) / 100
  const taxAmount = Math.round(lines.reduce((s, l) => s + l.lineTax, 0) * 100) / 100
  const total     = Math.round((subtotal + taxAmount) * 100) / 100
  const change    = paymentMethod === 'CASH' ? Math.max(0, amountPaid - total) : 0

  if (paymentMethod !== 'DEBT' && amountPaid < total) {
    return apiError(`Montant reçu insuffisant. Total: ${total} DA, Reçu: ${amountPaid} DA`, 422)
  }

  // Generate invoice number
  const invCount = await prisma.invoice.count({ where: { companyId: ctx.companyId } })
  const invoiceNumber = generateInvoiceNumber('TS', invCount + 1, new Date().getFullYear())

  const result = await prisma.$transaction(async (tx) => {
    // Create invoice
    const invoice = await tx.invoice.create({
      data: {
        companyId: ctx.companyId,
        clientId:  clientRecord!.id,
        number:    invoiceNumber,
        type:      'SIMPLIFIED',
        status:    paymentMethod === 'DEBT' ? 'SENT' : 'PAID',
        issueDate: new Date(),
        subtotal,
        taxAmount,
        total,
        currency: 'DZD',
        notes,
        lines: {
          create: lines.map(l => ({
            productId:   l.productId,
            description: l.name,
            quantity:    l.quantity,
            unitPrice:   l.unitPrice,
            taxRate:     l.taxRate,
            total:       l.lineTotal,
          })),
        },
      },
    })

    // Decrement stock + movements
    for (const item of lines) {
      await tx.product.update({
        where: { id: item.productId },
        data:  { stockQty: { decrement: item.quantity } },
      })
      await tx.stockMovement.create({
        data: {
          companyId: ctx.companyId,
          productId: item.productId,
          type:      'OUT',
          quantity:  item.quantity,
          reference: `POS/${invoiceNumber}`,
          note:      'Vente caisse',
        },
      })
    }

    // Create PosSale
    const sale = await tx.posSale.create({
      data: {
        companyId:     ctx.companyId,
        sessionId:     session.id,
        invoiceId:     invoice.id,
        clientId:      clientRecord!.id,
        paymentMethod,
        subtotal,
        taxAmount,
        total,
        amountPaid,
        change,
      },
    })

    // If DEBT → create PosDebt
    let debt = null
    if (paymentMethod === 'DEBT') {
      debt = await tx.posDebt.create({
        data: {
          companyId:   ctx.companyId,
          clientId:    clientRecord!.id,
          saleId:      sale.id,
          invoiceId:   invoice.id,
          totalAmount: total,
          paidAmount:  0,
          dueDate:     dueDate ? new Date(dueDate) : null,
          notes,
        },
      })
    }

    // Update session running totals
    await tx.posSession.update({
      where: { id: session.id },
      data: {
        totalSales: { increment: total },
        totalCash:  { increment: paymentMethod === 'CASH' ? total : 0 },
        totalDebt:  { increment: paymentMethod === 'DEBT' ? total : 0 },
      },
    })

    return { sale, invoice, debt }
  })

  return apiSuccess({
    saleId:        result.sale.id,
    invoiceNumber,
    total,
    amountPaid,
    change,
    paymentMethod,
    debt: result.debt ? { id: result.debt.id, totalAmount: total } : null,
  }, 201)
}
