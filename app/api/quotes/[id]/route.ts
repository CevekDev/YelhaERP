import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'
import { updateQuoteSchema } from '@/lib/validations/quote'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { success, reset } = await rateLimit(_req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    const quote = await prisma.quote.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
      include: {
        client: true,
        lines: { include: { product: { select: { id: true, name: true } } } },
        invoice: { select: { id: true, number: true } },
      },
    })
    if (!quote) return apiError('Devis introuvable', 404)
    return apiSuccess(quote)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500)
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'EMPLOYEE')

    const quote = await prisma.quote.findFirst({ where: { id: params.id, companyId: ctx.companyId } })
    if (!quote) return apiError('Devis introuvable', 404)

    let body: unknown
    try { body = await req.json() } catch { return apiError('Corps invalide', 400) }

    const parsed = updateQuoteSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 422)

    const { lines, ...rest } = parsed.data

    const updated = await prisma.quote.update({
      where: { id: params.id },
      data: {
        ...rest,
        ...(rest.issueDate && { issueDate: new Date(rest.issueDate) }),
        ...(rest.expiryDate && { expiryDate: new Date(rest.expiryDate) }),
        ...(lines && {
          lines: {
            deleteMany: {},
            create: lines.map(l => {
              const ht = l.quantity * l.unitPrice
              const tax = ht * (l.taxRate / 100)
              return { ...l, total: ht + tax }
            }),
          },
        }),
      },
      include: { client: true, lines: true },
    })

    return apiSuccess(updated)
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'ACCOUNTANT')

    const quote = await prisma.quote.findFirst({ where: { id: params.id, companyId: ctx.companyId } })
    if (!quote) return apiError('Devis introuvable', 404)
    if (quote.status === 'CONVERTED') return apiError('Impossible de supprimer un devis converti', 409)

    await prisma.quote.delete({ where: { id: params.id } })
    return apiSuccess({ deleted: true })
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
