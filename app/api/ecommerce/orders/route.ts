import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getTenantContext } from '@/lib/security/tenant'
import { apiSuccess, apiError } from '@/lib/security/api-response'

const createSchema = z.object({
  customerName:        z.string().min(1).max(100),
  customerFirstName:   z.string().max(100).optional(),
  customerPhone:       z.string().min(9).max(20),
  customerPhone2:      z.string().max(20).optional(),
  customerAddress:     z.string().min(1).max(500),
  customerWilaya:      z.string().min(1).max(100),
  customerCommune:     z.string().max(100).optional(),
  productDescription:  z.string().min(1).max(500),
  productPrice:        z.number().min(0),
  quantity:            z.number().int().positive().default(1),
  deliveryCompanyId:   z.string().optional(),
  deliveryOptionId:    z.string().optional(),
  deliveryDriverId:    z.string().optional(),
  deliveryFee:         z.number().min(0).default(0),
  notes:               z.string().max(1000).optional(),
})

export async function GET(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx) return apiError('Non autorisé', 401)

  const url = req.nextUrl
  const status  = url.searchParams.get('status')
  const search  = url.searchParams.get('search') ?? ''
  const page    = Math.max(1, Number(url.searchParams.get('page') ?? 1))
  const limit   = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? 20)))

  const where: Record<string, unknown> = { companyId: ctx.companyId }
  if (status && status !== 'ALL') where.status = status
  if (search) {
    where.OR = [
      { customerName:  { contains: search, mode: 'insensitive' } },
      { customerPhone: { contains: search } },
      { orderNumber:   { contains: search } },
    ]
  }

  const [orders, total] = await Promise.all([
    prisma.ecomOrder.findMany({
      where,
      include: {
        deliveryCompany: { select: { id: true, name: true, slug: true } },
        deliveryOption:  { select: { id: true, name: true, price: true } },
        driver:          { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: (page - 1) * limit,
    }),
    prisma.ecomOrder.count({ where }),
  ])

  return apiSuccess({ orders, total, page, limit, pages: Math.ceil(total / limit) })
}

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx) return apiError('Non autorisé', 401)

  let body: unknown
  try { body = await req.json() } catch { return apiError('Corps invalide', 400) }
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return apiError('Données invalides: ' + JSON.stringify(parsed.error.flatten().fieldErrors), 400)

  const d = parsed.data
  const total = Math.round((d.productPrice * d.quantity + d.deliveryFee) * 100) / 100

  // Auto-assign default delivery company if none specified
  let deliveryCompanyId = d.deliveryCompanyId
  if (!deliveryCompanyId) {
    const def = await prisma.deliveryCompany.findFirst({
      where: { companyId: ctx.companyId, isDefault: true, isActive: true },
    })
    if (def) deliveryCompanyId = def.id
  }

  const count = await prisma.ecomOrder.count({ where: { companyId: ctx.companyId } })
  const orderNumber = `CMD-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`

  const order = await prisma.ecomOrder.create({
    data: {
      companyId:           ctx.companyId,
      orderNumber,
      customerName:        d.customerName,
      customerFirstName:   d.customerFirstName,
      customerPhone:       d.customerPhone,
      customerPhone2:      d.customerPhone2,
      customerAddress:     d.customerAddress,
      customerWilaya:      d.customerWilaya,
      customerCommune:     d.customerCommune,
      productDescription:  d.productDescription,
      productPrice:        d.productPrice,
      quantity:            d.quantity,
      deliveryCompanyId:   deliveryCompanyId,
      deliveryOptionId:    d.deliveryOptionId,
      deliveryDriverId:    d.deliveryDriverId,
      deliveryFee:         d.deliveryFee,
      total,
      notes:               d.notes,
    },
    include: {
      deliveryCompany: { select: { id: true, name: true } },
      deliveryOption:  { select: { id: true, name: true } },
    },
  })

  // Create initial status history
  await prisma.ecomStatusHistory.create({
    data: { orderId: order.id, status: 'PENDING', source: 'MANUAL', note: 'Commande créée' },
  })

  return apiSuccess(order, 201)
}
