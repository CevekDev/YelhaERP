import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { z } from 'zod'

const schema = z.object({
  bomId: z.string(),
  number: z.string().min(1),
  plannedQty: z.number().positive(),
  scheduledStart: z.string().optional(),
  scheduledEnd: z.string().optional(),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    const { searchParams } = req.nextUrl
    const status = searchParams.get('status')
    const orders = await prisma.productionOrder.findMany({
      where: { companyId: ctx.companyId, ...(status ? { status: status as never } : {}) },
      include: { bom: { include: { product: { select: { name: true, sku: true } } } } },
      orderBy: { createdAt: 'desc' },
    })
    return apiSuccess(orders)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non autorisé', 401)
    return apiError('Erreur serveur', 500, e)
  }
}

export async function POST(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'EMPLOYEE')
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 400, parsed.error.flatten())
    const bom = await prisma.bOM.findFirst({ where: { id: parsed.data.bomId, companyId: ctx.companyId } })
    if (!bom) return apiError('BOM introuvable', 404)
    const order = await prisma.productionOrder.create({
      data: {
        companyId: ctx.companyId,
        bomId: parsed.data.bomId,
        number: parsed.data.number,
        plannedQty: parsed.data.plannedQty,
        scheduledStart: parsed.data.scheduledStart ? new Date(parsed.data.scheduledStart) : undefined,
        scheduledEnd: parsed.data.scheduledEnd ? new Date(parsed.data.scheduledEnd) : undefined,
        notes: parsed.data.notes,
        status: 'DRAFT',
      },
      include: { bom: true },
    })
    return apiSuccess(order, 201)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non autorisé', 401)
    if (e instanceof Error && e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    return apiError('Erreur serveur', 500, e)
  }
}
