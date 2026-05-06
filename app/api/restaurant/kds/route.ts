import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { z } from 'zod'

const kdsQuerySchema = z.object({
  station: z.enum(['MAIN', 'GRILL', 'COLD', 'DRINKS', 'DESSERT']).default('MAIN'),
})

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)

  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'EMPLOYEE')

    const { searchParams } = req.nextUrl
    const query = kdsQuerySchema.safeParse(Object.fromEntries(searchParams))
    if (!query.success) return apiError('Paramètres invalides', 400)

    const { station } = query.data
    const now = Date.now()

    const tickets = await prisma.kdsTicket.findMany({
      where: {
        companyId: ctx.companyId,
        status: { in: ['NEW', 'ACCEPTED'] },
        station,
      },
      include: {
        order: {
          select: {
            id: true,
            number: true,
            type: true,
            status: true,
            guestCount: true,
            customerName: true,
            notes: true,
            createdAt: true,
            table: { select: { id: true, number: true } },
            lines: {
              where: { status: { not: 'CANCELLED' } },
              include: {
                menuItem: { select: { name: true, preparationTime: true } },
              },
            },
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' },
      ],
    })

    const enriched = tickets.map(ticket => {
      const elapsedMinutes = Math.floor((now - new Date(ticket.createdAt).getTime()) / 60000)
      const urgency: 'ok' | 'warning' | 'critical' =
        elapsedMinutes < 5 ? 'ok' :
        elapsedMinutes < 10 ? 'warning' :
        'critical'

      return {
        ...ticket,
        elapsedMinutes,
        urgency,
      }
    })

    return apiSuccess({ tickets: enriched, station })
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
