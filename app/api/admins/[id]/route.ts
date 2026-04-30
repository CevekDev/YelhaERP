import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'ADMIN')

    const user = await prisma.user.findFirst({
      where: { id: params.id, companyId: ctx.companyId, role: { not: 'OWNER' } },
    })
    if (!user) return apiError('Utilisateur introuvable', 404)
    if (user.id === ctx.userId) return apiError('Vous ne pouvez pas supprimer votre propre compte', 400)

    await prisma.user.delete({ where: { id: params.id } })
    return apiSuccess({ deleted: true })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non autorisé', 401)
    if (e instanceof Error && e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    return apiError('Erreur serveur', 500, e)
  }
}
