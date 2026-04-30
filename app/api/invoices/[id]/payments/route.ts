import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { z } from 'zod'

const schema = z.object({
  amount: z.number().positive(),
  method: z.enum(['CCP_VIREMENT', 'CASH', 'BANK_TRANSFER', 'CHARGILY_EDAHABIA', 'CHARGILY_CIB']),
  reference: z.string().optional(),
  notes: z.string().optional(),
  paidAt: z.string().optional(),
})

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
    })
    if (!invoice) return apiError('Facture introuvable', 404)
    const payments = await prisma.invoicePayment.findMany({
      where: { invoiceId: params.id },
      orderBy: { paidAt: 'desc' },
    })
    return apiSuccess(payments)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non autorisé', 401)
    return apiError('Erreur serveur', 500, e)
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'ACCOUNTANT')

    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
      include: { payments: true },
    })
    if (!invoice) return apiError('Facture introuvable', 404)
    if (invoice.status === 'PAID') return apiError('Facture déjà payée', 400)

    let body: unknown
    try { body = await req.json() } catch { return apiError('Corps invalide', 400) }
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 400, parsed.error.flatten())

    const { amount, method, reference, notes, paidAt } = parsed.data

    const resolvedDate = paidAt ? new Date(paidAt) : new Date()
    if (isNaN(resolvedDate.getTime())) return apiError('Date de paiement invalide', 400)
    if (resolvedDate > new Date()) return apiError('La date de paiement ne peut pas être dans le futur', 400)

    const payment = await prisma.invoicePayment.create({
      data: {
        invoiceId: params.id,
        amount,
        method,
        reference: reference ?? null,
        notes: notes ?? null,
        paidAt: resolvedDate,
      },
    })

    // Recalculate paid total and update invoice status
    const allPayments = [...invoice.payments, payment]
    const paidTotal = allPayments.reduce((s, p) => s + Number(p.amount), 0)
    const invoiceTotal = Number(invoice.total)

    let newStatus: 'PAID' | 'PARTIAL' | 'SENT' = 'SENT'
    if (paidTotal >= invoiceTotal) newStatus = 'PAID'
    else if (paidTotal > 0) newStatus = 'PARTIAL'

    await prisma.invoice.update({
      where: { id: params.id },
      data: { status: newStatus },
    })

    return apiSuccess(payment, 201)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non autorisé', 401)
    if (e instanceof Error && e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    return apiError('Erreur serveur', 500, e)
  }
}
