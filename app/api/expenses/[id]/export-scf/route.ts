import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { EXPENSE_ACCOUNTS } from '@/lib/algerian/expense-accounts'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'ACCOUNTANT')

    const expense = await prisma.expense.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
    })
    if (!expense) return apiError('Dépense introuvable', 404)
    if (expense.status !== 'APPROVED') return apiError('La dépense doit être approuvée avant l\'export', 409)

    const account = EXPENSE_ACCOUNTS[expense.category] ?? EXPENSE_ACCOUNTS.AUTRE
    const taxAmt = Number(expense.taxAmount ?? 0)
    const htAmount = Number(expense.amount) - taxAmt
    const ref = `DEP-${expense.id.slice(0, 8).toUpperCase()}`

    await prisma.$transaction(async tx => {
      // Debit expense account (HT)
      const entry = await tx.journalEntry.create({
        data: {
          companyId: ctx.companyId,
          date: expense.date,
          reference: ref,
          description: expense.description,
          accountCode: account.code,
          accountName: account.label,
          debit: htAmount,
          credit: 0,
        },
      })

      // Debit TVA if any
      if (taxAmt > 0) {
        await tx.journalEntry.create({
          data: {
            companyId: ctx.companyId,
            date: expense.date,
            reference: ref,
            description: `TVA sur ${expense.description}`,
            accountCode: '4456',
            accountName: 'TVA déductible',
            debit: taxAmt,
            credit: 0,
          },
        })
      }

      // Credit cash
      await tx.journalEntry.create({
        data: {
          companyId: ctx.companyId,
          date: expense.date,
          reference: ref,
          description: expense.description,
          accountCode: '530',
          accountName: 'Caisse',
          debit: 0,
          credit: Number(expense.amount),
        },
      })

      await tx.expense.update({
        where: { id: expense.id },
        data: { status: 'EXPORTED', journalEntryId: entry.id },
      })
    })

    return apiSuccess({ exported: true, account })
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
