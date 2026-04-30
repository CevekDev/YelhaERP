import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { z } from 'zod'

const lineSchema = z.object({
  productId: z.string(),
  requestedQty: z.number().positive(),
})

const schema = z.object({
  fromWarehouseId: z.string(),
  toWarehouseId: z.string(),
  scheduledDate: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(lineSchema).min(1),
})

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    const transfers = await prisma.stockTransfer.findMany({
      where: { companyId: ctx.companyId },
      include: {
        fromWarehouse: { select: { name: true } },
        toWarehouse: { select: { name: true } },
        lines: { include: { product: { select: { name: true, sku: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return apiSuccess(transfers)
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
    const { fromWarehouseId, toWarehouseId, scheduledDate, notes, lines } = parsed.data
    const [fw, tw] = await Promise.all([
      prisma.warehouse.findFirst({ where: { id: fromWarehouseId, companyId: ctx.companyId } }),
      prisma.warehouse.findFirst({ where: { id: toWarehouseId, companyId: ctx.companyId } }),
    ])
    if (!fw || !tw) return apiError('Entrepôt introuvable', 404)
    const transfer = await prisma.stockTransfer.create({
      data: {
        companyId: ctx.companyId,
        fromWarehouseId,
        toWarehouseId,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        notes: notes ?? null,
        status: 'DRAFT',
        lines: { create: lines },
      },
      include: { lines: true },
    })
    return apiSuccess(transfer, 201)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non autorisé', 401)
    if (e instanceof Error && e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    return apiError('Erreur serveur', 500, e)
  }
}
