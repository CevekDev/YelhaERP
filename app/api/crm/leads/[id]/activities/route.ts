import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { z } from 'zod'

const schema = z.object({
  type: z.enum(['CALL', 'EMAIL', 'MEETING', 'NOTE', 'TASK']),
  subject: z.string().min(1),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    const lead = await prisma.lead.findFirst({ where: { id: params.id, companyId: ctx.companyId } })
    if (!lead) return apiError('Lead introuvable', 404)
    const activities = await prisma.leadActivity.findMany({
      where: { leadId: params.id },
      orderBy: { doneAt: 'desc' },
    })
    return apiSuccess(activities)
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
    const lead = await prisma.lead.findFirst({ where: { id: params.id, companyId: ctx.companyId } })
    if (!lead) return apiError('Lead introuvable', 404)
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 400, parsed.error.flatten())
    const activity = await prisma.leadActivity.create({
      data: {
        leadId: params.id,
        userId: ctx.userId,
        type: parsed.data.type,
        subject: parsed.data.subject,
        notes: parsed.data.notes ?? null,
      },
    })
    return apiSuccess(activity, 201)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non autorisé', 401)
    return apiError('Erreur serveur', 500, e)
  }
}
