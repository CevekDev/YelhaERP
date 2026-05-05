import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { withV1Auth, v1Success, v1Error, requireWriteScope } from '../_auth'

const SORT_FIELDS = ['name', 'createdAt', 'unitPrice', 'stockQty'] as const

const querySchema = z.object({
  page:      z.coerce.number().int().positive().default(1),
  limit:     z.coerce.number().int().min(1).max(100).default(20),
  search:    z.string().max(100).optional(),
  active:    z.coerce.boolean().optional(),
  sortBy:    z.enum(SORT_FIELDS).default('name'),
  sortOrder: z.enum(['asc','desc']).default('asc'),
})

const createSchema = z.object({
  name:        z.string().min(1).max(200).trim(),
  sku:         z.string().max(50).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
  unitPrice:   z.number().min(0).max(99999999),
  taxRate:     z.number().min(0).max(100).default(19),
  stockAlert:  z.number().min(0).default(0),
  unit:        z.string().max(20).optional().nullable(),
})

export async function GET(req: NextRequest) {
  return withV1Auth(req, async (ctx) => {
    const q = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams))
    if (!q.success) return v1Error('Paramètres invalides', 400, 'INVALID_PARAMS')

    const { page, limit, search, active, sortBy, sortOrder } = q.data
    const where = {
      companyId: ctx.companyId,
      ...(active !== undefined && { isActive: active }),
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
        select: {
          id: true, name: true, sku: true, description: true,
          unitPrice: true, taxRate: true, stockQty: true, stockAlert: true,
          unit: true, isActive: true, createdAt: true, updatedAt: true,
        },
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.product.count({ where }),
    ])

    const pages = Math.ceil(total / limit)
    return v1Success(
      products.map(p => ({
        ...p,
        isLowStock: Number(p.stockQty) <= Number(p.stockAlert) && Number(p.stockAlert) > 0,
      })),
      { page, limit, total, pages, hasNext: page < pages, hasPrev: page > 1 }
    )
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

    // Check SKU uniqueness
    if (parsed.data.sku) {
      const exists = await prisma.product.findFirst({
        where: { companyId: ctx.companyId, sku: parsed.data.sku },
      })
      if (exists) return v1Error('Un produit avec ce SKU existe déjà', 409, 'CONFLICT')
    }

    const product = await prisma.product.create({
      data: { ...parsed.data, companyId: ctx.companyId },
      select: {
        id: true, name: true, sku: true, description: true,
        unitPrice: true, taxRate: true, stockQty: true, stockAlert: true,
        unit: true, isActive: true, createdAt: true,
      },
    })

    return v1Success(product)
  })
}
