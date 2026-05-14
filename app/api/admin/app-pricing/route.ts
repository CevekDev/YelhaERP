import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { APP_PLANS } from '@/lib/pricing/app-plans'

export const dynamic = 'force-dynamic'

const APP_PLANS_CONFIG_PREFIX = 'app_pricing_'

const pricingSchema = z.object({
  appId: z.string(),
  prices: z.record(z.number().int().min(0)),
})

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    await requireSuperAdmin()

    const result: Record<string, { defaults: Record<string, number>; overrides: Record<string, number>; effective: Record<string, number> }> = {}

    for (const [appId, config] of Object.entries(APP_PLANS)) {
      const dbConfig = await prisma.systemConfig.findUnique({
        where: { key: `${APP_PLANS_CONFIG_PREFIX}${appId}` },
      })
      const overrides = (dbConfig?.value as Record<string, number> | null) ?? {}
      const defaults: Record<string, number> = {}
      for (const [planId, plan] of Object.entries(config.plans)) {
        defaults[planId] = (plan as { price: number }).price
      }
      result[appId] = {
        defaults,
        overrides,
        effective: { ...defaults, ...overrides },
      }
    }

    return apiSuccess(result)
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
    await requireSuperAdmin()

    let body: unknown
    try { body = await req.json() } catch { return apiError('Corps invalide', 400) }
    const parsed = pricingSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422)

    const { appId, prices } = parsed.data
    if (!(appId in APP_PLANS)) return apiError('App introuvable', 404)

    await prisma.systemConfig.upsert({
      where: { key: `${APP_PLANS_CONFIG_PREFIX}${appId}` },
      update: { value: prices },
      create: { key: `${APP_PLANS_CONFIG_PREFIX}${appId}`, value: prices },
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
