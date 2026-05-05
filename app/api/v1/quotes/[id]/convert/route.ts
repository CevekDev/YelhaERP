import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { withV1Auth, v1Success, v1Error, requireWriteScope } from '../../../_auth'
import { dispatchWebhook } from '@/lib/webhooks/dispatch'
import { generateInvoiceNumber } from '@/lib/algerian/format'

const convertSchema = z.object({
  issueDate: z.string().datetime().optional(),
  dueDate:   z.string().datetime().optional().nullable(),
  type:      z.enum(['STANDARD','PROFORMA']).default('STANDARD'),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  return withV1Auth(req, async (ctx) => {
    const writeErr = requireWriteScope(ctx)
    if (writeErr) return writeErr

    const quote = await prisma.quote.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
      include: { lines: true },
    })
    if (!quote) return v1Error('Devis introuvable', 404, 'NOT_FOUND')
    if (quote.status === 'CONVERTED') return v1Error('Ce devis est déjà converti en facture', 409, 'CONFLICT')
    if (!['ACCEPTED', 'SENT', 'DRAFT'].includes(quote.status)) {
      return v1Error('Seuls les devis DRAFT, SENT ou ACCEPTED peuvent être convertis', 422, 'VALIDATION_ERROR')
    }

    let body: unknown = {}
    try { body = await req.json() } catch { /* body is optional */ }
    const parsed = convertSchema.safeParse(body)
    if (!parsed.success) return v1Error('Données invalides', 422, 'VALIDATION_ERROR')

    const count = await prisma.invoice.count({ where: { companyId: ctx.companyId } })
    const invoiceNumber = generateInvoiceNumber('FAC', count + 1)

    const invoice = await prisma.$transaction(async (tx) => {
      // Mark quote as converted
      await tx.quote.update({
        where: { id: params.id },
        data:  { status: 'CONVERTED' },
      })

      // Create invoice from quote
      return tx.invoice.create({
        data: {
          companyId: ctx.companyId,
          clientId:  quote.clientId,
          quoteId:   quote.id,
          number:    invoiceNumber,
          type:      parsed.data.type,
          issueDate: parsed.data.issueDate ? new Date(parsed.data.issueDate) : new Date(),
          dueDate:   parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
          currency:  quote.currency,
          notes:     quote.notes,
          subtotal:  quote.subtotal,
          taxAmount: quote.taxAmount,
          total:     quote.total,
          lines: {
            create: quote.lines.map(line => ({
              productId:   line.productId,
              description: line.description,
              quantity:    line.quantity,
              unitPrice:   line.unitPrice,
              taxRate:     line.taxRate,
              total:       line.total,
            })),
          },
        },
        include: {
          client: { select: { id: true, name: true, email: true } },
          lines:  true,
        },
      })
    })

    dispatchWebhook(ctx.companyId, 'quote.converted', {
      quoteId: params.id,
      invoice: invoice as unknown as Record<string, unknown>,
    })

    return v1Success({ quote: { id: params.id, status: 'CONVERTED' }, invoice })
  })
}
