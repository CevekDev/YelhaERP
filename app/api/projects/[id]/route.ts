import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),
  description: z.string().optional(),
  endDate: z.string().optional(),
})

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    const project = await prisma.project.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
      include: {
        client: { select: { name: true } },
        tasks: { orderBy: [{ status: 'asc' }, { dueDate: 'asc' }] },
        timeLogs: { orderBy: { date: 'desc' }, take: 20 },
        _count: { select: { tasks: true, timeLogs: true } },
      },
    })
    if (!project) return apiError('Projet introuvable', 404)
    return apiSuccess(project)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non autorisé', 401)
    return apiError('Erreur serveur', 500, e)
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'EMPLOYEE')
    const project = await prisma.project.findFirst({ where: { id: params.id, companyId: ctx.companyId } })
    if (!project) return apiError('Projet introuvable', 404)
    const body = await req.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 400, parsed.error.flatten())
    const updated = await prisma.project.update({
      where: { id: params.id },
      data: { ...parsed.data, endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined },
    })
    return apiSuccess(updated)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non autorisé', 401)
    if (e instanceof Error && e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    return apiError('Erreur serveur', 500, e)
  }
}
