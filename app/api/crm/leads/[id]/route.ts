import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { leadUpdateSchema } from '@/lib/validations/crm'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)

  try {
    const ctx = await getTenantContext()
    const lead = await prisma.lead.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
      include: {
        activities: {
          orderBy: { doneAt: 'desc' },
        },
        tasks: {
          orderBy: { dueDate: 'asc' },
        },
        client: {
          select: { id: true, name: true },
        },
      },
    })
    if (!lead) return apiError('Lead introuvable', 404)
    return apiSuccess(lead)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500)
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)

  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'EMPLOYEE')

    const exists = await prisma.lead.findFirst({ where: { id: params.id, companyId: ctx.companyId } })
    if (!exists) return apiError('Lead introuvable', 404)

    let body: unknown
    try { body = await req.json() } catch { return apiError('Corps invalide', 400) }

    const parsed = leadUpdateSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422, parsed.error.flatten())

    const { expectedValue, expectedClose, ...rest } = parsed.data

    const lead = await prisma.lead.update({
      where: { id: params.id },
      data: {
        ...rest,
        ...(expectedValue !== undefined && { expectedValue: expectedValue != null ? expectedValue.toString() : null }),
        ...(expectedClose !== undefined && { expectedClose: expectedClose != null ? new Date(expectedClose) : null }),
      },
    })

    return apiSuccess(lead)
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
