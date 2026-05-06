import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { z } from 'zod'

const addLineSchema = z.object({
  menuItemId: z.string(),
  quantity: z.number().int().min(1),
  notes: z.string().max(500).optional(),
})

const deleteLineSchema = z.object({
  lineId: z.string(),
})

async function recalculateTotals(orderId: string, companyId: string) {
  const lines = await prisma.restaurantOrderLine.findMany({
    where: { orderId, status: { not: 'CANCELLED' } },
  })

  let subtotal = 0
  let taxAmount = 0
  for (const line of lines) {
    const price = Number(line.price)
    const tax = Number(line.taxRate)
    subtotal += price * line.quantity
    taxAmount += price * line.quantity * (tax / 100)
  }

  const config = await prisma.restaurantConfig.findUnique({ where: { companyId } })
  const serviceChargeRate = config ? Number(config.serviceCharge) : 0
  const serviceChargeAmount = (subtotal + taxAmount) * (serviceChargeRate / 100)

  const order = await prisma.restaurantOrder.findUnique({ where: { id: orderId } })
  const deliveryFee = order ? Number(order.deliveryFee) : 0
  const discount = order ? Number(order.discount) : 0
  const total = subtotal + taxAmount + serviceChargeAmount + deliveryFee - discount

  await prisma.restaurantOrder.update({
    where: { id: orderId },
    data: { subtotal, taxAmount, serviceCharge: serviceChargeAmount, total },
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)

  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'EMPLOYEE')

    let body: unknown
    try { body = await req.json() } catch { return apiError('Corps invalide', 400) }

    const parsed = addLineSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422, parsed.error.flatten())

    const order = await prisma.restaurantOrder.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
    })
    if (!order) return apiError('Commande introuvable', 404)

    if (!['PENDING', 'ACCEPTED'].includes(order.status)) {
      return apiError('Impossible d\'ajouter une ligne à une commande en cours de préparation ou terminée', 400)
    }

    const menuItem = await prisma.menuItem.findFirst({
      where: { id: parsed.data.menuItemId, companyId: ctx.companyId, isActive: true },
    })
    if (!menuItem) return apiError('Article introuvable ou inactif', 404)

    const price = Number(menuItem.price)
    const taxRate = Number(menuItem.taxRate)
    const lineTotal = price * parsed.data.quantity * (1 + taxRate / 100)

    const line = await prisma.restaurantOrderLine.create({
      data: {
        orderId: params.id,
        menuItemId: parsed.data.menuItemId,
        name: menuItem.name,
        price,
        taxRate,
        quantity: parsed.data.quantity,
        total: lineTotal,
        notes: parsed.data.notes,
      },
    })

    await recalculateTotals(params.id, ctx.companyId)

    const updatedOrder = await prisma.restaurantOrder.findUnique({
      where: { id: params.id },
      include: { lines: true },
    })

    return apiSuccess({ line, order: updatedOrder }, 201)
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)

  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'EMPLOYEE')

    let body: unknown
    try { body = await req.json() } catch { return apiError('Corps invalide', 400) }

    const parsed = deleteLineSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422, parsed.error.flatten())

    const order = await prisma.restaurantOrder.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
    })
    if (!order) return apiError('Commande introuvable', 404)

    if (!['PENDING', 'ACCEPTED'].includes(order.status)) {
      return apiError('Impossible de supprimer une ligne à ce stade', 400)
    }

    const line = await prisma.restaurantOrderLine.findFirst({
      where: { id: parsed.data.lineId, orderId: params.id },
    })
    if (!line) return apiError('Ligne introuvable', 404)

    await prisma.restaurantOrderLine.update({
      where: { id: parsed.data.lineId },
      data: { status: 'CANCELLED' },
    })

    await recalculateTotals(params.id, ctx.companyId)

    const updatedOrder = await prisma.restaurantOrder.findUnique({
      where: { id: params.id },
      include: { lines: true },
    })

    return apiSuccess(updatedOrder)
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
