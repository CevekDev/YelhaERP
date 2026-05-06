import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/security/api-response'

export async function GET(
  _req: NextRequest,
  { params }: { params: { token: string } }
) {
  // Public route — no auth, no rate limit required

  const table = await prisma.restaurantTable.findUnique({
    where: { qrToken: params.token },
    include: {
      company: {
        select: { id: true },
      },
    },
  })

  if (!table) return apiError('QR code invalide', 404)

  const companyId = table.companyId

  const [config, categories] = await Promise.all([
    prisma.restaurantConfig.findUnique({
      where: { companyId },
      select: { name: true, logo: true, currency: true, taxRate: true },
    }),
    prisma.menuCategory.findMany({
      where: { companyId, isActive: true, isAvailable: true },
      include: {
        items: {
          where: { isActive: true, isAvailable: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    }),
  ])

  return apiSuccess({
    config: config
      ? {
          name: config.name,
          logo: config.logo,
          currency: config.currency,
          taxRate: config.taxRate,
        }
      : null,
    table: {
      id: table.id,
      number: table.number,
      capacity: table.capacity,
    },
    categories,
  })
}
