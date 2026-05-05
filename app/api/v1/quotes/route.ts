import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { withV1Auth, v1Success, v1Error, requireWriteScope } from '../_auth'
import { dispatchWebhook } from '@/lib/webhooks/dispatch'

const SORT_FIELDS = ['createdAt', 'issueDate', 'expiryDate', 'total', 'number'] as const

const querySchema = z.object({
  page:      z.coerce.number().int().positive().default(1),
  limit:     z.coerce.number().int().min(1).max(100).default(20),
  status:    z.enum(['DRAFT','SENT','ACCEPTED','REJECTED','EXPIRED','CONVERTED']).optional(),
  clientId:  z.string().optional(),
  sortBy:    z.enum(SORT_FIELDS).default('createdAt'),
  sortOrder: z.enum(['asc','desc']).default('desc'),
})

const quoteLineSchema = z.object({
  productId:   z.string().cuid().optional().nullable(),
  description: z.string().min(1).max(500).trim(),
  quantity:    z.number().positive().max(999999),
  unitPrice:   z.number().min(0).max(99999999),
  taxRate:     z.number().min(0).max(100).default(19),
})

const createSchema = z.object({
  clientId:   z.string().cuid(),
  issueDate:  z.string().datetime(),
  expiryDate: z.string().datetime().optional().nullable(),
  notes:      z.string().max(2000).optional().nullable(),
  currency:   z.string().length(3).default('DZD'),
  lines:      z.array(quoteLineSchema).min(1).max(100),
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

export async function GET(req: NextRequest) {
  return withV1Auth(req, async (ctx) => {
    const q = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams))
    if (!q.success) return v1Error('Paramètres invalides', 400, 'INVALID_PARAMS')

    const { page, limit, status, clientId, sortBy, sortOrder } = q.data
    const where = {
      companyId: ctx.companyId,
      ...(status   && { status }),
      ...(clientId && { clientId }),
    }

    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({
        where,
        select: {
          id: true, number: true, status: true,
          issueDate: true, expiryDate: true,
          subtotal: true, taxAmount: true, total: true, currency: true,
          client: { select: { id: true, name: true } },
          createdAt: true, updatedAt: true,
        },
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.quote.count({ where }),
    ])

    const pages = Math.ceil(total / limit)
    return v1Success(quotes, { page, limit, total, pages, hasNext: page < pages, hasPrev: page > 1 })
  })
}

export async function POST(req: NextRequest) {
  return withV1Auth(req, async (ctx) => {
    const writeErr = requireWriteScope(ctx)
    if (writeErr) return writeErr

    let body: unknown
    try { body = await req.json() } catch { return v1Error('Corps JSON invalide', 400, 'INVALID_BODY') }

    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return v1Error('Données invalides', 422, 'VALIDATION_ERROR')

    const client = await prisma.client.findFirst({ where: { id: parsed.data.clientId, companyId: ctx.companyId } })
    if (!client) return v1Error('Client introuvable', 404, 'NOT_FOUND')

    const count = await prisma.quote.count({ where: { companyId: ctx.companyId } })
    const number = `DV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`

    const { lines, subtotal, taxAmount, total } = computeTotals(parsed.data.lines)

    const quote = await prisma.quote.create({
      data: {
        companyId:  ctx.companyId,
        clientId:   parsed.data.clientId,
        number,
        issueDate:  new Date(parsed.data.issueDate),
        expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null,
        notes:      parsed.data.notes,
        currency:   parsed.data.currency,
        subtotal,
        taxAmount,
        total,
        lines: { create: lines },
      },
      include: {
        client: { select: { id: true, name: true, email: true } },
        lines:  true,
      },
    })

    return v1Success(quote)
  })
}
