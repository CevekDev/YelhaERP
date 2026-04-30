import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    const { searchParams } = req.nextUrl
    const period = searchParams.get('period')
    const accounts = await prisma.accountPCN.findMany({
      where: { companyId: ctx.companyId, isActive: true },
      include: {
        accountLines: {
          where: period ? { entry: { companyId: ctx.companyId, period } } : { entry: { companyId: ctx.companyId } },
        },
      },
      orderBy: { code: 'asc' },
    })
    const balance = accounts
      .map(acc => {
        const totalDebit = acc.accountLines.reduce((s, l) => s + Number(l.debit), 0)
        const totalCredit = acc.accountLines.reduce((s, l) => s + Number(l.credit), 0)
        const solde = totalDebit - totalCredit
        return { code: acc.code, name: acc.name, class: acc.class, type: acc.type, totalDebit, totalCredit, solde }
      })
      .filter(r => r.totalDebit !== 0 || r.totalCredit !== 0)
    const totals = {
      totalDebit: balance.reduce((s, r) => s + r.totalDebit, 0),
      totalCredit: balance.reduce((s, r) => s + r.totalCredit, 0),
    }
    return apiSuccess({ balance, totals })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non autorisé', 401)
    return apiError('Erreur serveur', 500, e)
  }
}
