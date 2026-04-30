import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { z } from 'zod'

const schema = z.object({
  projectId: z.string(),
  taskId: z.string().optional(),
  date: z.string(),
  hours: z.number().positive().max(24),
  description: z.string().default(''),
  billable: z.boolean().default(true),
})

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    const { searchParams } = req.nextUrl
    const projectId = searchParams.get('projectId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const logs = await prisma.timeLog.findMany({
      where: {
        companyId: ctx.companyId,
        ...(projectId ? { projectId } : {}),
        ...(from && to ? { date: { gte: new Date(from), lte: new Date(to) } } : {}),
      },
      include: { project: { select: { name: true } }, task: { select: { title: true } } },
      orderBy: { date: 'desc' },
    })
    return apiSuccess(logs)
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
    const project = await prisma.project.findFirst({ where: { id: parsed.data.projectId, companyId: ctx.companyId } })
    if (!project) return apiError('Projet introuvable', 404)
    const log = await prisma.timeLog.create({
      data: {
        companyId: ctx.companyId,
        projectId: parsed.data.projectId,
        taskId: parsed.data.taskId ?? null,
        userId: ctx.userId,
        date: new Date(parsed.data.date),
        hours: parsed.data.hours,
        description: parsed.data.description,
        isBillable: parsed.data.billable,
      },
    })
    return apiSuccess(log, 201)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non autorisé', 401)
    if (e instanceof Error && e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    return apiError('Erreur serveur', 500, e)
  }
}
