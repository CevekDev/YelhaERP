import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { withV1Auth, v1Success, v1Error, requireWriteScope } from '../_auth'
import { dispatchWebhook } from '@/lib/webhooks/dispatch'

const SORT_FIELDS = ['createdAt', 'name', 'updatedAt'] as const

const querySchema = z.object({
  page:      z.coerce.number().int().positive().default(1),
  limit:     z.coerce.number().int().min(1).max(100).default(20),
  search:    z.string().max(100).optional(),
  type:      z.enum(['COMPANY','INDIVIDUAL']).optional(),
  sortBy:    z.enum(SORT_FIELDS).default('name'),
  sortOrder: z.enum(['asc','desc']).default('asc'),
})

const createSchema = z.object({
  clientType:  z.enum(['COMPANY','INDIVIDUAL']).default('COMPANY'),
  name:        z.string().min(2).max(200).trim(),
  firstName:   z.string().max(100).trim().optional().nullable(),
  email:       z.string().email().optional().nullable(),
  phone:       z.string().max(20).optional().nullable(),
  address:     z.string().max(500).optional().nullable(),
  wilaya:      z.string().max(100).optional().nullable(),
  nif:         z.string().max(20).optional().nullable(),
  nis:         z.string().max(20).optional().nullable(),
  rc:          z.string().max(30).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
})

export async function GET(req: NextRequest) {
  return withV1Auth(req, async (ctx) => {
    const q = querySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams))
    if (!q.success) return v1Error('Paramètres invalides', 400, 'INVALID_PARAMS')

    const { page, limit, search, type, sortBy, sortOrder } = q.data
    const where = {
      companyId: ctx.companyId,
      ...(type && { clientType: type }),
      ...(search && {
        OR: [
          { name:  { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { nif:   { contains: search } },
        ],
      }),
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        select: {
          id: true, clientType: true, name: true, firstName: true,
          email: true, phone: true, address: true, wilaya: true,
          nif: true, createdAt: true, updatedAt: true,
          _count: { select: { invoices: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.client.count({ where }),
    ])

    const pages = Math.ceil(total / limit)
    return v1Success(clients, { page, limit, total, pages, hasNext: page < pages, hasPrev: page > 1 })
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

    const client = await prisma.client.create({
      data: { ...parsed.data, companyId: ctx.companyId },
      select: {
        id: true, clientType: true, name: true, firstName: true,
        email: true, phone: true, address: true, wilaya: true,
        nif: true, createdAt: true,
      },
    })

    dispatchWebhook(ctx.companyId, 'client.created', client as unknown as Record<string, unknown>)

    return v1Success(client)
  })
}
