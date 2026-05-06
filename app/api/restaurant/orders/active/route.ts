import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess } from '@/lib/security/api-response'

export async function GET(req: NextRequest) {
  // No rate limiting — this route is polled frequently from KDS/floor plan
  void req // suppress unused warning

  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'EMPLOYEE')

    const orders = await prisma.restaurantOrder.findMany({
      where: {
        companyId: ctx.companyId,
        status: { notIn: ['CANCELLED', 'CLOSED'] },
      },
      include: {
        table: { select: { id: true, number: true, status: true } },
        lines: {
          select: {
            id: true,
            name: true,
            quantity: true,
            price: true,
            status: true,
            notes: true,
            menuItemId: true,
          },
        },
        kdsTickets: {
          select: {
            id: true,
            station: true,
            status: true,
            priority: true,
            createdAt: true,
            acceptedAt: true,
            doneAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return apiSuccess({ orders, count: orders.length })
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
