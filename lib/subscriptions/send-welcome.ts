import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email/resend'
import { getTemplate, type EmailLang, type TemplatesByLang } from './email-templates'
import { renderEmail, generateChargilyCheckout } from './email-renderer'

/**
 * Envoie l'email de début d'abonnement au client avec les options de paiement.
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

    // Generate Chargily checkout link if key configured
    let chargilyCheckoutUrl: string | null = null
    if (settings?.chargilyKey) {
      chargilyCheckoutUrl = await generateChargilyCheckout(
        settings.chargilyKey,
        Number(sub.plan.price),
        sub.plan.name,
        'https://erp.yelha.net/dashboard/subscriptions',
        { subscriptionId: sub.id, companyId: sub.company.name },
      )
    }

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
      settings: {
        whatsapp:           settings?.whatsapp ?? null,
        ccpNumber:          settings?.ccpNumber ?? null,
        chargilyCheckoutUrl,
        isNew:              true,
      },
    })

    const result = await sendEmail({ to, subject, html })
    console.log('[welcome] sent to', to, 'result:', JSON.stringify(result))
  } catch (e) {
    console.error('[welcome] error:', e)
  }
}
