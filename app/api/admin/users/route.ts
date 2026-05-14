import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    await requireSuperAdmin()

    const { searchParams } = req.nextUrl
    const page  = Math.max(1, Number(searchParams.get('page') ?? 1))
    const search = searchParams.get('search') ?? ''
    const limit = 30

    const where: Record<string, unknown> = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, role: true, createdAt: true,
          company: {
            select: {
              id: true, name: true, plan: true, isBanned: true, isPartner: true,
              appSubscriptions: {
                where: { status: { in: ['ACTIVE', 'TRIAL'] } },
                select: { appId: true, status: true, planId: true, currentPeriodEnd: true },
              },
              yelhaSubscription: { select: { status: true, monthlyAmount: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.user.count({ where }),
    ])

    return apiSuccess({ users, total, page, limit })
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
