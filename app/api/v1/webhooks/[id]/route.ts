import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withV1Auth, v1Success, v1Error, requireWriteScope } from '../../_auth'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  return withV1Auth(req, async (ctx) => {
    const writeErr = requireWriteScope(ctx)
    if (writeErr) return writeErr

    const existing = await prisma.webhook.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
    })
    if (!existing) return v1Error('Webhook introuvable', 404, 'NOT_FOUND')

    // Soft delete: deactivate
    await prisma.webhook.update({
      where: { id: params.id },
      data:  { isActive: false },
    })

    return v1Success({ id: params.id, deleted: true })
  })
}
