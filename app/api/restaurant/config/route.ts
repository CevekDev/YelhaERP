import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

const configSchema = z.object({
  name: z.string().min(1).max(100),
  address: z.string().max(255).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  logo: z.string().url().optional().nullable(),
  currency: z.string().max(10).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  serviceCharge: z.number().min(0).max(100).optional(),
  receiptFooter: z.string().max(500).optional().nullable(),
  tablePrefix: z.string().max(10).optional(),
  orderPrefix: z.string().max(10).optional(),
  enableQrMenu: z.boolean().optional(),
  enableLoyalty: z.boolean().optional(),
  loyaltyPointsRate: z.number().min(0).optional(),
  enableDelivery: z.boolean().optional(),
  deliveryFeeDefault: z.number().min(0).optional(),
  activeStations: z.array(z.string()).optional(),
})

export async function GET(req: NextRequest) {
  const rl = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!rl.success) return rateLimitResponse(rl.reset)

  let ctx
  try {
    ctx = await getTenantContext()
  } catch (e) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    throw e
  }

  const config = await prisma.restaurantConfig.findUnique({
    where: { companyId: ctx.companyId },
  })

  return apiSuccess(config)
}

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!rl.success) return rateLimitResponse(rl.reset)

  let ctx
  try {
    ctx = await getTenantContext()
  } catch (e) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    throw e
  }

  try {
    requireRole(ctx.role, 'EMPLOYEE')
  } catch {
    return apiError('Accès refusé', 403)
  }

  let body
  try {
    body = configSchema.parse(await req.json())
  } catch (e) {
    return apiError('Données invalides', 400, e)
  }

  const config = await prisma.restaurantConfig.upsert({
    where: { companyId: ctx.companyId },
    update: {
      ...body,
      taxRate: body.taxRate !== undefined ? body.taxRate : undefined,
      serviceCharge: body.serviceCharge !== undefined ? body.serviceCharge : undefined,
      loyaltyPointsRate: body.loyaltyPointsRate !== undefined ? body.loyaltyPointsRate : undefined,
      deliveryFeeDefault: body.deliveryFeeDefault !== undefined ? body.deliveryFeeDefault : undefined,
    },
    create: {
      companyId: ctx.companyId,
      name: body.name,
      address: body.address,
      phone: body.phone,
      logo: body.logo,
      currency: body.currency,
      taxRate: body.taxRate,
      serviceCharge: body.serviceCharge,
      receiptFooter: body.receiptFooter,
      tablePrefix: body.tablePrefix,
      orderPrefix: body.orderPrefix,
      enableQrMenu: body.enableQrMenu,
      enableLoyalty: body.enableLoyalty,
      loyaltyPointsRate: body.loyaltyPointsRate,
      enableDelivery: body.enableDelivery,
      deliveryFeeDefault: body.deliveryFeeDefault,
      activeStations: body.activeStations,
    },
  })

  return apiSuccess(config, 200)
}
