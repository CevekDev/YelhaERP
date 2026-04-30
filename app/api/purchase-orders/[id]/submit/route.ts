import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)

  try {
    const ctx = await getTenantContext()

    const order = await prisma.purchaseOrder.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
    })
    if (!order) return apiError('Bon de commande introuvable', 404)
    if (order.status !== 'DRAFT') return apiError('Seul un brouillon peut être soumis', 422)

    const updated = await prisma.$transaction(async tx => {
      const po = await tx.purchaseOrder.update({
        where: { id: params.id },
        data: { status: 'SUBMITTED' },
      })

      // Create approval entry (step 1, requires ADMIN or OWNER)
      await tx.pOApproval.create({
        data: {
          companyId: ctx.companyId,
          purchaseOrderId: params.id,
          step: 1,
          approverRole: 'ADMIN',
          status: 'PENDING',
        },
      })

      return po
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
