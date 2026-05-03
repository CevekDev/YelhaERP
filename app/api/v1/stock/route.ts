import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { withV1Auth, v1Success, v1Error } from '../_auth'

const querySchema = z.object({
  page:      z.coerce.number().int().positive().default(1),
  limit:     z.coerce.number().int().min(1).max(200).default(50),
  lowStock:  z.coerce.boolean().optional(),
  search:    z.string().max(100).optional(),
})

export async function GET(req: NextRequest) {
  return withV1Auth(req, async (ctx) => {
    const q = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams))
    if (!q.success) return v1Error('Paramètres invalides', 400, 'INVALID_PARAMS')

    const { page, limit, search } = q.data
    const where = {
      companyId: ctx.companyId,
      isActive: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { sku:  { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        select: { id: true, name: true, sku: true, unitPrice: true, stockQty: true, stockAlert: true, unit: true },
        orderBy: { name: 'asc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.product.count({ where }),
    ])

    const data = products.map(p => ({
      ...p,
      isLowStock: Number(p.stockQty) <= Number(p.stockAlert) && Number(p.stockAlert) > 0,
      isOutOfStock: Number(p.stockQty) <= 0,
    }))

    // Filter low stock if requested (after mapping)
    const filtered = q.data.lowStock ? data.filter(p => p.isLowStock || p.isOutOfStock) : data

    return v1Success(filtered, { page, limit, total, pages: Math.ceil(total / limit) })
  })
}
