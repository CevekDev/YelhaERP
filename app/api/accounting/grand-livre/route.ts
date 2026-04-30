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
    const accountId = searchParams.get('accountId')
    const period = searchParams.get('period')
    const fromDate = searchParams.get('from')
    const toDate = searchParams.get('to')
    if (!accountId) return apiError('accountId requis', 400)
    const account = await prisma.accountPCN.findFirst({
      where: { id: accountId, companyId: ctx.companyId },
    })
    if (!account) return apiError('Compte introuvable', 404)
    const lines = await prisma.accountLine.findMany({
      where: {
        accountId,
        entry: {
          companyId: ctx.companyId,
          ...(period && { period }),
          ...(fromDate && toDate && {
            date: { gte: new Date(fromDate), lte: new Date(toDate) },
          }),
        },
      },
      include: { entry: true },
      orderBy: { entry: { date: 'asc' } },
    })
    let balance = 0
    const rows = lines.map(l => {
      balance += Number(l.debit) - Number(l.credit)
      return {
        id: l.id, date: l.entry.date, reference: l.entry.reference,
        description: l.description, debit: Number(l.debit),
        credit: Number(l.credit), balance,
      }
    })
    return apiSuccess({ account, rows, totalDebit: rows.reduce((s, r) => s + r.debit, 0), totalCredit: rows.reduce((s, r) => s + r.credit, 0), finalBalance: balance })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non autorisé', 401)
    return apiError('Erreur serveur', 500, e)
  }
}
