import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withV1Auth, v1Success, v1Error } from '../../_auth'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return withV1Auth(req, async (ctx) => {
    const client = await prisma.client.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
      select: {
        id: true, clientType: true, name: true, firstName: true,
        email: true, phone: true, address: true, wilaya: true,
        nif: true, createdAt: true,
        _count: { select: { invoices: true } },
      },
    })
    if (!client) return v1Error('Client introuvable', 404, 'NOT_FOUND')
    return v1Success(client)
  })
}
