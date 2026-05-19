import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiSuccess, apiError } from '@/lib/security/api-response'
import { renderEmail } from '@/lib/subscriptions/email-renderer'
import type { EmailLang, EmailTemplate } from '@/lib/subscriptions/email-templates'

const schema = z.object({
  type:    z.enum(['renewal', 'trialEnd', 'welcome']),
  lang:    z.enum(['fr', 'en', 'ar']),
  subject: z.string().max(300),
  body:    z.string().max(5000),
})

export async function POST(req: NextRequest) {
  const ctx = await getTenantContext()
  if (!ctx) return apiError('Non autorisé', 401)

  let body: unknown
  try { body = await req.json() } catch { return apiError('Corps invalide', 400) }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return apiError('Données invalides', 400)

  const settings = await prisma.subscriptionSettings.findUnique({ where: { userId: ctx.userId } })
  const user = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { name: true } })

  const template: EmailTemplate = { subject: parsed.data.subject, body: parsed.data.body }
  const lang = parsed.data.lang as EmailLang

  const sampleExpiry = new Date()
  sampleExpiry.setDate(sampleExpiry.getDate() + 1)

  const isWelcome = parsed.data.type === 'welcome'

  const { subject, html } = renderEmail({
    template,
    lang,
    data: {
      clientName:  'Ahmed Benali',
      planName:    'Premium',
      companyName: user?.name ?? 'Mon compte',
      amount:      2500,
      expiresAt:   sampleExpiry,
    },
    settings: isWelcome
      ? { whatsapp: null, ccpNumber: null, chargilyCheckoutUrl: null }
      : {
          whatsapp:    settings?.whatsapp ?? null,
          ccpNumber:   settings?.ccpNumber ?? null,
          chargilyCheckoutUrl: settings?.chargilyKey ? 'https://pay.chargily.net/checkout/preview' : null,
        },
  })

  return apiSuccess({ subject, html })
}
