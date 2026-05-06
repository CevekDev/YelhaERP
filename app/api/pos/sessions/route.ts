import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { getTenantContext } from '@/lib/security/tenant'
import { apiSuccess, apiError } from '@/lib/security/api-response'

const openSchema = z.object({
  openingCash:   z.number().min(0).default(0),
  resetInterval: z.enum(['daily', '2days', 'weekly', 'monthly']).default('daily'),
  registerId:    z.string().optional(),
  notes:         z.string().max(500).optional(),
})

export async function GET(_req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx) return apiError('Non autorisé', 401)

  const sessions = await prisma.posSession.findMany({
    where: { companyId: ctx.companyId },
    include: { _count: { select: { sales: true } }, register: { select: { id: true, name: true } } },
    orderBy: { openedAt: 'desc' },
    take: 50,
  })
  return apiSuccess(sessions)
}

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx) return apiError('Non autorisé', 401)

  let body: unknown
  try { body = await req.json() } catch { return apiError('Corps invalide', 400) }
  const parsed = openSchema.safeParse(body)
  if (!parsed.success) return apiError('Données invalides', 400)

  const existing = await prisma.posSession.findFirst({
    where: {
      companyId: ctx.companyId,
      status: 'OPEN',
      ...(parsed.data.registerId ? { registerId: parsed.data.registerId } : {}),
    },
  })
  if (existing) return apiError('Une session est déjà ouverte sur cette caisse', 409, { data: existing })

  const count = await prisma.posSession.count({ where: { companyId: ctx.companyId } })
  const session = await prisma.posSession.create({
    data: {
      companyId:     ctx.companyId,
      number:        count + 1,
      openingCash:   parsed.data.openingCash,
      resetInterval: parsed.data.resetInterval,
      registerId:    parsed.data.registerId,
      notes:         parsed.data.notes,
    },
    include: { register: { select: { id: true, name: true } } },
  })
  return apiSuccess(session, 201)
}
