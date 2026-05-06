import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/security/api-response'
import { z } from 'zod'

// PUBLIC route — no auth required
// Rate limited by IP: max 10 orders per hour per IP

const QR_ORDER_LIMIT = 10
const QR_ORDER_WINDOW_MS = 60 * 60 * 1000 // 1 hour

const ipOrderCounts = new Map<string, { count: number; resetAt: number }>()

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  return forwarded ? forwarded.split(',')[0].trim() : req.headers.get('x-real-ip') ?? 'unknown'
}

function checkIpRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = ipOrderCounts.get(ip)

  if (!entry || now > entry.resetAt) {
    ipOrderCounts.set(ip, { count: 1, resetAt: now + QR_ORDER_WINDOW_MS })
    return true
  }

  if (entry.count >= QR_ORDER_LIMIT) return false

  entry.count++
  return true
}

const qrOrderSchema = z.object({
  lines: z.array(z.object({
    menuItemId: z.string(),
    quantity: z.number().int().min(1),
    notes: z.string().max(500).optional(),
  })).min(1),
  customerName: z.string().max(200).optional(),
  notes: z.string().max(1000).optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { tableToken: string } }
) {
  const ip = getClientIp(req)
  if (!checkIpRateLimit(ip)) {
    return apiError('Trop de commandes. Réessayez dans une heure.', 429)
  }

  try {
    let body: unknown
    try { body = await req.json() } catch { return apiError('Corps invalide', 400) }

    const parsed = qrOrderSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422, parsed.error.flatten())

    const data = parsed.data

    // Find table by QR token
    const table = await prisma.restaurantTable.findFirst({
      where: { qrToken: params.tableToken, isActive: true },
    })
    if (!table) return apiError('Table introuvable ou QR code invalide', 404)

    const companyId = table.companyId

    // Fetch menu items
    const menuItemIds = data.lines.map(l => l.menuItemId)
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, companyId, isActive: true, isAvailable: true },
      include: { ingredients: true },
    })

    if (menuItems.length !== menuItemIds.length) {
      return apiError('Un ou plusieurs articles introuvables ou indisponibles', 404)
    }

    const menuItemMap = new Map(menuItems.map(m => [m.id, m]))

    // Get config
    const config = await prisma.restaurantConfig.findUnique({
      where: { companyId },
    })

    if (config && !config.enableQrMenu) {
      return apiError('La commande QR n\'est pas activée', 403)
    }

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
    const total = subtotal + taxAmount + serviceChargeAmount

    const order = await prisma.$transaction(async (tx) => {
      // Upsert sequence
      const seq = await tx.restaurantOrderSequence.upsert({
        where: { companyId },
        update: { seq: { increment: 1 } },
        create: { companyId, seq: 1 },
      })
      const year = new Date().getFullYear()
      const number = `CMD-${year}-${String(seq.seq).padStart(4, '0')}`

      // Create order
      const created = await tx.restaurantOrder.create({
        data: {
          companyId,
          number,
          type: 'DINE_IN',
          tableId: table.id,
          customerName: data.customerName,
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

      // Update table to OCCUPIED
      await tx.restaurantTable.update({
        where: { id: table.id },
        data: { status: 'OCCUPIED' },
      })

      // Create KDS ticket
      await tx.kdsTicket.create({
        data: {
          companyId,
          orderId: created.id,
          station: 'MAIN',
          status: 'NEW',
        },
      })

      // Handle ingredient movements
      for (const line of data.lines) {
        const item = menuItemMap.get(line.menuItemId)!
        if (item.ingredients && item.ingredients.length > 0) {
          for (const ingr of item.ingredients) {
            const consumed = Number(ingr.quantity) * line.quantity
            await tx.ingredientMovement.create({
              data: {
                companyId,
                ingredientId: ingr.ingredientId,
                type: 'OUT',
                quantity: consumed,
                reference: number,
                note: `Commande QR ${number}`,
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

    return apiSuccess({
      orderId: order.id,
      number: order.number,
      status: order.status,
      total: order.total,
      message: 'Commande envoyée en cuisine!',
    }, 201)
  } catch {
    return apiError('Erreur serveur', 500)
  }
}
