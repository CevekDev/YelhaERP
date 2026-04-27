import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

const journalSchema = z.object({
  date: z.string().datetime(),
  reference: z.string().min(1).max(50).trim(),
  description: z.string().min(1).max(500).trim(),
  debit: z.number().min(0),
  credit: z.number().min(0),
  accountCode: z.string().min(3).max(10),
  accountName: z.string().min(1).max(100).trim(),
})

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    const { searchParams } = req.nextUrl
    const type = searchParams.get('type') ?? 'journal'
    const page = Math.max(1, Number(searchParams.get('page') ?? 1))
    const limit = Math.min(100, Number(searchParams.get('limit') ?? 30))
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const accountCode = searchParams.get('accountCode')

    const where = {
      companyId: ctx.companyId,
      ...(from || to ? { date: { ...(from && { gte: new Date(from) }), ...(to && { lte: new Date(to) }) } } : {}),
      ...(accountCode && { accountCode }),
    }

    if (type === 'balance') {
      // Balance des comptes
      const entries = await prisma.journalEntry.groupBy({
        by: ['accountCode', 'accountName'],
        where: { companyId: ctx.companyId },
        _sum: { debit: true, credit: true },
        orderBy: { accountCode: 'asc' },
      })
      return apiSuccess(entries.map(e => ({
        accountCode: e.accountCode,
        accountName: e.accountName,
        totalDebit: Number(e._sum.debit ?? 0),
        totalCredit: Number(e._sum.credit ?? 0),
        balance: Number(e._sum.debit ?? 0) - Number(e._sum.credit ?? 0),
      })))
    }

    const [entries, total] = await Promise.all([
      prisma.journalEntry.findMany({
        where,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.journalEntry.count({ where }),
    ])
    return apiSuccess({ entries, total, page, limit })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500)
  }
}

export async function POST(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'ACCOUNTANT')
    const body = await req.json().catch(() => null)
    const parsed = journalSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422)
    const entry = await prisma.journalEntry.create({
      data: { ...parsed.data, date: new Date(parsed.data.date), companyId: ctx.companyId },
    })
    return apiSuccess(entry, 201)
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
