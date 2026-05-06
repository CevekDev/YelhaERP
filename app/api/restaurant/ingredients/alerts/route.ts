import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiError, apiSuccess } from '@/lib/security/api-response'

export async function GET(req: NextRequest) {
  // No rate limit needed for this simple GET
  let ctx
  try {
    ctx = await getTenantContext()
  } catch (e) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    throw e
  }

  // Using raw query to compare decimal fields: currentStock <= minStock
  const alerts = await prisma.$queryRaw<
    Array<{
      id: string
      companyId: string
      name: string
      unit: string
      currentStock: number
      minStock: number
      unitCost: number
      erpProductId: string | null
      isActive: boolean
      createdAt: Date
      updatedAt: Date
    }>
  >`
    SELECT * FROM "Ingredient"
    WHERE "companyId" = ${ctx.companyId}
      AND "isActive" = true
      AND "currentStock" <= "minStock"
    ORDER BY name ASC
  `

  return apiSuccess(alerts)
}
