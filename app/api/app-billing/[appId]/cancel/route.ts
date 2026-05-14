import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

export async function DELETE(req: NextRequest, { params }: { params: { appId: string } }) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const { companyId } = await getTenantContext()
    const { appId } = params

    const sub = await prisma.appSubscription.findUnique({
      where: { companyId_appId: { companyId, appId } },
    })
    if (!sub) return apiError('Abonnement introuvable', 404)
    if (sub.status === 'CANCELLED') return apiError('Déjà résilié', 409)

    await prisma.appSubscription.update({
      where: { id: sub.id },
      data: { status: 'CANCELLED' },
    })

    return apiSuccess({ cancelled: true })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500)
  }
}
