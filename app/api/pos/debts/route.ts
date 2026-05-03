import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiSuccess, apiError } from '@/lib/security/api-response'

export async function GET(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx) return apiError('Non autorisé', 401)

  const status = req.nextUrl.searchParams.get('status')
  const debts = await prisma.posDebt.findMany({
    where: {
      companyId: ctx.companyId,
      ...(status === 'all'
        ? {}
        : { status: { in: ['PENDING', 'PARTIAL'] as const } }),
    },
    include: {
      client:   { select: { id: true, name: true, phone: true } },
      payments: { orderBy: { paidAt: 'desc' } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return apiSuccess(debts)
}
