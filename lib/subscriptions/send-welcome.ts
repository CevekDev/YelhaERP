import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email/resend'
import { getTemplate, type EmailLang, type TemplatesByLang } from './email-templates'
import { renderEmail } from './email-renderer'

/**
 * Envoie un email de bienvenue au client à la création de son abonnement.
 * Fire-and-forget : les erreurs sont loguées mais ne bloquent pas le flow.
 */
export async function sendWelcomeEmail(subscriptionId: string): Promise<void> {
  try {
    const sub = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        client:  { select: { name: true, firstName: true, email: true } },
        plan:    { select: { name: true, price: true } },
        company: { select: { name: true, subscriptionSettings: true } },
      },
    })
    if (!sub) {
      console.warn('[welcome] subscription not found', subscriptionId)
      return
    }

    // Fallback : si l'email de l'abonnement n'est pas renseigné mais que le client
    // a un email dans sa fiche, on utilise celui-là.
    const to = sub.clientEmail || sub.client.email
    if (!to) {
      console.warn('[welcome] no email available for subscription', subscriptionId)
      return
    }

    const settings = sub.company.subscriptionSettings
    const lang = (settings?.emailLanguage ?? 'fr') as EmailLang

    const template = getTemplate(
      (settings?.emailTemplates ?? null) as TemplatesByLang | null,
      'welcome',
      lang,
    )

    const clientName =
      [sub.client.firstName, sub.client.name].filter(Boolean).join(' ') || sub.client.name

    const { subject, html } = renderEmail({
      template,
      lang,
      data: {
        clientName,
        planName:    sub.plan.name,
        companyName: sub.company.name,
        amount:      Number(sub.plan.price),
        expiresAt:   sub.nextBilling ?? sub.startDate,
      },
      // Pas de section paiement dans l'email de bienvenue
      settings: { whatsapp: null, ccpNumber: null, chargilyCheckoutUrl: null },
    })

    const result = await sendEmail({ to, subject, html })
    console.log('[welcome] sent to', to, 'result:', JSON.stringify(result))
  } catch (e) {
    console.error('[welcome] error:', e)
  }
}
