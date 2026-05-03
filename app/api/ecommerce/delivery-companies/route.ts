import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getTenantContext } from '@/lib/security/tenant'
import { apiSuccess, apiError } from '@/lib/security/api-response'

const createSchema = z.object({
  name:          z.string().min(1).max(100),
  slug:          z.enum(['MANUAL','YALIDINE','MAYSTRO','PROCOLIS','ECOTRACK','GUEPEX','ZR_EXPRESS','OTHER']).default('OTHER'),
  isDefault:     z.boolean().default(false),
  apiKey:        z.string().max(500).optional(),
  apiSecret:     z.string().max(500).optional(),
  webhookSecret: z.string().max(500).optional(),
  options:       z.array(z.object({
    name:        z.string().min(1).max(100),
    price:       z.number().min(0),
    description: z.string().max(200).optional(),
  })).optional(),
})

export async function GET() {
  const ctx = await getTenantContext()
  if (!ctx) return apiError('Non autorisé', 401)

  const companies = await prisma.deliveryCompany.findMany({
    where: { companyId: ctx.companyId },
    include: {
      deliveryOptions: { where: { isActive: true } },
      _count: { select: { orders: true, drivers: true } },
    },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  })
  return apiSuccess(companies)
}

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx) return apiError('Non autorisé', 401)

  let body: unknown
  try { body = await req.json() } catch { return apiError('Corps invalide', 400) }
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return apiError('Données invalides: ' + JSON.stringify(parsed.error.flatten().fieldErrors), 400)

  const { options, isDefault, ...data } = parsed.data

  const company = await prisma.$transaction(async (tx) => {
    // If setting as default, unset others
    if (isDefault) {
      await tx.deliveryCompany.updateMany({
        where: { companyId: ctx.companyId, isDefault: true },
        data: { isDefault: false },
      })
    }
    const dc = await tx.deliveryCompany.create({
      data: {
        companyId: ctx.companyId,
        isDefault,
        ...data,
        deliveryOptions: options?.length ? {
          create: options.map(o => ({ name: o.name, price: o.price, description: o.description }))
        } : undefined,
      },
      include: { deliveryOptions: true },
    })
    return dc
  })

  return apiSuccess(company, 201)
}
