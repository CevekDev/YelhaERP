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

    const { action } = await req.json() as { action: 'approve' | 'reject' }
    if (!['approve', 'reject'].includes(action)) return apiError('Action invalide', 400)

    const expense = await prisma.expense.findFirst({ where: { id: params.id, companyId: ctx.companyId } })
    if (!expense) return apiError('Dépense introuvable', 404)
    if (expense.status !== 'PENDING') return apiError('La dépense n\'est pas en attente', 409)

    const updated = await prisma.expense.update({
      where: { id: params.id },
      data: { status: action === 'approve' ? 'APPROVED' : 'REJECTED' },
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
