import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getTenantContext } from '@/lib/security/tenant'
import { apiSuccess, apiError } from '@/lib/security/api-response'

const schema = z.object({
  amount: z.number().positive(),
  method: z.enum(['CASH', 'CARD']).default('CASH'),
  note:   z.string().max(300).optional(),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getTenantContext()
  if (!ctx) return apiError('Non autorisé', 401)

  const debt = await prisma.posDebt.findFirst({
    where: { id: params.id, companyId: ctx.companyId },
  })
  if (!debt) return apiError('Dette introuvable', 404)
  if (debt.status === 'PAID') return apiError('Cette dette est déjà soldée', 409)

  let body: unknown
  try { body = await req.json() } catch { return apiError('Corps invalide', 400) }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return apiError('Données invalides', 400)

  const remaining = Number(debt.totalAmount) - Number(debt.paidAmount)
  const payAmount = Math.min(parsed.data.amount, remaining)
  const newPaid   = Number(debt.paidAmount) + payAmount
  const newStatus = newPaid >= Number(debt.totalAmount) ? 'PAID' : 'PARTIAL'

  const [payment, updatedDebt] = await prisma.$transaction([
    prisma.posDebtPayment.create({
      data: {
        debtId: debt.id,
        amount: payAmount,
        method: parsed.data.method as 'CASH' | 'CARD',
        note:   parsed.data.note,
      },
    }),
    prisma.posDebt.update({
      where: { id: debt.id },
      data:  {
        paidAmount: newPaid,
        status:     newStatus as 'PENDING' | 'PARTIAL' | 'PAID',
      },
    }),
  ])

  return apiSuccess({ payment, debt: updatedDebt })
}
