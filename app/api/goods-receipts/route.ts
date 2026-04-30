import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { z } from 'zod'

const lineSchema = z.object({
  productId: z.string().optional(),
  description: z.string(),
  orderedQty: z.number().positive(),
  receivedQty: z.number().min(0),
  unitCost: z.number().min(0),
})

const schema = z.object({
  purchaseOrderId: z.string(),
  number: z.string().min(1),
  receivedDate: z.string(),
  warehouseId: z.string().optional(),
  notes: z.string().optional(),
  lines: z.array(lineSchema).min(1),
})

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    const receipts = await prisma.goodsReceipt.findMany({
      where: { companyId: ctx.companyId },
      include: { purchaseOrder: { include: { supplier: { select: { name: true } } } }, lines: true },
      orderBy: { receivedDate: 'desc' },
    })
    return apiSuccess(receipts)
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

    const { purchaseOrderId, number, receivedDate, warehouseId, notes, lines } = parsed.data

    const po = await prisma.purchaseOrder.findFirst({ where: { id: purchaseOrderId, companyId: ctx.companyId } })
    if (!po) return apiError('Bon de commande introuvable', 404)

    const receipt = await prisma.goodsReceipt.create({
      data: {
        companyId: ctx.companyId,
        purchaseOrderId,
        number,
        receivedDate: new Date(receivedDate),
        warehouseId: warehouseId ?? null,
        notes: notes ?? null,
        status: 'PENDING',
        lines: { create: lines },
      },
      include: { lines: true },
    })
    return apiSuccess(receipt, 201)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non autorisé', 401)
    if (e instanceof Error && e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    return apiError('Erreur serveur', 500, e)
  }
}
