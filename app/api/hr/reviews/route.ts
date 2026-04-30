import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { z } from 'zod'

const schema = z.object({
  employeeId: z.string(),
  reviewerId: z.string().optional(),
  period: z.string(),
  score: z.number().int().min(0).max(100).optional(),
  strengths: z.string().optional(),
  improvements: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    const reviews = await prisma.performanceReview.findMany({
      where: { employee: { companyId: ctx.companyId } },
      include: { employee: { select: { firstName: true, lastName: true, position: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return apiSuccess(reviews)
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
    const employee = await prisma.employee.findFirst({ where: { id: parsed.data.employeeId, companyId: ctx.companyId } })
    if (!employee) return apiError('Employé introuvable', 404)
    const review = await prisma.performanceReview.create({
      data: {
        companyId: ctx.companyId,
        employeeId: parsed.data.employeeId,
        reviewerId: parsed.data.reviewerId ?? ctx.userId,
        period: parsed.data.period,
        score: parsed.data.score ?? null,
        strengths: parsed.data.strengths ?? null,
        improvements: parsed.data.improvements ?? null,
        status: 'DRAFT',
      },
    })
    return apiSuccess(review, 201)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non autorisé', 401)
    if (e instanceof Error && e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    return apiError('Erreur serveur', 500, e)
  }
}
