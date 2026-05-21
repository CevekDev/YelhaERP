import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

const updatePlanSchema = z.object({
  userId: z.string().cuid(),
  plan: z.enum(['TRIAL', 'STARTER', 'PRO', 'AGENCY', 'BUSINESS', 'ENTERPRISE']),
  trialEndsAt: z.string().datetime().optional(),
})

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    await requireSuperAdmin(req)

    const { searchParams } = req.nextUrl
    const page = Math.max(1, Number(searchParams.get('page') ?? 1))
    const search = searchParams.get('search') ?? ''
    const statusFilter = searchParams.get('status') ?? ''
    const limit = 25

    const where: Record<string, unknown> = { isSuperAdmin: false }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (statusFilter) where.yelhaSubscription = { status: statusFilter }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, plan: true, trialEndsAt: true,
          createdAt: true, isBanned: true, isPartner: true,
          _count: { select: { subscriptions: true } },
          yelhaSubscription: {
            select: {
              id: true, status: true, planId: true, monthlyAmount: true,
              billingCycle: true, currentPeriodEnd: true,
              usageEmails: true, usageApiReq: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.user.count({ where }),
    ])

    return apiSuccess({ companies: users, total, page, limit })
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}

export async function PATCH(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    await requireSuperAdmin(req)

    let body: unknown
    try { body = await req.json() } catch { return apiError('Corps invalide', 400) }
    const parsed = updatePlanSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422)

    const { userId, plan, trialEndsAt } = parsed.data
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { plan, ...(trialEndsAt && { trialEndsAt: new Date(trialEndsAt) }) },
    })
    return apiSuccess(updated)
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
