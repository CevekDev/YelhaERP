import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { z } from 'zod'

const schema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional(),
  estimatedHours: z.number().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
})

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    const project = await prisma.project.findFirst({ where: { id: params.id, companyId: ctx.companyId } })
    if (!project) return apiError('Projet introuvable', 404)
    const tasks = await prisma.projectTask.findMany({
      where: { projectId: params.id },
      orderBy: [{ status: 'asc' }, { priority: 'desc' }],
    })
    return apiSuccess(tasks)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non autorisé', 401)
    return apiError('Erreur serveur', 500, e)
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'EMPLOYEE')
    const project = await prisma.project.findFirst({ where: { id: params.id, companyId: ctx.companyId } })
    if (!project) return apiError('Projet introuvable', 404)
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 400, parsed.error.flatten())
    const task = await prisma.projectTask.create({
      data: {
        projectId: params.id,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        assignedTo: parsed.data.assignedTo ?? null,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
        estimatedHours: parsed.data.estimatedHours ?? null,
        priority: parsed.data.priority,
        status: 'TODO',
      },
    })
    return apiSuccess(task, 201)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non autorisé', 401)
    if (e instanceof Error && e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    return apiError('Erreur serveur', 500, e)
  }
}
