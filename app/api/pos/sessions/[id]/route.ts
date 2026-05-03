import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getTenantContext } from '@/lib/security/tenant'
import { apiSuccess, apiError } from '@/lib/security/api-response'

const closeSchema = z.object({
  closingCash: z.number().min(0),
  notes:       z.string().max(500).optional(),
})

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getTenantContext()
  if (!ctx) return apiError('Non autorisé', 401)

  const session = await prisma.posSession.findFirst({
    where: { id: params.id, companyId: ctx.companyId },
    include: {
      sales: {
        include: { client: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
  if (!session) return apiError('Session introuvable', 404)
  return apiSuccess(session)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const ctx = await getTenantContext()
  if (!ctx) return apiError('Non autorisé', 401)

  const session = await prisma.posSession.findFirst({
    where: { id: params.id, companyId: ctx.companyId, status: 'OPEN' },
  })
  if (!session) return apiError('Session introuvable ou déjà fermée', 404)

  let body: unknown
  try { body = await req.json() } catch { return apiError('Corps invalide', 400) }
  const parsed = closeSchema.safeParse(body)
  if (!parsed.success) return apiError('Données invalides', 400)

  const closed = await prisma.posSession.update({
    where: { id: params.id },
    data: {
      status:      'CLOSED',
      closingCash: parsed.data.closingCash,
      notes:       parsed.data.notes,
      closedAt:    new Date(),
    },
  })
  return apiSuccess(closed)
}
