import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { updateExpenseSchema } from '@/lib/validations/expense'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getTenantContext()
    const expense = await prisma.expense.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
      include: { user: { select: { id: true, name: true } } },
    })
    if (!expense) return apiError('Dépense introuvable', 404)
    return apiSuccess(expense)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500)
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()

    const expense = await prisma.expense.findFirst({ where: { id: params.id, companyId: ctx.companyId } })
    if (!expense) return apiError('Dépense introuvable', 404)
    if (expense.status === 'EXPORTED') return apiError('Dépense déjà exportée', 409)

    const body = await req.json()
    const parsed = updateExpenseSchema.safeParse(body)
    if (!parsed.success) return apiError(parsed.error.errors[0].message, 400)

    const { date, ...rest } = parsed.data
    const updateData: Record<string, unknown> = { ...rest }
    if (date) updateData.date = new Date(date)

    const updated = await prisma.expense.update({
      where: { id: params.id },
      data: updateData,
      include: { user: { select: { id: true, name: true } } },
    })

    return apiSuccess(updated)
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'ACCOUNTANT')

    const expense = await prisma.expense.findFirst({ where: { id: params.id, companyId: ctx.companyId } })
    if (!expense) return apiError('Dépense introuvable', 404)
    if (expense.status === 'EXPORTED') return apiError('Impossible de supprimer une dépense exportée', 409)

    await prisma.expense.delete({ where: { id: params.id } })
    return apiSuccess({ deleted: true })
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
