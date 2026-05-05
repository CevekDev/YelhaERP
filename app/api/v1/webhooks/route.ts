import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import crypto from 'crypto'
import { withV1Auth, v1Success, v1Error, requireWriteScope } from '../_auth'

const VALID_EVENTS = [
  'invoice.created', 'invoice.updated', 'invoice.paid',
  'quote.accepted', 'quote.rejected', 'quote.converted',
  'client.created', 'client.updated',
] as const

const createSchema = z.object({
  url:         z.string().url().max(500),
  events:      z.array(z.enum(VALID_EVENTS)).min(1),
  description: z.string().max(200).optional(),
})

export async function GET(req: NextRequest) {
  return withV1Auth(req, async (ctx) => {
    const webhooks = await prisma.webhook.findMany({
      where: { companyId: ctx.companyId, isActive: true },
      select: {
        id: true, url: true, events: true, description: true,
        isActive: true, lastTriggeredAt: true, createdAt: true,
        // Never expose the secret
      },
      orderBy: { createdAt: 'desc' },
    })
    return v1Success(webhooks, { total: webhooks.length })
  })
}

export async function POST(req: NextRequest) {
  return withV1Auth(req, async (ctx) => {
    const writeErr = requireWriteScope(ctx)
    if (writeErr) return writeErr

    // Max 10 webhooks per company
    const count = await prisma.webhook.count({ where: { companyId: ctx.companyId, isActive: true } })
    if (count >= 10) return v1Error('Maximum 10 webhooks actifs par compte', 429, 'LIMIT_EXCEEDED')

    let body: unknown
    try { body = await req.json() } catch { return v1Error('Corps JSON invalide', 400, 'INVALID_BODY') }

    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return v1Error('Données invalides', 422, 'VALIDATION_ERROR')

    // Generate a random signing secret
    const secret = crypto.randomBytes(32).toString('hex')

    const webhook = await prisma.webhook.create({
      data: {
        companyId:   ctx.companyId,
        url:         parsed.data.url,
        events:      parsed.data.events,
        description: parsed.data.description,
        secret,
      },
      select: {
        id: true, url: true, events: true, description: true,
        isActive: true, createdAt: true,
        // Return secret only on creation — caller must store it
      },
    })

    return v1Success({ ...webhook, secret, secretNote: 'Conservez ce secret — il ne sera plus affiché.' })
  })
}
