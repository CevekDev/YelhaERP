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
    const lead = await prisma.lead.findFirst({ where: { id: params.id, companyId: ctx.companyId } })
    if (!lead) return apiError('Lead introuvable', 404)
    if (lead.clientId) return apiError('Lead déjà converti', 409)

    const client = await prisma.client.create({
      data: {
        companyId: ctx.companyId,
        name: [lead.firstName, lead.lastName].filter(Boolean).join(' '),
        email: lead.email ?? undefined,
        phone: lead.phone ?? undefined,
        address: lead.company ?? undefined,
      },
    })
    const updatedLead = await prisma.lead.update({
      where: { id: params.id },
      data: { stage: 'WON', convertedAt: new Date(), clientId: client.id },
    })

    return apiSuccess({ client, lead: updatedLead }, 201)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non autorisé', 401)
    return apiError('Erreur serveur', 500, e)
  }
}
