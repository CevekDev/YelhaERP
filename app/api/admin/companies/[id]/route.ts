import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    await requireSuperAdmin()

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, isSuperAdmin: true },
    })
    if (!user) return apiError('Utilisateur introuvable', 404)
    if (user.isSuperAdmin) return apiError('Impossible de supprimer un super admin', 403)

    await prisma.user.delete({ where: { id: params.id } })
    return apiSuccess({ deleted: true })
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
