import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiError, apiSuccess } from '@/lib/security/api-response'

export async function GET() {
  try {
    const ctx = await getTenantContext()
    const conversations = await prisma.aiConversation.findMany({
      where: { companyId: ctx.companyId, userId: ctx.userId },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    })
    return apiSuccess(conversations)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500)
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getTenantContext()
    const { title } = await req.json()
    const conv = await prisma.aiConversation.create({
      data: {
        companyId: ctx.companyId,
        userId: ctx.userId,
        title: title ?? 'Nouvelle conversation',
        messages: [],
      },
    })
    return apiSuccess(conv, 201)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500)
  }
}
