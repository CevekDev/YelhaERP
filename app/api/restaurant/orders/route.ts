import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { z } from 'zod'

const orderQuerySchema = z.object({
  status: z.string().optional(),
  type: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

const createOrderSchema = z.object({
  type: z.enum(['DINE_IN', 'TAKEAWAY', 'DELIVERY']),
  tableId: z.string().optional(),
  guestCount: z.number().int().min(1).optional(),
  customerName: z.string().max(200).optional(),
  customerPhone: z.string().max(50).optional(),
  customerAddress: z.string().max(500).optional(),
  deliveryFee: z.number().min(0).default(0),
  loyaltyClientId: z.string().optional(),
  notes: z.string().max(1000).optional(),
  lines: z.array(z.object({
    menuItemId: z.string(),
    quantity: z.number().int().min(1),
    notes: z.string().max(500).optional(),
  })).min(1),
}).superRefine((data, ctx) => {
  if (data.type === 'DINE_IN' && !data.tableId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'tableId requis pour DINE_IN', path: ['tableId'] })
  }
  if (data.type === 'DELIVERY' && !data.customerAddress) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'customerAddress requis pour DELIVERY', path: ['customerAddress'] })
  }
})

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)

  try {
    const ctx = await getTenantContext()
    const { searchParams } = req.nextUrl
    const query = orderQuerySchema.safeParse(Object.fromEntries(searchParams))
    if (!query.success) return apiError('Paramètres invalides', 400)

    const { page, limit, status, type, date } = query.data
    const skip = (page - 1) * limit

    let dateFilter: { gte?: Date; lt?: Date } | undefined
    if (date) {
      const d = new Date(date)
      const next = new Date(date)
      next.setDate(next.getDate() + 1)
      dateFilter = { gte: d, lt: next }
    }

    const where = {
      companyId: ctx.companyId,
      ...(status && { status: status as never }),
      ...(type && { type: type as never }),
      ...(dateFilter && { createdAt: dateFilter }),
    }

    const [orders, total] = await Promise.all([
      prisma.restaurantOrder.findMany({
        where,
        include: {
          table: { select: { id: true, number: true } },
          lines: { select: { id: true, name: true, quantity: true, price: true, status: true, notes: true } },
          loyaltyClient: { select: { id: true, name: true, points: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.restaurantOrder.count({ where }),
    ])

    return apiSuccess({ orders, total, page, limit, pages: Math.ceil(total / limit) })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500)
  }
}

export async function POST(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)

  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'EMPLOYEE')

    let body: unknown
    try { body = await req.json() } catch { return apiError('Corps invalide', 400) }

    const parsed = createOrderSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422, parsed.error.flatten())

    const data = parsed.data

    // Verify table belongs to company
    if (data.type === 'DINE_IN' && data.tableId) {
      const table = await prisma.restaurantTable.findFirst({
        where: { id: data.tableId, companyId: ctx.companyId, isActive: true },
      })
      if (!table) return apiError('Table introuvable', 404)
    }

    // Verify loyalty client belongs to company
    if (data.loyaltyClientId) {
      const lc = await prisma.loyaltyClient.findFirst({
        where: { id: data.loyaltyClientId, companyId: ctx.companyId },
      })
      if (!lc) return apiError('Client fidélité introuvable', 404)
    }

    // Fetch all menu items
    const menuItemIds = data.lines.map(l => l.menuItemId)
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, companyId: ctx.companyId, isActive: true },
      include: { ingredients: true },
    })

    if (menuItems.length !== menuItemIds.length) {
      return apiError('Un ou plusieurs articles introuvables ou inactifs', 404)
    }

    const menuItemMap = new Map(menuItems.map(m => [m.id, m]))

    // Get restaurant config
    const config = await prisma.restaurantConfig.findUnique({
      where: { companyId: ctx.companyId },
    })

    // Calculate totals
    let subtotal = 0
    let taxAmount = 0

    for (const line of data.lines) {
      const item = menuItemMap.get(line.menuItemId)!
      const itemPrice = Number(item.price)
      const taxRate = Number(item.taxRate)
      subtotal += itemPrice * line.quantity
      taxAmount += itemPrice * line.quantity * (taxRate / 100)
    }

    const serviceChargeRate = config ? Number(config.serviceCharge) : 0
    const serviceChargeAmount = (subtotal + taxAmount) * (serviceChargeRate / 100)
    const deliveryFee = data.deliveryFee ?? 0
    const total = subtotal + taxAmount + serviceChargeAmount + deliveryFee

    // Transaction
    const order = await prisma.$transaction(async (tx) => {
      // 1. Upsert sequence
      const seq = await tx.restaurantOrderSequence.upsert({
        where: { companyId: ctx.companyId },
        update: { seq: { increment: 1 } },
        create: { companyId: ctx.companyId, seq: 1 },
      })
      const year = new Date().getFullYear()
      const number = `CMD-${year}-${String(seq.seq).padStart(4, '0')}`

      // 2. Create order
      const created = await tx.restaurantOrder.create({
        data: {
          companyId: ctx.companyId,
          number,
          type: data.type,
          tableId: data.tableId,
          guestCount: data.guestCount,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerAddress: data.customerAddress,
          deliveryFee,
          loyaltyClientId: data.loyaltyClientId,
          notes: data.notes,
          subtotal,
          taxAmount,
          serviceCharge: serviceChargeAmount,
          total,
          lines: {
            create: data.lines.map(line => {
              const item = menuItemMap.get(line.menuItemId)!
              const itemPrice = Number(item.price)
              const taxRate = Number(item.taxRate)
              const lineTotal = itemPrice * line.quantity * (1 + taxRate / 100)
              return {
                menuItemId: line.menuItemId,
                name: item.name,
                price: itemPrice,
                taxRate,
                quantity: line.quantity,
                total: lineTotal,
                notes: line.notes,
              }
            }),
          },
        },
        include: { lines: true },
      })

      // 3. Update table status to OCCUPIED
      if (data.type === 'DINE_IN' && data.tableId) {
        await tx.restaurantTable.update({
          where: { id: data.tableId },
          data: { status: 'OCCUPIED' },
        })
      }

      // 4. Create KDS ticket for MAIN station
      await tx.kdsTicket.create({
        data: {
          companyId: ctx.companyId,
          orderId: created.id,
          station: 'MAIN',
          status: 'NEW',
        },
      })

      // 5. Handle ingredient stock movements
      for (const line of data.lines) {
        const item = menuItemMap.get(line.menuItemId)!
        if (item.ingredients && item.ingredients.length > 0) {
          for (const ingr of item.ingredients) {
            const consumed = Number(ingr.quantity) * line.quantity
            await tx.ingredientMovement.create({
              data: {
                companyId: ctx.companyId,
                ingredientId: ingr.ingredientId,
                type: 'OUT',
                quantity: consumed,
                reference: number,
                note: `Commande ${number}`,
              },
            })
            await tx.ingredient.update({
              where: { id: ingr.ingredientId },
              data: { currentStock: { decrement: consumed } },
            })
          }
        }
      }

      return created
    })

    // Post-transaction: check low stock and create notifications
    const ingredientIds = menuItems.flatMap(m => m.ingredients.map(i => i.ingredientId))
    if (ingredientIds.length > 0) {
      prisma.ingredient.findMany({
        where: {
          id: { in: ingredientIds },
          companyId: ctx.companyId,
        },
      }).then(async (ingredients) => {
        for (const ing of ingredients) {
          if (Number(ing.currentStock) < Number(ing.minStock)) {
            await prisma.notification.create({
              data: {
                companyId: ctx.companyId,
                type: 'STOCK_ALERT',
                title: 'Stock ingrédient bas',
                message: `L'ingrédient "${ing.name}" est sous le seuil minimum (${ing.currentStock} ${ing.unit})`,
                priority: 'HIGH',
              },
            }).catch(() => {})
          }
        }
      }).catch(() => {})
    }

    // Fetch full order with relations
    const fullOrder = await prisma.restaurantOrder.findUnique({
      where: { id: order.id },
      include: {
        table: { select: { id: true, number: true } },
        lines: true,
        loyaltyClient: { select: { id: true, name: true, points: true } },
        kdsTickets: true,
      },
    })

    return apiSuccess(fullOrder, 201)
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
