import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { z } from 'zod'

const schema = z.object({
  fromCurrency: z.string().length(3),
  toCurrency: z.string().length(3),
  rate: z.number().positive(),
  date: z.string(),
})

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    const { searchParams } = req.nextUrl
    const from = searchParams.get('from')
    const rates = await prisma.exchangeRate.findMany({
      where: { companyId: ctx.companyId, ...(from ? { fromCurrency: from } : {}) },
      orderBy: [{ date: 'desc' }],
      take: 100,
    })
    return apiSuccess(rates)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non autorisé', 401)
    return apiError('Erreur serveur', 500, e)
  }
}

export async function POST(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'ADMIN')
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 400, parsed.error.flatten())
    const rate = await prisma.exchangeRate.upsert({
      where: {
        companyId_fromCurrency_toCurrency_date: {
          companyId: ctx.companyId,
          fromCurrency: parsed.data.fromCurrency,
          toCurrency: parsed.data.toCurrency,
          date: new Date(parsed.data.date),
        },
      },
      update: { rate: parsed.data.rate },
      create: {
        companyId: ctx.companyId,
        fromCurrency: parsed.data.fromCurrency,
        toCurrency: parsed.data.toCurrency,
        rate: parsed.data.rate,
        date: new Date(parsed.data.date),
      },
    })
    return apiSuccess(rate, 201)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non autorisé', 401)
    if (e instanceof Error && e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    return apiError('Erreur serveur', 500, e)
  }
}
