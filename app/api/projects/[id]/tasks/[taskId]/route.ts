import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { z } from 'zod'

const schema = z.object({
  title: z.string().min(1).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']).optional(),
  priority: z.string().optional(),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional(),
  estimatedHours: z.number().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: { id: string; taskId: string } }) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'EMPLOYEE')
    const task = await prisma.projectTask.findFirst({
      where: { id: params.taskId, projectId: params.id, project: { companyId: ctx.companyId } },
    })
    if (!task) return apiError('Tâche introuvable', 404)
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 400, parsed.error.flatten())
    const updated = await prisma.projectTask.update({
      where: { id: params.taskId },
      data: {
        ...parsed.data,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
        completedAt: parsed.data.status === 'DONE' ? new Date() : undefined,
      },
    })
    return apiSuccess(updated)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non autorisé', 401)
    if (e instanceof Error && e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    return apiError('Erreur serveur', 500, e)
  }
}
