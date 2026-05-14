import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireSuperAdmin } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

const schema = z.object({ action: z.enum(['ban', 'unban']) })

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    await requireSuperAdmin()

    let body: unknown
    try { body = await req.json() } catch { return apiError('Corps invalide', 400) }
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422)

    const { action } = parsed.data
    const isBanned = action === 'ban'

    const company = await prisma.company.findUnique({ where: { id: params.id } })
    if (!company) return apiError('Entreprise introuvable', 404)

    await prisma.company.update({
      where: { id: params.id },
      data: { isBanned, bannedAt: isBanned ? new Date() : null },
    })

    return apiSuccess({ isBanned })
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
