import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getTenantContext } from '@/lib/security/tenant'
import { apiSuccess, apiError } from '@/lib/security/api-response'

const createSchema = z.object({
  name:              z.string().min(1).max(100),
  phone:             z.string().min(9).max(20),
  email:             z.string().email().optional(),
  wilaya:            z.string().max(100).optional(),
  vehicleType:       z.string().max(50).optional(),
  deliveryCompanyId: z.string().optional(),
})

export async function GET() {
  const ctx = await getTenantContext()
  if (!ctx) return apiError('Non autorisé', 401)

  const drivers = await prisma.deliveryDriver.findMany({
    where: { companyId: ctx.companyId, isActive: true },
    include: {
      deliveryCompany: { select: { id: true, name: true } },
      _count: { select: { orders: true } },
    },
    orderBy: { name: 'asc' },
  })
  return apiSuccess(drivers)
}

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx) return apiError('Non autorisé', 401)

  let body: unknown
  try { body = await req.json() } catch { return apiError('Corps invalide', 400) }
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return apiError('Données invalides', 400)

  const driver = await prisma.deliveryDriver.create({
    data: { companyId: ctx.companyId, ...parsed.data },
    include: { deliveryCompany: { select: { id: true, name: true } } },
  })
  return apiSuccess(driver, 201)
}
