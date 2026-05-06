import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { incrementUsage } from '@/lib/billing/check-limit'

const postSchema = z.object({
  key: z.enum(['emails', 'apiRequests', 'ai']),
})

export async function GET(req: NextRequest) {
  try {
    const rl = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
    if (!rl.success) return rateLimitResponse(rl.reset)

    const { companyId } = await getTenantContext()

    const sub = await prisma.yelhaSubscription.findUnique({
      where: { companyId },
      select: {
        usageEmails:  true,
        usageApiReq:  true,
        usageAiReq:   true,
        limitEmails:  true,
        limitApiReq:  true,
        limitAiReq:   true,
        usageResetAt: true,
      },
    })

    if (!sub) return apiError('Abonnement introuvable', 404)

    return apiSuccess({
      usage: {
        emails: {
          current: sub.usageEmails,
          limit:   sub.limitEmails,
          remaining: sub.limitEmails === -1 ? null : Math.max(0, sub.limitEmails - sub.usageEmails),
        },
        apiRequests: {
          current: sub.usageApiReq,
          limit:   sub.limitApiReq,
          remaining: sub.limitApiReq === -1 ? null : Math.max(0, sub.limitApiReq - sub.usageApiReq),
        },
        ai: {
          current: sub.usageAiReq,
          limit:   sub.limitAiReq,
          remaining: sub.limitAiReq === -1 ? null : Math.max(0, sub.limitAiReq - sub.usageAiReq),
        },
      },
      resetAt: sub.usageResetAt,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur'
    if (msg === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500, err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const rl = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
    if (!rl.success) return rateLimitResponse(rl.reset)

    const { companyId } = await getTenantContext()

    const body = await req.json()
    const parsed = postSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422, parsed.error.flatten())

    await incrementUsage(companyId, parsed.data.key)

    return apiSuccess({ incremented: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erreur'
    if (msg === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500, err)
  }
}
