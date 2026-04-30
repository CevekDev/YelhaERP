import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { stageSchema } from '@/lib/validations/crm'

const STAGE_LABELS: Record<string, string> = {
  NEW: 'Nouveau',
  CONTACTED: 'Contacté',
  QUALIFIED: 'Qualifié',
  PROPOSAL: 'Proposition envoyée',
  NEGOTIATION: 'En négociation',
  WON: 'Gagné',
  LOST: 'Perdu',
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)

  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'EMPLOYEE')

    const lead = await prisma.lead.findFirst({ where: { id: params.id, companyId: ctx.companyId } })
    if (!lead) return apiError('Lead introuvable', 404)

    let body: unknown
    try { body = await req.json() } catch { return apiError('Corps invalide', 400) }

    const parsed = stageSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422, parsed.error.flatten())

    const { stage, lostReason } = parsed.data
    const prevStage = lead.stage

    const [updatedLead] = await prisma.$transaction([
      prisma.lead.update({
        where: { id: params.id },
        data: {
          stage,
          ...(lostReason != null && { lostReason }),
        },
      }),
      prisma.leadActivity.create({
        data: {
          leadId: params.id,
          userId: ctx.userId,
          type: 'NOTE',
          subject: `Étape changée : ${STAGE_LABELS[prevStage] ?? prevStage} → ${STAGE_LABELS[stage] ?? stage}`,
          notes: lostReason ? `Raison : ${lostReason}` : undefined,
          doneAt: new Date(),
        },
      }),
    ])

    return apiSuccess(updatedLead)
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
