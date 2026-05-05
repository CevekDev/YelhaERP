import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { withV1Auth, v1Success, v1Error, requireWriteScope } from '../../_auth'
import { dispatchWebhook } from '@/lib/webhooks/dispatch'

const quoteLineSchema = z.object({
  productId:   z.string().cuid().optional().nullable(),
  description: z.string().min(1).max(500).trim(),
  quantity:    z.number().positive().max(999999),
  unitPrice:   z.number().min(0).max(99999999),
  taxRate:     z.number().min(0).max(100).default(19),
})

const updateSchema = z.object({
  status:     z.enum(['DRAFT','SENT','ACCEPTED','REJECTED','EXPIRED']).optional(),
  expiryDate: z.string().datetime().optional().nullable(),
  notes:      z.string().max(2000).optional().nullable(),
  currency:   z.string().length(3).optional(),
  lines:      z.array(quoteLineSchema).min(1).max(100).optional(),
})

function computeTotals(lines: z.infer<typeof quoteLineSchema>[]) {
  let subtotal = 0
  let taxAmount = 0
  const computed = lines.map(line => {
    const lineTotal = line.quantity * line.unitPrice
    const lineTax = lineTotal * (line.taxRate / 100)
    subtotal += lineTotal
    taxAmount += lineTax
    return { ...line, total: lineTotal + lineTax }
  })
  return { lines: computed, subtotal, taxAmount, total: subtotal + taxAmount }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return withV1Auth(req, async (ctx) => {
    const quote = await prisma.quote.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
      include: {
        client: { select: { id: true, name: true, email: true, phone: true, address: true, wilaya: true } },
        lines:  { select: { id: true, description: true, quantity: true, unitPrice: true, taxRate: true, total: true } },
      },
    })
    if (!quote) return v1Error('Devis introuvable', 404, 'NOT_FOUND')
    return v1Success(quote)
  })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  return withV1Auth(req, async (ctx) => {
    const writeErr = requireWriteScope(ctx)
    if (writeErr) return writeErr

    const existing = await prisma.quote.findFirst({ where: { id: params.id, companyId: ctx.companyId } })
    if (!existing) return v1Error('Devis introuvable', 404, 'NOT_FOUND')
    if (existing.status === 'CONVERTED') return v1Error('Impossible de modifier un devis déjà converti', 409, 'CONFLICT')

    let body: unknown
    try { body = await req.json() } catch { return v1Error('Corps JSON invalide', 400, 'INVALID_BODY') }

    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return v1Error('Données invalides', 422, 'VALIDATION_ERROR')

    const { lines: rawLines, status, expiryDate, notes, currency } = parsed.data

    let lineData: Record<string, unknown> | undefined
    let subtotal: number | undefined
    let taxAmount: number | undefined
    let total: number | undefined

    if (rawLines) {
      const computed = computeTotals(rawLines)
      subtotal = computed.subtotal
      taxAmount = computed.taxAmount
      total = computed.total
      lineData = { deleteMany: {}, create: computed.lines }
    }

    const quote = await prisma.quote.update({
      where: { id: params.id },
      data: {
        ...(status     !== undefined && { status }),
        ...(expiryDate !== undefined && { expiryDate: expiryDate ? new Date(expiryDate) : null }),
        ...(notes      !== undefined && { notes }),
        ...(currency   !== undefined && { currency }),
        ...(subtotal   !== undefined && { subtotal, taxAmount, total }),
        ...(lineData   !== undefined && { lines: lineData }),
      },
      include: {
        client: { select: { id: true, name: true, email: true } },
        lines:  true,
      },
    })

    // Fire appropriate webhook
    if (status === 'ACCEPTED') dispatchWebhook(ctx.companyId, 'quote.accepted', quote as unknown as Record<string, unknown>)
    else if (status === 'REJECTED') dispatchWebhook(ctx.companyId, 'quote.rejected', quote as unknown as Record<string, unknown>)

    return v1Success(quote)
  })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return withV1Auth(req, async (ctx) => {
    const writeErr = requireWriteScope(ctx)
    if (writeErr) return writeErr

    const existing = await prisma.quote.findFirst({ where: { id: params.id, companyId: ctx.companyId } })
    if (!existing) return v1Error('Devis introuvable', 404, 'NOT_FOUND')
    if (existing.status === 'CONVERTED') return v1Error('Impossible de supprimer un devis converti en facture', 409, 'CONFLICT')

    await prisma.quote.delete({ where: { id: params.id } })

    return v1Success({ id: params.id, deleted: true })
  })
}
