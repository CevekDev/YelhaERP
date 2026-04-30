import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    const order = await prisma.productionOrder.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
      include: {
        bom: {
          include: {
            product: { select: { name: true, sku: true } },
            components: { include: { product: { select: { name: true, sku: true } } } },
          },
        },
        consumptions: true,
      },
    })
    if (!order) return apiError('Ordre introuvable', 404)
    return apiSuccess(order)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non autorisé', 401)
    return apiError('Erreur serveur', 500, e)
  }
}
