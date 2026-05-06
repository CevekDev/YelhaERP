import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { z } from 'zod'

const statsQuerySchema = z.object({
  period: z.enum(['today', 'week', 'month']).default('today'),
})

function getDateRange(period: string): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date()
  const end = new Date()
  end.setTime(now.getTime())

  if (period === 'today') {
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
  } else if (period === 'week') {
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    start.setDate(diff)
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
  } else if (period === 'month') {
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
  }

  return { start, end }
}

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)

  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'EMPLOYEE')

    const { searchParams } = req.nextUrl
    const query = statsQuerySchema.safeParse(Object.fromEntries(searchParams))
    if (!query.success) return apiError('Paramètres invalides', 400)

    const { period } = query.data
    const { start, end } = getDateRange(period)

    const [closedOrders, allOrders, tables] = await Promise.all([
      prisma.restaurantOrder.findMany({
        where: {
          companyId: ctx.companyId,
          status: 'CLOSED',
          createdAt: { gte: start, lte: end },
        },
        include: {
          lines: {
            where: { status: { not: 'CANCELLED' } },
            select: { name: true, quantity: true, price: true, menuItemId: true },
          },
        },
      }),
      prisma.restaurantOrder.findMany({
        where: {
          companyId: ctx.companyId,
          createdAt: { gte: start, lte: end },
        },
        select: { type: true },
      }),
      prisma.restaurantTable.findMany({
        where: { companyId: ctx.companyId, isActive: true },
        select: { status: true },
      }),
    ])

    // Revenue
    const revenue = closedOrders.reduce((sum, o) => sum + Number(o.total), 0)
    const ordersCount = allOrders.length
    const avgTicket = ordersCount > 0 ? revenue / closedOrders.length : 0

    // Top items
    const itemMap = new Map<string, { name: string; qty: number; revenue: number }>()
    for (const order of closedOrders) {
      for (const line of order.lines) {
        const existing = itemMap.get(line.menuItemId)
        const lineRevenue = Number(line.price) * line.quantity
        if (existing) {
          existing.qty += line.quantity
          existing.revenue += lineRevenue
        } else {
          itemMap.set(line.menuItemId, { name: line.name, qty: line.quantity, revenue: lineRevenue })
        }
      }
    }

    const topItems = Array.from(itemMap.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10)

    // Orders by type
    const ordersByType = { DINE_IN: 0, TAKEAWAY: 0, DELIVERY: 0 }
    for (const o of allOrders) {
      ordersByType[o.type]++
    }

    // Table occupancy
    const totalTables = tables.length
    const occupiedTables = tables.filter(t => t.status === 'OCCUPIED').length
    const tableOccupancy = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0

    // Revenue by hour (today only)
    const revenueByHour: Array<{ hour: number; revenue: number }> = []
    if (period === 'today') {
      const hourMap = new Map<number, number>()
      for (const order of closedOrders) {
        const hour = new Date(order.createdAt).getHours()
        hourMap.set(hour, (hourMap.get(hour) ?? 0) + Number(order.total))
      }
      for (let h = 0; h < 24; h++) {
        revenueByHour.push({ hour: h, revenue: hourMap.get(h) ?? 0 })
      }
    }

    return apiSuccess({
      revenue,
      ordersCount,
      avgTicket,
      topItems,
      ordersByType,
      tableOccupancy,
      revenueByHour,
      period,
      dateRange: { start: start.toISOString(), end: end.toISOString() },
    })
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
