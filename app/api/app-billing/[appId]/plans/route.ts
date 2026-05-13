import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { APP_PLANS, getAppPlanConfig } from '@/lib/pricing/app-plans'

const APP_PLANS_CONFIG_PREFIX = 'app_pricing_'

export async function GET(req: NextRequest, { params }: { params: { appId: string } }) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)

  const { appId } = params
  const config = getAppPlanConfig(appId)
  if (!config) return apiError('App introuvable ou sans plans indépendants', 404)

  const dbConfig = await prisma.systemConfig.findUnique({
    where: { key: `${APP_PLANS_CONFIG_PREFIX}${appId}` },
  })
  const overrides = (dbConfig?.value as Record<string, number> | null) ?? {}

  const plansWithPrices = Object.entries(config.plans).map(([id, plan]) => ({
    ...plan,
    price: overrides[id] ?? plan.price,
  }))

  return apiSuccess({ appId, plans: plansWithPrices })
}
