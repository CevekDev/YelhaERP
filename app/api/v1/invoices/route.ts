import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { withV1Auth, v1Success, v1Error } from '../_auth'

const querySchema = z.object({
  page:     z.coerce.number().int().positive().default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(20),
  status:   z.enum(['DRAFT','SENT','PAID','PARTIAL','OVERDUE','CANCELLED']).optional(),
  clientId: z.string().optional(),
  from:     z.string().datetime().optional(),
  to:       z.string().datetime().optional(),
})

export async function GET(req: NextRequest) {
  return withV1Auth(req, async (ctx) => {
    const q = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams))
    if (!q.success) return v1Error('Paramètres invalides', 400, 'INVALID_PARAMS')

    const { page, limit, status, clientId, from, to } = q.data
    const where = {
      companyId: ctx.companyId,
      ...(status && { status }),
      ...(clientId && { clientId }),
      ...(from || to ? { issueDate: { ...(from && { gte: new Date(from) }), ...(to && { lte: new Date(to) }) } } : {}),
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        select: {
          id: true, number: true, type: true, status: true,
          issueDate: true, dueDate: true,
          subtotal: true, taxAmount: true, total: true, currency: true,
          client: { select: { id: true, name: true, email: true } },
          createdAt: true, updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.invoice.count({ where }),
    ])

    return v1Success(invoices, { page, limit, total, pages: Math.ceil(total / limit) })
  })
}
