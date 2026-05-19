import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiSuccess, apiError, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

const langSchema = z.enum(['fr', 'en', 'ar'])

const templateSchema = z.object({
  subject: z.string().max(300).optional(),
  body:    z.string().max(5000).optional(),
}).partial()

const templatesSchema = z.object({
  renewal:  z.record(langSchema, templateSchema).optional(),
  trialEnd: z.record(langSchema, templateSchema).optional(),
}).optional()

const putSchema = z.object({
  whatsapp:       z.string().max(30).optional().nullable(),
  ccpNumber:      z.string().max(50).optional().nullable(),
  chargilyKey:    z.string().max(200).optional().nullable(),
  emailLanguage:  langSchema.optional(),
  emailTemplates: templatesSchema,
})

const EMPTY_TEMPLATES = {}

function maskChargilyKey(key: string | null | undefined): string | null {
  if (!key) return null
  if (key.length <= 8) return '••••••••'
  return `${key.slice(0, 4)}${'•'.repeat(key.length - 8)}${key.slice(-4)}`
}

async function ensureSettings(userId: string) {
  let s = await prisma.subscriptionSettings.findUnique({ where: { userId } })
  if (!s) {
    s = await prisma.subscriptionSettings.create({
      data: { userId, emailLanguage: 'fr', emailTemplates: EMPTY_TEMPLATES },
    })
  }
  return s
}

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()
    const s = await ensureSettings(ctx.userId)
    return apiSuccess({
      ...s,
      chargilyKey: maskChargilyKey(s.chargilyKey),
      hasChargilyKey: !!s.chargilyKey,
    })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500)
  }
}

export async function PUT(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const ctx = await getTenantContext()

    let body: unknown
    try { body = await req.json() } catch { return apiError('Corps invalide', 400) }
    const parsed = putSchema.safeParse(body)
    if (!parsed.success) return apiError('Données invalides', 400)

    await ensureSettings(ctx.userId)

    const data: Record<string, unknown> = {}
    if (parsed.data.whatsapp !== undefined)       data.whatsapp = parsed.data.whatsapp || null
    if (parsed.data.ccpNumber !== undefined)      data.ccpNumber = parsed.data.ccpNumber || null
    if (parsed.data.chargilyKey !== undefined)    data.chargilyKey = parsed.data.chargilyKey || null
    if (parsed.data.emailLanguage !== undefined)  data.emailLanguage = parsed.data.emailLanguage
    if (parsed.data.emailTemplates !== undefined) data.emailTemplates = parsed.data.emailTemplates

    const updated = await prisma.subscriptionSettings.update({
      where: { userId: ctx.userId },
      data,
    })

    return apiSuccess({
      ...updated,
      chargilyKey: maskChargilyKey(updated.chargilyKey),
      hasChargilyKey: !!updated.chargilyKey,
    })
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500)
  }
}
