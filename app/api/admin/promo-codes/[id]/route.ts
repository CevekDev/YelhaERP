import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    await requireSuperAdmin(req)
    const code = await prisma.promoCode.findUnique({ where: { id: params.id } })
    if (!code) return apiError('Code introuvable', 404)
    await prisma.promoCode.update({ where: { id: params.id }, data: { isActive: !code.isActive } })
    return apiSuccess({ isActive: !code.isActive })
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    await requireSuperAdmin(req)
    await prisma.promoCode.delete({ where: { id: params.id } })
    return apiSuccess({ deleted: true })
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
