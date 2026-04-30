import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    const invoice = await prisma.supplierInvoice.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
      include: {
        supplier: { select: { name: true } },
        lines: true,
        purchaseOrder: { include: { lines: true } },
        receipt: { include: { lines: true } },
      },
    })
    if (!invoice) return apiError('Facture introuvable', 404)
    return apiSuccess({
      invoice: {
        id: invoice.id,
        number: invoice.number,
        invoiceDate: invoice.invoiceDate,
        total: invoice.total,
        supplier: invoice.supplier,
        lines: invoice.lines,
      },
      purchaseOrder: invoice.purchaseOrder ?? undefined,
      goodsReceipt: invoice.receipt ?? undefined,
    })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non autorisé', 401)
    return apiError('Erreur serveur', 500, e)
  }
}
