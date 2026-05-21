import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email/resend'
import { getTemplate, type EmailLang, type TemplatesByLang } from './email-templates'
import { renderEmail, generateChargilyCheckout, isWhiteLabel } from './email-renderer'

/**
 * Envoie l'email de début d'abonnement au client avec les options de paiement.
 * Fire-and-forget : les erreurs sont loguées mais ne bloquent pas le flow.
 */
export async function sendWelcomeEmail(subscriptionId: string): Promise<void> {
  try {
    const sub = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        client: { select: { name: true, firstName: true, email: true } },
        plan:   { select: { name: true, price: true } },
        user:   { select: { name: true, plan: true, subscriptionSettings: true } },
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

    const settings  = sub.user.subscriptionSettings
    const lang      = (settings?.emailLanguage ?? 'fr') as EmailLang
    const isTrial   = sub.status === 'TRIAL'

    const template = getTemplate(
      (settings?.emailTemplates ?? null) as TemplatesByLang | null,
      isTrial ? 'trialWelcome' : 'welcome',
      lang,
    )

    const clientName =
      [sub.client.firstName, sub.client.name].filter(Boolean).join(' ') || sub.client.name

    // Chargily checkout uniquement pour les abonnements actifs (pas pendant l'essai)
    let chargilyCheckoutUrl: string | null = null
    if (!isTrial && settings?.chargilyKey) {
      chargilyCheckoutUrl = await generateChargilyCheckout(
        settings.chargilyKey,
        Number(sub.plan.price),
        sub.plan.name,
        'https://subs.yelha.net/dashboard/subscriptions',
        { subscriptionId: sub.id, userId: sub.userId },
      )
    }

    const { subject, html } = renderEmail({
      template,
      lang,
      data: {
        clientName,
        planName:    sub.plan.name,
        companyName: sub.user.name,
        amount:      Number(sub.plan.price),
        expiresAt:   sub.nextBilling ?? sub.startDate,
      },
      settings: {
        whatsapp:           isTrial ? null : (settings?.whatsapp ?? null),
        ccpNumber:          isTrial ? null : (settings?.ccpNumber ?? null),
        chargilyCheckoutUrl,
        isNew:              true,
      },
      whiteLabel:       isWhiteLabel(sub.user.plan),
      skipPaymentBlock: isTrial,
    })

    await sendEmail({ to, subject, html })
  } catch {
    // non-blocking — email échoué ne doit pas casser le flux
  }
}
