import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/security/api-response'
import { sendEmail } from '@/lib/email/resend'
import { getTemplate, type EmailLang, type EmailType, type TemplatesByLang } from '@/lib/subscriptions/email-templates'
import { renderEmail, generateChargilyCheckout } from '@/lib/subscriptions/email-renderer'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://erp.yelha.net'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return apiError('Non autorisé', 401)

  try {
    const now = new Date()
    const in1day = new Date(now.getTime() + 36 * 60 * 60 * 1000) // 36h window (≈ J-1)
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Subscriptions expirant dans ≤ 36h, ACTIVE ou TRIAL, avec email client
    const expiring = await prisma.subscription.findMany({
      where: {
        status: { in: ['ACTIVE', 'TRIAL'] },
        clientEmail: { not: null },
        nextBilling: { gte: now, lte: in1day },
      },
      include: {
        client:  { select: { name: true, firstName: true } },
        plan:    { select: { name: true, price: true } },
        company: { select: { id: true, name: true, subscriptionSettings: true } },
      },
    })

    let sent = 0
    let skipped = 0

    for (const sub of expiring) {
      if (!sub.clientEmail || !sub.nextBilling) continue

      // Anti-spam : ne pas réenvoyer dans les dernières 24h
      const isTrial = sub.status === 'TRIAL'
      const lastSentAt = isTrial ? sub.lastTrialEndReminderAt : sub.lastRenewalReminderAt
      if (lastSentAt && lastSentAt > last24h) { skipped++; continue }

      const settings = sub.company.subscriptionSettings
      const lang = (settings?.emailLanguage ?? 'fr') as EmailLang
      const type: EmailType = isTrial ? 'trialEnd' : 'renewal'

      const template = getTemplate(
        (settings?.emailTemplates ?? null) as TemplatesByLang | null,
        type,
        lang,
      )

      const amount = Number(sub.plan.price)
      const clientName = [sub.client.firstName, sub.client.name].filter(Boolean).join(' ') || sub.client.name

      // Chargily checkout (uniquement si le token est configuré au niveau company)
      // Pas de cache : chaque URL contient les metadata propres à la souscription
      let chargilyUrl: string | null = null
      if (settings?.chargilyKey) {
        chargilyUrl = await generateChargilyCheckout(settings.chargilyKey, amount, sub.plan.name, APP_URL, {
          subscriptionId: sub.id,
          companyId: sub.company.id,
        })
      }

      const { subject, html } = renderEmail({
        template,
        lang,
        data: {
          clientName,
          planName:    sub.plan.name,
          companyName: sub.company.name,
          amount,
          expiresAt:   sub.nextBilling,
        },
        settings: {
          whatsapp:    settings?.whatsapp ?? null,
          ccpNumber:   settings?.ccpNumber ?? null,
          chargilyCheckoutUrl: chargilyUrl,
        },
      })

      try {
        await sendEmail({ to: sub.clientEmail, subject, html })
        await prisma.subscription.update({
          where: { id: sub.id },
          data: isTrial
            ? { lastTrialEndReminderAt: new Date() }
            : { lastRenewalReminderAt: new Date() },
        })
        sent++
      } catch { /* email non critique */ }
    }

    // Marquer EXPIRED les abonnements ACTIVE en retard de plus de 7j
    const overdueLimit = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const expiredActive = await prisma.subscription.updateMany({
      where: { status: 'ACTIVE', nextBilling: { lt: overdueLimit } },
      data: { status: 'EXPIRED' },
    })

    // Marquer EXPIRED les abonnements TRIAL dont la période d'essai est terminée
    const expiredTrial = await prisma.subscription.updateMany({
      where: { status: 'TRIAL', nextBilling: { lt: now } },
      data: { status: 'EXPIRED' },
    })

    return apiSuccess({
      remindersSent: sent,
      skipped,
      markedExpired: expiredActive.count + expiredTrial.count,
    })
  } catch (e) {
    console.error('subscriptions-reminders cron error:', e)
    return apiError('Erreur serveur', 500)
  }
}
