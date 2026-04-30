import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'EMPLOYEE')
    const order = await prisma.productionOrder.findFirst({ where: { id: params.id, companyId: ctx.companyId } })
    if (!order) return apiError('Ordre introuvable', 404)
    if (order.status !== 'CONFIRMED') return apiError('L\'ordre doit être confirmé avant de démarrer', 409)
    const updated = await prisma.productionOrder.update({
      where: { id: params.id },
      data: { status: 'IN_PROGRESS', actualStart: new Date() },
    })
    return apiSuccess(updated)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non autorisé', 401)
    if (e instanceof Error && e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    return apiError('Erreur serveur', 500, e)
  }
}
