import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { generateInvoiceNumber } from '@/lib/algerian/format'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'ACCOUNTANT')

    const quote = await prisma.quote.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
      include: { lines: true },
    })
    if (!quote) return apiError('Devis introuvable', 404)
    if (quote.status === 'CONVERTED') return apiError('Devis déjà converti', 409)
    if (quote.status === 'REJECTED') return apiError('Impossible de convertir un devis rejeté', 409)

    const count = await prisma.invoice.count({ where: { companyId: ctx.companyId } })
    const number = generateInvoiceNumber('FAC', count + 1)

    const invoice = await prisma.$transaction(async tx => {
      const inv = await tx.invoice.create({
        data: {
          companyId: ctx.companyId,
          clientId: quote.clientId,
          number,
          type: 'STANDARD',
          issueDate: new Date(),
          dueDate: null,
          subtotal: quote.subtotal,
          taxAmount: quote.taxAmount,
          total: quote.total,
          notes: quote.notes,
          quoteId: quote.id,
          lines: {
            create: quote.lines.map(l => ({
              productId: l.productId,
              description: l.description,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              taxRate: l.taxRate,
              total: l.total,
            })),
          },
        },
        include: { client: true, lines: true },
      })

      await tx.quote.update({
        where: { id: quote.id },
        data: { status: 'CONVERTED' },
      })

      return inv
    })

    return apiSuccess(invoice, 201)
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
