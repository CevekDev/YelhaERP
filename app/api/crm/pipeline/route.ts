import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

const STAGES = ['NEW', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'] as const

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    const leads = await prisma.lead.findMany({
      where: { companyId: ctx.companyId },
      select: { id: true, firstName: true, lastName: true, company: true, expectedValue: true, stage: true, assignedTo: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })
    const pipeline = STAGES.map(stage => ({
      stage,
      leads: leads.filter(l => l.stage === stage),
      count: leads.filter(l => l.stage === stage).length,
      totalValue: leads.filter(l => l.stage === stage).reduce((s, l) => s + Number(l.expectedValue ?? 0), 0),
    }))
    return apiSuccess({ pipeline, totalLeads: leads.length, totalValue: leads.reduce((s, l) => s + Number(l.expectedValue ?? 0), 0) })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non autorisé', 401)
    return apiError('Erreur serveur', 500, e)
  }
}
