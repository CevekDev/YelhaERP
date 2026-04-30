import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { z } from 'zod'

const schema = z.object({
  title: z.string().min(2),
  department: z.string().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
  requirements: z.string().optional(),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  closingDate: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    const postings = await prisma.jobPosting.findMany({
      where: { companyId: ctx.companyId },
      include: { _count: { select: { applications: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return apiSuccess(postings)
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
    requireRole(ctx.role, 'ADMIN')
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 400, parsed.error.flatten())
    const posting = await prisma.jobPosting.create({
      data: {
        companyId: ctx.companyId,
        ...parsed.data,
        closingDate: parsed.data.closingDate ? new Date(parsed.data.closingDate) : undefined,
        status: 'OPEN',
      },
    })
    return apiSuccess(posting, 201)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non autorisé', 401)
    if (e instanceof Error && e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    return apiError('Erreur serveur', 500, e)
  }
}
