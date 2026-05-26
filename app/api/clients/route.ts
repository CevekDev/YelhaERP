import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiSuccess, apiError } from '@/lib/security/api-response'

export async function GET(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx) return apiError('Non autorisé', 401)

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search') ?? ''
  const limit  = Math.min(100, parseInt(searchParams.get('limit') ?? '20'))

  const where: Record<string, unknown> = { userId: ctx.userId }
  if (search) {
    where.OR = [
      { name:      { contains: search, mode: 'insensitive' } },
      { firstName: { contains: search, mode: 'insensitive' } },
      { phone:     { contains: search } },
      { email:     { contains: search, mode: 'insensitive' } },
    ]
  }

  const clients = await prisma.client.findMany({
    where,
    take: limit,
    orderBy: { name: 'asc' },
    select: {
      id: true, name: true, firstName: true, phone: true, email: true, wilaya: true,
      subscriptions: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, status: true, startDate: true, nextBilling: true, clientEmail: true,
          plan: { select: { id: true, name: true, price: true, interval: true, intervalCount: true } },
        },
      },
    },
  })

  return apiSuccess({ clients })
}
