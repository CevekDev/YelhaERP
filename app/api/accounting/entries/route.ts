import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { z } from 'zod'

const lineSchema = z.object({
  accountId: z.string(),
  accountCode: z.string(),
  description: z.string(),
  debit: z.number().min(0).default(0),
  credit: z.number().min(0).default(0),
})

const createSchema = z.object({
  date: z.string(),
  reference: z.string().min(1),
  description: z.string().min(1),
  period: z.string().regex(/^\d{4}-\d{2}$/),
  lines: z.array(lineSchema).min(2),
})

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    const { searchParams } = req.nextUrl
    const period = searchParams.get('period')
    const page = Number(searchParams.get('page') ?? 1)
    const limit = Number(searchParams.get('limit') ?? 20)
    const skip = (page - 1) * limit
    const where = { companyId: ctx.companyId, ...(period && { period }) }
    const [entries, total] = await Promise.all([
      prisma.accountEntry.findMany({
        where, skip, take: limit,
        orderBy: { date: 'desc' },
        include: { lines: { include: { account: true } } },
      }),
      prisma.accountEntry.count({ where }),
    ])
    return apiSuccess({ entries, total })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non autorisé', 401)
    return apiError('Erreur serveur', 500, e)
  }
}

export async function POST(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'ACCOUNTANT')
    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 400, parsed.error.flatten())
    const { date, reference, description, period, lines } = parsed.data
    // Validate balance: Σdebit = Σcredit
    const totalDebit = lines.reduce((s, l) => s + l.debit, 0)
    const totalCredit = lines.reduce((s, l) => s + l.credit, 0)
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return apiError(`Écriture déséquilibrée : débit ${totalDebit} ≠ crédit ${totalCredit}`, 422)
    }
    // Check period not closed
    const [y, m] = period.split('-').map(Number)
    const closedPeriod = await prisma.fiscalPeriod.findFirst({
      where: { companyId: ctx.companyId, year: y, month: m, isClosed: true },
    })
    if (closedPeriod) return apiError('Période clôturée', 409)
    // Verify all accounts belong to company
    const accountIds = Array.from(new Set(lines.map(l => l.accountId)))
    const accounts = await prisma.accountPCN.findMany({
      where: { companyId: ctx.companyId, id: { in: accountIds } },
      select: { id: true },
    })
    if (accounts.length !== accountIds.length) return apiError('Compte introuvable', 404)
    const entry = await prisma.accountEntry.create({
      data: {
        companyId: ctx.companyId,
        date: new Date(date), reference, description, period,
        lines: {
          create: lines.map(l => ({
            accountId: l.accountId,
            accountCode: l.accountCode,
            description: l.description,
            debit: l.debit,
            credit: l.credit,
          })),
        },
      },
      include: { lines: true },
    })
    return apiSuccess(entry, 201)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non autorisé', 401)
    if (e instanceof Error && e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    return apiError('Erreur serveur', 500, e)
  }
}
