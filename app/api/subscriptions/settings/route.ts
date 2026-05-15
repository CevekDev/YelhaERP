import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiSuccess, apiError } from '@/lib/security/api-response'

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

async function ensureSettings(companyId: string) {
  let s = await prisma.subscriptionSettings.findUnique({ where: { companyId } })
  if (!s) {
    s = await prisma.subscriptionSettings.create({
      data: { companyId, emailLanguage: 'fr', emailTemplates: EMPTY_TEMPLATES },
    })
  }
  return s
}

export async function GET() {
  const ctx = await getTenantContext()
  if (!ctx) return apiError('Non autorisé', 401)
  const s = await ensureSettings(ctx.companyId)
  return apiSuccess(s)
}

export async function PUT(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx) return apiError('Non autorisé', 401)

  let body: unknown
  try { body = await req.json() } catch { return apiError('Corps invalide', 400) }
  const parsed = putSchema.safeParse(body)
  if (!parsed.success) return apiError('Données invalides', 400)

  await ensureSettings(ctx.companyId)

  const data: Record<string, unknown> = {}
  if (parsed.data.whatsapp !== undefined)      data.whatsapp = parsed.data.whatsapp || null
  if (parsed.data.ccpNumber !== undefined)     data.ccpNumber = parsed.data.ccpNumber || null
  if (parsed.data.chargilyKey !== undefined)   data.chargilyKey = parsed.data.chargilyKey || null
  if (parsed.data.emailLanguage !== undefined) data.emailLanguage = parsed.data.emailLanguage
  if (parsed.data.emailTemplates !== undefined) data.emailTemplates = parsed.data.emailTemplates

  const updated = await prisma.subscriptionSettings.update({
    where: { companyId: ctx.companyId },
    data,
  })

  return apiSuccess(updated)
}
