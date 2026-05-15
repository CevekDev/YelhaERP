import { NextRequest } from 'next/server'
import { z } from 'zod'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiSuccess, apiError } from '@/lib/security/api-response'

const schema = z.object({
  type: z.enum(['renewal', 'trialEnd', 'welcome']),
  lang: z.enum(['fr', 'en', 'ar']),
})

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx) return apiError('Non autorisé', 401)

  let body: unknown
  try { body = await req.json() } catch { return apiError('Corps invalide', 400) }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return apiError('Données invalides', 400)

  const { type, lang } = parsed.data

  const s = await prisma.subscriptionSettings.findUnique({ where: { companyId: ctx.companyId } })
  if (!s) return apiError('Paramètres introuvables', 404)

  const templates = (s.emailTemplates as Record<string, Record<string, unknown>>) ?? {}
  if (templates[type]?.[lang]) {
    delete templates[type][lang]
    if (Object.keys(templates[type]).length === 0) delete templates[type]
  }

  const updated = await prisma.subscriptionSettings.update({
    where: { companyId: ctx.companyId },
    data: { emailTemplates: templates as Prisma.InputJsonValue },
  })

  return apiSuccess(updated)
}
