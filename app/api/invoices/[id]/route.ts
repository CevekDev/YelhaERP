import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess } from '@/lib/security/api-response'
import { updateInvoiceStatusSchema } from '@/lib/validations/invoice'
import { v4 as uuidv4 } from 'uuid'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getTenantContext()
    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
      include: {
        client: true,
        lines: true,
        company: { select: { name: true, nif: true, nis: true, rc: true, address: true, wilaya: true, phone: true, email: true, legalForm: true } },
      },
    })
    if (!invoice) return apiError('Facture introuvable', 404)
    return apiSuccess(invoice)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500)
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'ACCOUNTANT')
    const exists = await prisma.invoice.findFirst({ where: { id: params.id, companyId: ctx.companyId } })
    if (!exists) return apiError('Facture introuvable', 404)
    const body = await req.json().catch(() => null)
    const parsed = updateInvoiceStatusSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422)
    const updated = await prisma.invoice.update({ where: { id: params.id }, data: parsed.data })
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
    const invoice = await prisma.invoice.findFirst({ where: { id: params.id, companyId: ctx.companyId } })
    if (!invoice) return apiError('Facture introuvable', 404)
    if (invoice.status !== 'DRAFT') return apiError('Seuls les brouillons peuvent être supprimés', 409)
    await prisma.invoice.delete({ where: { id: params.id } })
    return apiSuccess({ ok: true })
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
