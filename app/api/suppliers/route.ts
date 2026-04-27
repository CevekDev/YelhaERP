import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { clientSchema, clientQuerySchema } from '@/lib/validations/client'

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    const q = clientQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams))
    if (!q.success) return apiError('Paramètres invalides', 400)
    const { page, limit, search, wilaya } = q.data
    const where = {
      companyId: ctx.companyId,
      ...(search && { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { nif: { contains: search } }] }),
      ...(wilaya && { wilaya }),
    }
    const [suppliers, total] = await Promise.all([
      prisma.supplier.findMany({ where, orderBy: { name: 'asc' }, take: limit, skip: (page - 1) * limit }),
      prisma.supplier.count({ where }),
    ])
    return apiSuccess({ suppliers, total, page, limit })
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
    const body = await req.json().catch(() => null)
    const parsed = clientSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422)
    const supplier = await prisma.supplier.create({ data: { ...parsed.data, companyId: ctx.companyId } })
    return apiSuccess(supplier, 201)
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
