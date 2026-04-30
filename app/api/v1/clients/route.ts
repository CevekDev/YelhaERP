import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { withV1Auth, v1Success, v1Error } from '../_auth'

const querySchema = z.object({
  page:   z.coerce.number().int().positive().default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
  type:   z.enum(['COMPANY','INDIVIDUAL']).optional(),
})

export async function GET(req: NextRequest) {
  return withV1Auth(req, async (ctx) => {
    const q = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams))
    if (!q.success) return v1Error('Paramètres invalides', 400, 'INVALID_PARAMS')

    const { page, limit, search, type } = q.data
    const where = {
      companyId: ctx.companyId,
      ...(type && { clientType: type }),
      ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        select: {
          id: true, clientType: true, name: true, firstName: true,
          email: true, phone: true, address: true, wilaya: true,
          nif: true, createdAt: true,
          _count: { select: { invoices: true } },
        },
        orderBy: { name: 'asc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.client.count({ where }),
    ])

    return v1Success(clients, { page, limit, total, pages: Math.ceil(total / limit) })
  })
}
