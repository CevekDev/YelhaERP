import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiSuccess, apiError } from '@/lib/security/api-response'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getTenantContext()
  if (!ctx) return apiError('Non autorisé', 401)

  const key = await prisma.subApiKey.findFirst({
    where: { id: params.id, userId: ctx.userId },
  })
  if (!key) return apiError('Clé introuvable', 404)

  await prisma.subApiKey.update({
    where: { id: params.id },
    data: { isActive: false },
  })
  return apiSuccess({ revoked: true })
}
