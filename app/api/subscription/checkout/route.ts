import { NextRequest, NextResponse } from 'next/server'
import { getTenantContext } from '@/lib/security/tenant'
import { apiError, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { z } from 'zod'

const schema = z.object({
  plan:   z.enum(['STARTER', 'PRO', 'AGENCY']),
  months: z.number().int().min(1).max(12).default(1),
})

const PLAN_PRICES: Record<string, number> = {
  STARTER: 1500,
  PRO:     3200,
  AGENCY:  9900,
}

// Discount by number of months
const DISCOUNTS: Record<number, number> = {
  3:  0.10,
  6:  0.10,
  12: 0.20,
}

const CHARGILY_BASE = process.env.CHARGILY_MODE === 'live'
  ? 'https://pay.chargily.net/api/v2'
  : 'https://pay.chargily.net/test/api/v2'

export async function POST(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError('Plan ou durée invalide', 400)

    const { plan, months } = parsed.data
    const basePrice = PLAN_PRICES[plan]
    const discount = DISCOUNTS[months] ?? 0
    const amount = Math.round(basePrice * months * (1 - discount))

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const payload = {
      amount,
      currency: 'dzd',
      success_url: `${appUrl}/dashboard/settings?upgraded=1`,
      failure_url: `${appUrl}/dashboard/settings/billing?error=1`,
      webhook_url: `${appUrl}/api/webhooks/chargily`,
      description: `Abonnement YelhaERP — Plan ${plan} × ${months} mois${discount > 0 ? ` (−${discount * 100}%)` : ''}`,
      locale: 'ar',
      metadata: {
        type:       'subscription',
        company_id: ctx.companyId,
        plan,
        months,
      },
    }

    const res = await fetch(`${CHARGILY_BASE}/checkouts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CHARGILY_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const err = await res.text()
      return apiError(`Chargily error: ${err}`, 502)
    }

    const data = await res.json()
    return NextResponse.json({ checkout_url: data.checkout_url })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non autorisé', 401)
    return apiError('Erreur serveur', 500, e)
  }
}
