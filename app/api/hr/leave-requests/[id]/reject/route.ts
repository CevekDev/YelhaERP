import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { z } from 'zod'

const schema = z.object({ reason: z.string().optional() })

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'ADMIN')
    const body = await req.json()
    const parsed = schema.safeParse(body)
    const request = await prisma.leaveRequest.findFirst({
      where: { id: params.id },
      include: { employee: { select: { companyId: true } } },
    })
    if (!request || request.employee.companyId !== ctx.companyId) return apiError('Demande introuvable', 404)
    if (request.status !== 'PENDING') return apiError('Demande déjà traitée', 409)
    const updated = await prisma.leaveRequest.update({
      where: { id: params.id },
      data: { status: 'REJECTED', approvedBy: ctx.userId, approvedAt: new Date() },
    })
    return apiSuccess(updated)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non autorisé', 401)
    if (e instanceof Error && e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    return apiError('Erreur serveur', 500, e)
  }
}
