import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { leadSchema, leadQuerySchema } from '@/lib/validations/crm'

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)

  try {
    const ctx = await getTenantContext()
    const { searchParams } = req.nextUrl
    const query = leadQuerySchema.safeParse(Object.fromEntries(searchParams))
    if (!query.success) return apiError('Paramètres invalides', 400)

    const { page, limit, search, stage, source, assignedTo } = query.data
    const skip = (page - 1) * limit

    const where = {
      companyId: ctx.companyId,
      ...(stage && { stage }),
      ...(source && { source }),
      ...(assignedTo && { assignedTo }),
      ...(search && {
        OR: [
          { lastName: { contains: search, mode: 'insensitive' as const } },
          { firstName: { contains: search, mode: 'insensitive' as const } },
          { company: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          company: true,
          email: true,
          phone: true,
          source: true,
          stage: true,
          score: true,
          expectedValue: true,
          expectedClose: true,
          assignedTo: true,
          convertedAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      prisma.lead.count({ where }),
    ])

    return apiSuccess({ leads, total, page, limit, pages: Math.ceil(total / limit) })
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

    const parsed = leadSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422, parsed.error.flatten())

    const { expectedValue, expectedClose, ...rest } = parsed.data

    const lead = await prisma.lead.create({
      data: {
        ...rest,
        companyId: ctx.companyId,
        ...(expectedValue != null && { expectedValue: expectedValue.toString() }),
        ...(expectedClose != null && { expectedClose: new Date(expectedClose) }),
      },
    })

    return apiSuccess(lead, 201)
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
