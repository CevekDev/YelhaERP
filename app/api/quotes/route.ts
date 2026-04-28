import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { createQuoteSchema, quoteQuerySchema } from '@/lib/validations/quote'

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    const { searchParams } = req.nextUrl
    const query = quoteQuerySchema.safeParse(Object.fromEntries(searchParams))
    if (!query.success) return apiError('Paramètres invalides', 400)

    const { page, limit, status, clientId } = query.data
    const where = {
      companyId: ctx.companyId,
      ...(status && { status: status as never }),
      ...(clientId && { clientId }),
    }

    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({
        where,
        include: { client: { select: { id: true, name: true } }, lines: true },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.quote.count({ where }),
    ])

    return apiSuccess({ quotes, total, page, limit })
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
    requireRole(ctx.role, 'EMPLOYEE')

    let body: unknown
    try { body = await req.json() } catch { return apiError('Corps invalide', 400) }

    const parsed = createQuoteSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422, parsed.error.flatten())

    const client = await prisma.client.findFirst({
      where: { id: parsed.data.clientId, companyId: ctx.companyId },
    })
    if (!client) return apiError('Client introuvable', 404)

    const year = new Date().getFullYear()
    const count = await prisma.quote.count({ where: { companyId: ctx.companyId } })
    const number = `DEV-${year}-${String(count + 1).padStart(4, '0')}`

    let subtotal = 0
    let taxAmount = 0
    const lines = parsed.data.lines.map(line => {
      const lineHT = line.quantity * line.unitPrice
      const lineTax = lineHT * (line.taxRate / 100)
      subtotal += lineHT
      taxAmount += lineTax
      return { ...line, total: lineHT + lineTax }
    })

    const quote = await prisma.quote.create({
      data: {
        companyId: ctx.companyId,
        clientId: parsed.data.clientId,
        number,
        issueDate: new Date(parsed.data.issueDate),
        expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null,
        notes: parsed.data.notes,
        subtotal,
        taxAmount,
        total: subtotal + taxAmount,
        lines: { create: lines },
      },
      include: { client: true, lines: true },
    })

    return apiSuccess(quote, 201)
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
