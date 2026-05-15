import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withSubApi, ok, apiError } from '@/lib/sub-api/auth'

export const dynamic = 'force-dynamic'

const createSchema = z.object({
  name:       z.string().min(1).max(200),
  firstName:  z.string().max(100).optional(),
  phone:      z.string().max(30).optional(),
  email:      z.string().email().optional(),
  wilaya:     z.string().max(100).optional(),
  address:    z.string().max(300).optional(),
  clientType: z.enum(['COMPANY', 'INDIVIDUAL']).default('INDIVIDUAL'),
})

export async function GET(req: NextRequest) {
  return withSubApi(req, async (ctx) => {
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '50'))
    const search = searchParams.get('search')?.trim()

    const where: Record<string, unknown> = { companyId: ctx.companyId }
    if (search) {
      where.OR = [
        { name:      { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { email:     { contains: search, mode: 'insensitive' } },
        { phone:     { contains: search } },
      ]
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: { id: true, name: true, firstName: true, phone: true, email: true, wilaya: true, address: true, clientType: true, createdAt: true },
      }),
      prisma.client.count({ where }),
    ])
    return ok({ data: clients, meta: { total, page, limit } })
  })
}

export async function POST(req: NextRequest) {
  return withSubApi(req, async (ctx) => {
    let body: unknown
    try { body = await req.json() } catch { return apiError('Corps invalide', 400, 'BAD_BODY') }
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422, 'VALIDATION_ERROR')

    const client = await prisma.client.create({
      data: { companyId: ctx.companyId, ...parsed.data },
      select: { id: true, name: true, firstName: true, phone: true, email: true, wilaya: true, address: true, clientType: true, createdAt: true },
    })
    return ok({ data: client }, 201)
  })
}
