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
    const { searchParams } = req.nextUrl
    const query = clientQuerySchema.safeParse(Object.fromEntries(searchParams))
    if (!query.success) return apiError('Paramètres invalides', 400)

    const { page, limit, search, wilaya } = query.data
    const skip = (page - 1) * limit

    const where = {
      companyId: ctx.companyId,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { nif: { contains: search } },
        ],
      }),
      ...(wilaya && { wilaya }),
    }

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        select: { id: true, name: true, email: true, phone: true, nif: true, wilaya: true, createdAt: true },
        orderBy: { name: 'asc' },
        take: limit,
        skip,
      }),
      prisma.client.count({ where }),
    ])

    return apiSuccess({ clients, total, page, limit })
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

    let body: unknown
    try { body = await req.json() } catch { return apiError('Corps invalide', 400) }

    const parsed = clientSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422, parsed.error.flatten())

    const client = await prisma.client.create({
      data: { ...parsed.data, companyId: ctx.companyId },
    })

    return apiSuccess(client, 201)
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
