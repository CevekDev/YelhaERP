import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/security/api-response'
import { verifyCronSecret } from '@/lib/security/cron-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) return apiError('Non autorisé', 401)

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const [appResult, legacyResult] = await Promise.all([
    prisma.appPayment.deleteMany({
      where: { status: 'PENDING', createdAt: { lt: cutoff } },
    }),
    prisma.yelhaPayment.deleteMany({
      where: { status: 'PENDING', createdAt: { lt: cutoff } },
    }),
  ])

  return apiSuccess({
    deleted: { appPayments: appResult.count, yelhaPayments: legacyResult.count },
  })
}
