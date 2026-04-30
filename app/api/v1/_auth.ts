import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/security/api-key-auth'
import { rateLimitByKey, API_V1_RATE_LIMITS } from '@/lib/security/ratelimit'

export interface V1Context {
  companyId: string
  plan: string
  scopes: string[]
}

export function v1Error(message: string, status: number, code?: string): NextResponse {
  return NextResponse.json({ error: message, code: code ?? 'ERROR', status }, { status })
}

export function v1Success<T>(data: T, meta?: Record<string, unknown>): NextResponse {
  return NextResponse.json({ data, ...(meta && { meta }) })
}

export function v1RateLimitResponse(reset: number, plan: string): NextResponse {
  const limits = API_V1_RATE_LIMITS[plan] ?? API_V1_RATE_LIMITS.TRIAL
  return NextResponse.json(
    { error: 'Quota API dépassé. Mettez à niveau votre plan.', code: 'RATE_LIMIT_EXCEEDED', status: 429, plan, limit: limits.limit },
    {
      status: 429,
      headers: {
        'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
        'X-RateLimit-Reset': String(reset),
        'X-RateLimit-Plan': plan,
      },
    }
  )
}

export async function withV1Auth(
  req: NextRequest,
  handler: (ctx: V1Context) => Promise<NextResponse>
): Promise<NextResponse> {
  const ctx = await authenticateApiKey(req)
  if (!ctx) return v1Error('Clé API invalide ou manquante. Ajoutez: Authorization: Bearer <votre_clé>', 401, 'UNAUTHORIZED')

  const limitsConfig = API_V1_RATE_LIMITS[ctx.plan] ?? API_V1_RATE_LIMITS.TRIAL
  const { success, remaining, reset } = await rateLimitByKey(ctx.keyId, limitsConfig)
  if (!success) return v1RateLimitResponse(reset, ctx.plan)

  const res = await handler({ companyId: ctx.companyId, plan: ctx.plan, scopes: ctx.scopes })

  // Inject rate limit headers on every response
  res.headers.set('X-RateLimit-Limit', String(limitsConfig.limit))
  res.headers.set('X-RateLimit-Remaining', String(remaining))
  res.headers.set('X-RateLimit-Reset', String(reset))
  res.headers.set('X-RateLimit-Plan', ctx.plan)
  res.headers.set('X-API-Version', 'v1')

  return res
}
