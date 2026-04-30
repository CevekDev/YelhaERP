import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { PCN_ACCOUNTS } from '@/lib/algerian/pcn-accounts'

// POST /api/accounting/init-pcn — initialise le plan comptable PCN algérien
export async function POST(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'ACCOUNTANT')
    const existing = await prisma.accountPCN.count({ where: { companyId: ctx.companyId } })
    if (existing > 0) return apiError('Plan comptable déjà initialisé', 409)
    await prisma.accountPCN.createMany({
      data: PCN_ACCOUNTS.map(a => ({
        companyId: ctx.companyId,
        code: a.code, name: a.name, class: a.class,
        type: a.type, parentCode: a.parentCode,
      })),
      skipDuplicates: true,
    })
    return apiSuccess({ count: PCN_ACCOUNTS.length })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non autorisé', 401)
    if (e instanceof Error && e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    return apiError('Erreur serveur', 500, e)
  }
}
