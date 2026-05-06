import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

export async function GET(req: NextRequest) {
  const rl = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!rl.success) return rateLimitResponse(rl.reset)

  let ctx
  try {
    ctx = await getTenantContext()
  } catch (e) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    throw e
  }

  const { searchParams } = new URL(req.url)
  const phone = searchParams.get('phone')

  if (!phone) return apiError('Paramètre phone requis', 400)

  const client = await prisma.loyaltyClient.findFirst({
    where: { companyId: ctx.companyId, phone },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      points: true,
      tier: true,
      totalSpent: true,
      visitsCount: true,
      qrCode: true,
      joinedAt: true,
      lastVisit: true,
      isActive: true,
    },
  })

  if (!client) return apiError('Client introuvable', 404)

  return apiSuccess(client)
}
