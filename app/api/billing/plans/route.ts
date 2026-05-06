import { NextRequest } from 'next/server'
import { apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, PUBLIC_RATE_LIMIT } from '@/lib/security/ratelimit'
import { PLANS, APPS } from '@/lib/pricing/config'

export async function GET(req: NextRequest) {
  const rl = await rateLimit(req, PUBLIC_RATE_LIMIT)
  if (!rl.success) return rateLimitResponse(rl.reset)

  return apiSuccess({ plans: PLANS, apps: APPS })
}
