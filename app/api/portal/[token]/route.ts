import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, PUBLIC_RATE_LIMIT } from '@/lib/security/ratelimit'

// Route publique — pas d'auth requise
export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const { success, reset } = await rateLimit(req, PUBLIC_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)

  const invoice = await prisma.invoice.findUnique({
    where: { portalToken: params.token },
    include: {
      client: { select: { name: true, email: true, phone: true, address: true } },
      lines: true,
      company: {
        select: {
          name: true, nif: true, nis: true, rc: true, address: true,
          wilaya: true, phone: true, email: true, legalForm: true,
        },
      },
    },
  })

  if (!invoice) return apiError('Lien invalide ou expiré', 404)

  // Ne pas exposer de données sensibles
  return apiSuccess({
    number: invoice.number,
    type: invoice.type,
    status: invoice.status,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    subtotal: invoice.subtotal,
    taxAmount: invoice.taxAmount,
    total: invoice.total,
    currency: invoice.currency,
    notes: invoice.notes,
    client: invoice.client,
    lines: invoice.lines,
    company: invoice.company,
  })
}
