import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiSuccess, apiError } from '@/lib/security/api-response'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getTenantContext()
  if (!ctx) return apiError('Non autorisé', 401)

  const client = await prisma.client.findFirst({
    where: { id: params.id, userId: ctx.userId },
  })
  if (!client) return apiError('Client introuvable', 404)

  const activeCount = await prisma.subscription.count({
    where: { clientId: params.id, status: 'ACTIVE' },
  })
  if (activeCount > 0) return apiError(`Ce client a ${activeCount} abonnement(s) actif(s). Annulez-les avant de supprimer le client.`, 422)

  // Supprime les abonnements non-actifs liés, puis le client
  await prisma.subscription.deleteMany({
    where: { clientId: params.id, status: { not: 'ACTIVE' } },
  })
  await prisma.client.delete({ where: { id: params.id } })

  return apiSuccess({ deleted: true })
}
