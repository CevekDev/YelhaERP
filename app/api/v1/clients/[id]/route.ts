import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { withV1Auth, v1Success, v1Error, requireWriteScope } from '../../_auth'
import { dispatchWebhook } from '@/lib/webhooks/dispatch'

const updateSchema = z.object({
  clientType:  z.enum(['COMPANY','INDIVIDUAL']).optional(),
  name:        z.string().min(2).max(200).trim().optional(),
  firstName:   z.string().max(100).trim().optional().nullable(),
  email:       z.string().email().optional().nullable(),
  phone:       z.string().max(20).optional().nullable(),
  address:     z.string().max(500).optional().nullable(),
  wilaya:      z.string().max(100).optional().nullable(),
  nif:         z.string().max(20).optional().nullable(),
  nis:         z.string().max(20).optional().nullable(),
  rc:          z.string().max(30).optional().nullable(),
  description: z.string().max(1000).optional().nullable(),
})

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  return withV1Auth(req, async (ctx) => {
    const client = await prisma.client.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
      select: {
        id: true, clientType: true, name: true, firstName: true,
        email: true, phone: true, address: true, wilaya: true,
        nif: true, nis: true, rc: true, description: true,
        createdAt: true, updatedAt: true,
        _count: { select: { invoices: true, quotes: true } },
      },
    })
    if (!client) return v1Error('Client introuvable', 404, 'NOT_FOUND')
    return v1Success(client)
  })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  return withV1Auth(req, async (ctx) => {
    const writeErr = requireWriteScope(ctx)
    if (writeErr) return writeErr

    const existing = await prisma.client.findFirst({ where: { id: params.id, companyId: ctx.companyId } })
    if (!existing) return v1Error('Client introuvable', 404, 'NOT_FOUND')

    let body: unknown
    try { body = await req.json() } catch { return v1Error('Corps JSON invalide', 400, 'INVALID_BODY') }

    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return v1Error('Données invalides', 422, 'VALIDATION_ERROR')

    const client = await prisma.client.update({
      where: { id: params.id },
      data:  parsed.data,
      select: {
        id: true, clientType: true, name: true, firstName: true,
        email: true, phone: true, address: true, wilaya: true,
        nif: true, createdAt: true, updatedAt: true,
      },
    })

    dispatchWebhook(ctx.companyId, 'client.updated', client as unknown as Record<string, unknown>)

    return v1Success(client)
  })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return withV1Auth(req, async (ctx) => {
    const writeErr = requireWriteScope(ctx)
    if (writeErr) return writeErr

    const existing = await prisma.client.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
      include: { _count: { select: { invoices: true } } },
    })
    if (!existing) return v1Error('Client introuvable', 404, 'NOT_FOUND')
    if ((existing._count as { invoices: number }).invoices > 0) {
      return v1Error('Impossible de supprimer un client qui a des factures. Archivez-le plutôt.', 409, 'CONFLICT')
    }

    await prisma.client.delete({ where: { id: params.id } })

    return v1Success({ id: params.id, deleted: true })
  })
}
