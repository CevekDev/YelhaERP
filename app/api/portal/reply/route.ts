import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

export async function POST(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'EMPLOYEE')

    const { token, content, clientId } = await req.json() as { token: string; content: string; clientId: string }
    if (!content?.trim()) return apiError('Message vide', 400)
    if (!token || !clientId) return apiError('Paramètres manquants', 400)

    // Ensure the client belongs to this company
    const client = await prisma.client.findFirst({ where: { id: clientId, companyId: ctx.companyId } })
    if (!client) return apiError('Client introuvable', 404)

    const message = await prisma.clientMessage.create({
      data: {
        companyId: ctx.companyId,
        clientId,
        token,
        content: content.trim(),
        fromClient: false,
      },
    })

    return apiSuccess(message, 201)
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
