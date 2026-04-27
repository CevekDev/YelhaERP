import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { createInvoiceSchema, invoiceQuerySchema } from '@/lib/validations/invoice'
import { generateInvoiceNumber } from '@/lib/algerian/format'

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)

  try {
    const ctx = await getTenantContext()
    const { searchParams } = req.nextUrl
    const query = invoiceQuerySchema.safeParse(Object.fromEntries(searchParams))
    if (!query.success) return apiError('Paramètres invalides', 400)

    const { page, limit, status, clientId, from, to, cursor } = query.data
    const skip = cursor ? undefined : (page - 1) * limit

    const where = {
      companyId: ctx.companyId,
      ...(status && { status }),
      ...(clientId && { clientId }),
      ...(from || to ? { issueDate: { ...(from && { gte: new Date(from) }), ...(to && { lte: new Date(to) }) } } : {}),
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          client: { select: { id: true, name: true } },
          lines: { select: { id: true, description: true, quantity: true, unitPrice: true, taxRate: true, total: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      }),
      prisma.invoice.count({ where }),
    ])

    return apiSuccess({ invoices, total, page, limit, pages: Math.ceil(total / limit) })
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
    requireRole(ctx.role, 'ACCOUNTANT')

    let body: unknown
    try { body = await req.json() } catch { return apiError('Corps invalide', 400) }

    const parsed = createInvoiceSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422, parsed.error.flatten())

    // Vérifier que le client appartient bien à la company
    const client = await prisma.client.findFirst({
      where: { id: parsed.data.clientId, companyId: ctx.companyId },
    })
    if (!client) return apiError('Client introuvable', 404)

    // Générer le numéro de facture
    const count = await prisma.invoice.count({ where: { companyId: ctx.companyId } })
    const prefix = parsed.data.type === 'CREDIT_NOTE' ? 'AV' : 'FAC'
    const number = generateInvoiceNumber(prefix, count + 1)

    // Calculer les totaux
    let subtotal = 0
    let taxAmount = 0
    const lines = parsed.data.lines.map(line => {
      const lineTotal = line.quantity * line.unitPrice
      const lineTax = lineTotal * (line.taxRate / 100)
      subtotal += lineTotal
      taxAmount += lineTax
      return {
        ...line,
        total: lineTotal + lineTax,
      }
    })
    const total = subtotal + taxAmount

    const invoice = await prisma.invoice.create({
      data: {
        companyId: ctx.companyId,
        clientId: parsed.data.clientId,
        number,
        type: parsed.data.type,
        issueDate: new Date(parsed.data.issueDate),
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        currency: parsed.data.currency,
        notes: parsed.data.notes,
        subtotal,
        taxAmount,
        total,
        lines: { create: lines },
      },
      include: { client: true, lines: true },
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
