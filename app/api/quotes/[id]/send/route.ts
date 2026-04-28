import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { randomBytes } from 'crypto'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'EMPLOYEE')

    const quote = await prisma.quote.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
    })
    if (!quote) return apiError('Devis introuvable', 404)
    if (quote.status === 'CONVERTED') return apiError('Devis déjà converti', 409)

    const portalToken = quote.portalToken ?? randomBytes(32).toString('hex')
    const followUpAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const updated = await prisma.quote.update({
      where: { id: params.id },
      data: { status: 'SENT', portalToken, followUpAt },
    })

    return apiSuccess({
      quote: updated,
      portalUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/portal/quote/${portalToken}`,
    })
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
