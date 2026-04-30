import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { z } from 'zod'

const componentSchema = z.object({
  productId: z.string(),
  quantity: z.number().positive(),
  unit: z.string().optional(),
  notes: z.string().optional(),
})

const schema = z.object({
  productId: z.string(),
  name: z.string().min(1),
  version: z.string().default('1.0'),
  yieldQty: z.number().positive().default(1),
  components: z.array(componentSchema).min(1),
})

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    const boms = await prisma.bOM.findMany({
      where: { companyId: ctx.companyId, isActive: true },
      include: {
        product: { select: { name: true, sku: true } },
        components: { include: { product: { select: { name: true, sku: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return apiSuccess(boms)
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
    const { productId, name, version, yieldQty, components } = parsed.data
    const bom = await prisma.bOM.create({
      data: {
        companyId: ctx.companyId,
        productId,
        name,
        version,
        yieldQty,
        components: { create: components },
      },
      include: { components: true },
    })
    return apiSuccess(bom, 201)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non autorisé', 401)
    if (e instanceof Error && e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    return apiError('Erreur serveur', 500, e)
  }
}
