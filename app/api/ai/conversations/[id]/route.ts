import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiError, apiSuccess } from '@/lib/security/api-response'

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getTenantContext()
    const conv = await prisma.aiConversation.findFirst({
      where: { id: params.id, companyId: ctx.companyId, userId: ctx.userId },
    })
    if (!conv) return apiError('Conversation introuvable', 404)
    return apiSuccess(conv)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500)
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getTenantContext()
    await prisma.aiConversation.deleteMany({
      where: { id: params.id, companyId: ctx.companyId, userId: ctx.userId },
    })
    return apiSuccess({ deleted: true })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500)
  }
}
