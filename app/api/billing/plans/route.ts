import { NextRequest } from 'next/server'
import { apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, PUBLIC_RATE_LIMIT } from '@/lib/security/ratelimit'
import { PLANS, APPS } from '@/lib/pricing/config'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const rl = await rateLimit(req, PUBLIC_RATE_LIMIT)
  if (!rl.success) return rateLimitResponse(rl.reset)

  const config = await prisma.systemConfig.findUnique({ where: { key: 'pricing' } })
  const overrides = (config?.value as { plans?: Record<string, number>; apps?: Record<string, number> } | null) ?? {}
  const planOverrides = overrides.plans ?? {}
  const appOverrides = overrides.apps ?? {}

  const effectivePlans = Object.fromEntries(
    Object.entries(PLANS).map(([id, p]) => [id, { ...p, price: planOverrides[id] ?? p.price }])
  )
  const effectiveApps = Object.fromEntries(
    Object.entries(APPS).map(([id, a]) => [id, { ...a, price: appOverrides[id] ?? a.price }])
  )

  return apiSuccess({ plans: effectivePlans, apps: effectiveApps })
}
