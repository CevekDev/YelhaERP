import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { getG50Deadline } from '@/lib/algerian/tax'

const declarationSchema = z.object({
  type: z.string().min(1).max(20),
  period: z.string().min(4).max(10),
  amount: z.number().min(0),
  dueDate: z.string().datetime(),
})

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    const { searchParams } = req.nextUrl
    const type = searchParams.get('type')

    if (type === 'g50-calculate') {
      // Calcul automatique TVA pour G50
      const month = Number(searchParams.get('month') ?? new Date().getMonth() + 1)
      const year = Number(searchParams.get('year') ?? new Date().getFullYear())
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month, 0, 23, 59, 59)

      const [collected, deductible] = await Promise.all([
        // TVA collectée (sur les ventes payées)
        prisma.invoice.aggregate({
          where: { companyId: ctx.companyId, status: 'PAID', issueDate: { gte: startDate, lte: endDate } },
          _sum: { taxAmount: true, total: true },
        }),
        // TVA déductible (sur les achats — journal comptable)
        prisma.journalEntry.aggregate({
          where: { companyId: ctx.companyId, accountCode: '4455', date: { gte: startDate, lte: endDate } },
          _sum: { debit: true },
        }),
      ])

      const tvaCollectee = Number(collected._sum.taxAmount ?? 0)
      const tvaDeductible = Number(deductible._sum.debit ?? 0)
      const netDue = Math.max(0, tvaCollectee - tvaDeductible)
      const deadline = getG50Deadline(year, month)

      return apiSuccess({ month, year, tvaCollectee, tvaDeductible, netDue, deadline })
    }

    const declarations = await prisma.taxDeclaration.findMany({
      where: { companyId: ctx.companyId },
      orderBy: { dueDate: 'desc' },
    })
    return apiSuccess(declarations)
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
    const parsed = declarationSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422)
    const decl = await prisma.taxDeclaration.create({
      data: { ...parsed.data, dueDate: new Date(parsed.data.dueDate), companyId: ctx.companyId },
    })
    return apiSuccess(decl, 201)
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
