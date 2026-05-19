import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { withSubApi, ok, apiError } from '@/lib/sub-api/auth'

export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  name:       z.string().min(1).max(200).optional(),
  firstName:  z.string().max(100).optional().nullable(),
  phone:      z.string().max(30).optional().nullable(),
  email:      z.string().email().optional().nullable(),
  wilaya:     z.string().max(100).optional().nullable(),
  address:    z.string().max(300).optional().nullable(),
  clientType: z.enum(['COMPANY', 'INDIVIDUAL']).optional(),
})

const SELECT = { id: true, name: true, firstName: true, phone: true, email: true, wilaya: true, address: true, clientType: true, createdAt: true }

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return withSubApi(req, async (ctx) => {
    const c = await prisma.client.findFirst({
      where: { id: params.id, userId: ctx.userId },
      select: SELECT,
    })
    if (!c) return apiError('Client introuvable', 404, 'NOT_FOUND')
    return ok({ data: c })
  })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  return withSubApi(req, async (ctx) => {
    const c = await prisma.client.findFirst({ where: { id: params.id, userId: ctx.userId } })
    if (!c) return apiError('Client introuvable', 404, 'NOT_FOUND')

    let body: unknown
    try { body = await req.json() } catch { return apiError('Corps invalide', 400, 'BAD_BODY') }
    const parsed = patchSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422, 'VALIDATION_ERROR')

    const updated = await prisma.client.update({
      where: { id: params.id },
      data: parsed.data,
      select: SELECT,
    })
    return ok({ data: updated })
  })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return withSubApi(req, async (ctx) => {
    const c = await prisma.client.findFirst({ where: { id: params.id, userId: ctx.userId } })
    if (!c) return apiError('Client introuvable', 404, 'NOT_FOUND')

    const subCount = await prisma.subscription.count({
      where: { clientId: params.id, status: { in: ['ACTIVE', 'TRIAL'] } },
    })
    if (subCount > 0) {
      return apiError(
        `Ce client a ${subCount} abonnement(s) actif(s). Annulez-les d'abord.`,
        409, 'CONFLICT'
      )
    }
    await prisma.client.delete({ where: { id: params.id } })
    return ok({ data: { deleted: true } })
  })
}
