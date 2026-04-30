import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { z } from 'zod'

const createSchema = z.object({
  code: z.string().min(2).max(10),
  name: z.string().min(2),
  class: z.number().int().min(1).max(7),
  type: z.enum(['ACTIF', 'PASSIF', 'CHARGE', 'PRODUIT']),
  parentCode: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    const { searchParams } = req.nextUrl
    const classFilter = searchParams.get('class')
    const search = searchParams.get('search')
    const accounts = await prisma.accountPCN.findMany({
      where: {
        companyId: ctx.companyId,
        isActive: true,
        ...(classFilter && { class: Number(classFilter) }),
        ...(search && {
          OR: [
            { code: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: [{ class: 'asc' }, { code: 'asc' }],
    })
    return apiSuccess(accounts)
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
    requireRole(ctx.role, 'ACCOUNTANT')
    const body = await req.json()
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 400, parsed.error.flatten())
    const account = await prisma.accountPCN.create({
      data: { ...parsed.data, companyId: ctx.companyId },
    })
    return apiSuccess(account, 201)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non autorisé', 401)
    if (e instanceof Error && e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    return apiError('Erreur serveur', 500, e)
  }
}
