import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiSuccess, apiError } from '@/lib/security/api-response'

export async function GET(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx) return apiError('Non autorisé', 401)

  const q = req.nextUrl.searchParams.get('q') ?? ''
  const products = await prisma.product.findMany({
    where: {
      companyId: ctx.companyId,
      isActive:  true,
      ...(q ? {
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { sku:  { contains: q, mode: 'insensitive' } },
        ],
      } : {}),
    },
    select: {
      id: true, name: true, sku: true, unitPrice: true,
      taxRate: true, stockQty: true, unit: true,
    },
    orderBy: { name: 'asc' },
    take: 50,
  })
  return apiSuccess(products)
}
