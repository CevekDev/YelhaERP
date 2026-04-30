import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withV1Auth, v1Success, v1Error } from '../../_auth'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return withV1Auth(req, async (ctx) => {
    const invoice = await prisma.invoice.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
      include: {
        client: { select: { id: true, name: true, email: true, phone: true, address: true, wilaya: true } },
        lines: { select: { id: true, description: true, quantity: true, unitPrice: true, taxRate: true, total: true } },
        payments: { select: { id: true, amount: true, method: true, paidAt: true, reference: true } },
      },
    })
    if (!invoice) return v1Error('Facture introuvable', 404, 'NOT_FOUND')
    return v1Success(invoice)
  })
}
