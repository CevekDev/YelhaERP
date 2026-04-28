import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { createExpenseSchema, expenseQuerySchema } from '@/lib/validations/expense'

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    const q = expenseQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams))

    const where = {
      companyId: ctx.companyId,
      ...(q.status !== 'ALL' ? { status: q.status } : {}),
      ...(q.category ? { category: q.category as never } : {}),
    }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip: (q.page - 1) * q.limit,
        take: q.limit,
        orderBy: { date: 'desc' },
        include: { user: { select: { id: true, name: true } } },
      }),
      prisma.expense.count({ where }),
    ])

    return apiSuccess({ expenses, total, page: q.page, limit: q.limit })
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
    requireRole(ctx.role, 'EMPLOYEE')

    const body = await req.json()
    const parsed = createExpenseSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.errors[0].message, 400)

    const { date, ...rest } = parsed.data

    const expense = await prisma.expense.create({
      data: {
        companyId: ctx.companyId,
        userId: ctx.userId,
        ...rest,
        date: new Date(date),
      },
      include: { user: { select: { id: true, name: true } } },
    })

    return apiSuccess(expense, 201)
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
