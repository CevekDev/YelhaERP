import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

function pad(str: string, width: number, char = '.'): string {
  if (str.length >= width) return str.substring(0, width)
  return str + char.repeat(width - str.length)
}

function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`
}

function formatAmount(n: number): string {
  return n.toFixed(2)
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)

  try {
    const ctx = await getTenantContext()

    const order = await prisma.restaurantOrder.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
      include: {
        table: { select: { id: true, number: true } },
        lines: {
          include: {
            menuItem: { select: { id: true, name: true } },
          },
        },
        loyaltyClient: { select: { id: true, name: true, points: true } },
      },
    })

    if (!order) return apiError('Commande introuvable', 404)

    const config = await prisma.restaurantConfig.findUnique({
      where: { companyId: ctx.companyId },
    })

    const restaurantName = config?.name ?? 'Restaurant'
    const restaurantAddress = config?.address ?? ''
    const restaurantPhone = config?.phone ?? ''
    const receiptFooter = config?.receiptFooter ?? 'Merci de votre visite!'

    const LINE = '================================'
    const DASH = '--------------------------------'
    const WIDTH = 32 // effective content width

    const typeLabel =
      order.type === 'DINE_IN' ? 'Sur place' :
      order.type === 'TAKEAWAY' ? 'À emporter' :
      'Livraison'

    const tableStr = order.type === 'DINE_IN' && order.table
      ? ` — Table T${order.table.number}`
      : ''

    let text = ''
    text += LINE + '\n'
    text += restaurantName.padStart(Math.ceil((LINE.length + restaurantName.length) / 2)).padEnd(LINE.length) + '\n'
    if (restaurantAddress || restaurantPhone) {
      const info = [restaurantAddress, restaurantPhone ? `Tel: ${restaurantPhone}` : ''].filter(Boolean).join(' — ')
      text += info.substring(0, LINE.length) + '\n'
    }
    text += LINE + '\n'
    text += `Commande N° ${order.number}\n`
    text += `${typeLabel}${tableStr}\n`
    text += `Date: ${formatDate(new Date(order.createdAt))}\n`
    text += DASH + '\n'

    for (const line of order.lines) {
      if (line.status === 'CANCELLED') continue
      const name = line.name.substring(0, 18)
      const qtyPrice = `${line.quantity} × ${formatAmount(Number(line.price))} DA`
      text += `${pad(name, WIDTH - qtyPrice.length, ' ')}${qtyPrice}\n`
      if (line.notes) {
        text += `  └ ${line.notes.substring(0, WIDTH - 4)}\n`
      }
    }

    text += DASH + '\n'
    text += `${pad('Sous-total:', WIDTH - formatAmount(Number(order.subtotal)).length - 3, '.')}${formatAmount(Number(order.subtotal))} DA\n`
    text += `${pad('TVA:', WIDTH - formatAmount(Number(order.taxAmount)).length - 3, '.')}${formatAmount(Number(order.taxAmount))} DA\n`

    if (Number(order.serviceCharge) > 0) {
      text += `${pad('Service:', WIDTH - formatAmount(Number(order.serviceCharge)).length - 3, '.')}${formatAmount(Number(order.serviceCharge))} DA\n`
    }
    if (Number(order.deliveryFee) > 0) {
      text += `${pad('Livraison:', WIDTH - formatAmount(Number(order.deliveryFee)).length - 3, '.')}${formatAmount(Number(order.deliveryFee))} DA\n`
    }
    if (Number(order.discount) > 0) {
      text += `${pad('Remise:', WIDTH - formatAmount(Number(order.discount)).length - 4, '.')}-${formatAmount(Number(order.discount))} DA\n`
    }

    text += LINE + '\n'
    text += `${pad('TOTAL:', WIDTH - formatAmount(Number(order.total)).length - 3, '.')}${formatAmount(Number(order.total))} DA\n`
    text += LINE + '\n'

    if (order.paymentStatus === 'PAID' && order.paymentMethod === 'CASH') {
      text += `${pad('Payé (Espèces):', WIDTH - formatAmount(Number(order.total)).length - 3, '.')}${formatAmount(Number(order.total))} DA\n`
    }

    text += `${receiptFooter}\n`
    text += LINE + '\n'

    return apiSuccess({ text, order })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500)
  }
}
