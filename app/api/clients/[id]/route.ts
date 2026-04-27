import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess } from '@/lib/security/api-response'
import { clientSchema } from '@/lib/validations/client'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getTenantContext()
    const client = await prisma.client.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
      include: {
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: { id: true, number: true, total: true, status: true, issueDate: true },
        },
      },
    })
    if (!client) return apiError('Client introuvable', 404)
    return apiSuccess(client)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500)
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'EMPLOYEE')
    const exists = await prisma.client.findFirst({ where: { id: params.id, companyId: ctx.companyId } })
    if (!exists) return apiError('Client introuvable', 404)
    const body = await req.json().catch(() => null)
    const parsed = clientSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422)
    const updated = await prisma.client.update({ where: { id: params.id }, data: parsed.data })
    return apiSuccess(updated)
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'ADMIN')
    const exists = await prisma.client.findFirst({ where: { id: params.id, companyId: ctx.companyId } })
    if (!exists) return apiError('Client introuvable', 404)
    await prisma.client.delete({ where: { id: params.id } })
    return apiSuccess({ ok: true })
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
