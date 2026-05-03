import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getTenantContext } from '@/lib/security/tenant'
import { apiSuccess, apiError } from '@/lib/security/api-response'

const STATUS_TIMESTAMPS: Partial<Record<string, string>> = {
  CONFIRMED:        'confirmedAt',
  SHIPPED:          'shippedAt',
  DELIVERED:        'deliveredAt',
  RETURNED:         'returnedAt',
}

const patchSchema = z.object({
  status:            z.enum(['PENDING','CONFIRMED','SHIPPED','OUT_FOR_DELIVERY','DELIVERED','NO_ANSWER','RETURNED','CANCELLED']).optional(),
  deliveryDriverId:  z.string().nullable().optional(),
  deliveryCompanyId: z.string().nullable().optional(),
  deliveryOptionId:  z.string().nullable().optional(),
  trackingNumber:    z.string().max(100).nullable().optional(),
  isPaid:            z.boolean().optional(),
  notes:             z.string().max(1000).nullable().optional(),
  note:              z.string().max(500).optional(),
})

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getTenantContext()
  if (!ctx) return apiError('Non autorisé', 401)

  const order = await prisma.ecomOrder.findFirst({
    where: { id: params.id, companyId: ctx.companyId },
    include: {
      deliveryCompany: true,
      deliveryOption:  true,
      driver:          true,
      statusHistory:   { orderBy: { createdAt: 'desc' } },
    },
  })
  if (!order) return apiError('Commande introuvable', 404)
  return apiSuccess(order)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getTenantContext()
  if (!ctx) return apiError('Non autorisé', 401)

  const order = await prisma.ecomOrder.findFirst({
    where: { id: params.id, companyId: ctx.companyId },
  })
  if (!order) return apiError('Commande introuvable', 404)

  let body: unknown
  try { body = await req.json() } catch { return apiError('Corps invalide', 400) }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return apiError('Données invalides', 400)

  const { status, note, ...rest } = parsed.data

  // Build update data
  const updateData: Record<string, unknown> = { ...rest }
  if (status && status !== order.status) {
    updateData.status = status
    const tsField = STATUS_TIMESTAMPS[status]
    if (tsField) updateData[tsField] = new Date()
  }

  const updated = await prisma.$transaction(async (tx) => {
    const upd = await tx.ecomOrder.update({
      where: { id: params.id },
      data: updateData,
      include: {
        deliveryCompany: { select: { id: true, name: true } },
        deliveryOption:  { select: { id: true, name: true } },
        driver:          { select: { id: true, name: true, phone: true } },
      },
    })
    if (status && status !== order.status) {
      await tx.ecomStatusHistory.create({
        data: { orderId: params.id, status: status as never, source: 'MANUAL', note },
      })
    }
    return upd
  })

  return apiSuccess(updated)
}
