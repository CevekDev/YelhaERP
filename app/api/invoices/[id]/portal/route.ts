import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTenantContext, requireRole } from '@/lib/security/tenant'
import { apiError, apiSuccess } from '@/lib/security/api-response'
import { v4 as uuidv4 } from 'uuid'

// Générer un lien portail client unique
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const ctx = await getTenantContext()
    requireRole(ctx.role, 'ACCOUNTANT')
    const invoice = await prisma.invoice.findFirst({ where: { id: params.id, companyId: ctx.companyId } })
    if (!invoice) return apiError('Facture introuvable', 404)
    const token = invoice.portalToken ?? uuidv4()
    const updated = await prisma.invoice.update({
      where: { id: params.id },
      data: { portalToken: token },
    })
    return apiSuccess({ token, url: `/portal/${token}` })
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
      if (e.message === 'FORBIDDEN') return apiError('Accès refusé', 403)
    }
    return apiError('Erreur serveur', 500)
  }
}
