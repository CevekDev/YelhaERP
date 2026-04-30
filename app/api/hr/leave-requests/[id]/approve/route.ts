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
    requireRole(ctx.role, 'ACCOUNTANT')

    const request = await prisma.leaveRequest.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
    })
    if (!request) return apiError('Demande introuvable', 404)
    if (request.status !== 'PENDING') return apiError('Cette demande ne peut plus être approuvée', 409)

    const updated = await prisma.leaveRequest.update({
      where: { id: params.id },
      data: {
        status: 'APPROVED',
        approvedBy: ctx.userId,
        approvedAt: new Date(),
      },
      include: {
        employee: { select: { firstName: true, lastName: true } },
        leaveType: { select: { name: true } },
      },
    })
    return apiSuccess(updated)
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
