import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { z } from 'zod'

const lineSchema = z.object({
  description: z.string(),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  taxRate: z.number().min(0).max(100).default(19),
})

const schema = z.object({
  supplierId: z.string(),
  purchaseOrderId: z.string().optional(),
  receiptId: z.string().optional(),
  number: z.string().min(1),
  invoiceDate: z.string(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(lineSchema).min(1),
})

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    const invoices = await prisma.supplierInvoice.findMany({
      where: { companyId: ctx.companyId },
      include: { supplier: { select: { name: true } }, lines: true },
      orderBy: { invoiceDate: 'desc' },
    })
    return apiSuccess(invoices)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non autorisé', 401)
    return apiError('Erreur serveur', 500, e)
  }
}

export async function POST(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'ACCOUNTANT')
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 400, parsed.error.flatten())

    const { supplierId, purchaseOrderId, receiptId, number, invoiceDate, dueDate, notes, lines } = parsed.data

    const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0)
    const taxAmount = lines.reduce((s, l) => s + (l.quantity * l.unitPrice * l.taxRate / 100), 0)
    const total = subtotal + taxAmount

    const invoice = await prisma.supplierInvoice.create({
      data: {
        companyId: ctx.companyId,
        supplierId,
        purchaseOrderId: purchaseOrderId ?? null,
        receiptId: receiptId ?? null,
        number,
        invoiceDate: new Date(invoiceDate),
        dueDate: dueDate ? new Date(dueDate) : null,
        notes: notes ?? null,
        subtotal,
        taxAmount,
        total,
        status: 'PENDING',
        lines: {
          create: lines.map(l => ({
            description: l.description,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            taxRate: l.taxRate,
            total: l.quantity * l.unitPrice * (1 + l.taxRate / 100),
          })),
        },
      },
      include: { lines: true },
    })
    return apiSuccess(invoice, 201)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non autorisé', 401)
    if (e instanceof Error && e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    return apiError('Erreur serveur', 500, e)
  }
}
