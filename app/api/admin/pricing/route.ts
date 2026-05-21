import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { PLANS } from '@/lib/pricing/config'

const PRICING_CONFIG_KEY = 'pricing'

const pricingSchema = z.object({
  plans: z.record(z.number().int().min(0)),
})

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    await requireSuperAdmin(req)

    const config = await prisma.systemConfig.findUnique({ where: { key: PRICING_CONFIG_KEY } })

    const defaults = {
      plans: Object.fromEntries(
        Object.entries(PLANS).filter(([id]) => id !== 'trial').map(([id, p]) => [id, p.price])
      ),
    }

    const overrides = config?.value as { plans?: Record<string, number> } ?? {}

    return apiSuccess({
      defaults,
      overrides: { plans: overrides.plans ?? {} },
      effective: {
        plans: { ...defaults.plans, ...(overrides.plans ?? {}) },
      },
    })
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}

export async function PUT(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    await requireSuperAdmin(req)

    let body: unknown
    try { body = await req.json() } catch { return apiError('Corps invalide', 400) }
    const parsed = pricingSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422)

    await prisma.systemConfig.upsert({
      where: { key: PRICING_CONFIG_KEY },
      update: { value: parsed.data },
      create: { key: PRICING_CONFIG_KEY, value: parsed.data },
    })

    return apiSuccess({ saved: true })
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
