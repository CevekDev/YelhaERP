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
      where: { companyId: ctx.companyId, isActive: true, class: { in: [6, 7] } },
      include: {
        accountLines: { where: period ? { entry: { companyId: ctx.companyId, period } } : { entry: { companyId: ctx.companyId } } },
      },
      orderBy: { code: 'asc' },
    })
    const charges: { code: string; name: string; solde: number }[] = []
    const produits: { code: string; name: string; solde: number }[] = []
    for (const acc of accounts) {
      const totalDebit = acc.accountLines.reduce((s, l) => s + Number(l.debit), 0)
      const totalCredit = acc.accountLines.reduce((s, l) => s + Number(l.credit), 0)
      const solde = Math.abs(totalDebit - totalCredit)
      if (solde === 0) continue
      const row = { code: acc.code, name: acc.name, solde }
      if (acc.class === 6) charges.push(row)
      else if (acc.class === 7) produits.push(row)
    }
    const totalCharges = charges.reduce((s, r) => s + r.solde, 0)
    const totalProduits = produits.reduce((s, r) => s + r.solde, 0)
    const resultatNet = totalProduits - totalCharges
    return apiSuccess({ charges, produits, totalCharges, totalProduits, resultatNet })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non autorisé', 401)
    return apiError('Erreur serveur', 500, e)
  }
}
