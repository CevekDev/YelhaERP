import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/security/api-response'
import { sendEmail } from '@/lib/email/resend'
import { getTemplate, type EmailLang, type EmailType, type TemplatesByLang } from '@/lib/subscriptions/email-templates'
import { renderEmail, generateChargilyCheckout } from '@/lib/subscriptions/email-renderer'
import { canAccessSubs } from '@/lib/billing/check-access'
import { verifyCronSecret } from '@/lib/security/cron-auth'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://subs.yelha.net'

const INCLUDE = {
  client:  { select: { name: true, firstName: true } },
  plan:    { select: { name: true, price: true } },
  company: { select: { id: true, name: true, subscriptionSettings: true } },
} as const

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) return apiError('Non autorisé', 401)

  try {
    const now     = new Date()
    const in36h   = new Date(now.getTime() + 36 * 60 * 60 * 1000)
    const in48h   = new Date(now.getTime() + 48 * 60 * 60 * 1000)
    const in72h   = new Date(now.getTime() + 72 * 60 * 60 * 1000)
    const last25h = new Date(now.getTime() - 25 * 60 * 60 * 1000)

    // ── J-3 : ACTIVE uniquement, expirant dans 48–72h ─────────────────────────
    const expiring3 = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        clientEmail: { not: null },
        nextBilling: { gte: in48h, lte: in72h },
        OR: [
          { lastRenewalReminder3At: null },
          { lastRenewalReminder3At: { lt: last25h } },
        ],
      },
      include: INCLUDE,
    })

    // ── J-1 : ACTIVE + TRIAL, expirant dans 0–36h ─────────────────────────────
    const expiring1 = await prisma.subscription.findMany({
      where: {
        status: { in: ['ACTIVE', 'TRIAL'] },
        clientEmail: { not: null },
        nextBilling: { gte: now, lte: in36h },
        OR: [
          { lastRenewalReminderAt: null, lastTrialEndReminderAt: null },
          { lastRenewalReminderAt: { lt: last25h } },
          { lastTrialEndReminderAt: { lt: last25h } },
        ],
      },
      include: INCLUDE,
    })

    // ── canAccessApp groupé par company (évite N appels si même company) ───────
    const allCompanyIds = new Set([
      ...expiring3.map(s => s.company.id),
      ...expiring1.map(s => s.company.id),
    ])
    const accessMap = new Map<string, boolean>()
    await Promise.all(Array.from(allCompanyIds).map(async (cid) => {
      accessMap.set(cid, await canAccessSubs(cid))
    }))

    let sent = 0
    let skipped = 0

    // ── Envoi d'un email de rappel ─────────────────────────────────────────────
    const sendReminder = async (
      sub: (typeof expiring3)[0],
      isTrial: boolean,
      reminderType: '3day' | '1day',
    ) => {
      if (!sub.clientEmail || !sub.nextBilling) return

      // Arrêter si l'AppSubscription de la company a expiré
      if (!accessMap.get(sub.company.id)) { skipped++; return }

      // Anti-spam J-1 (J-3 déjà filtré par la requête Prisma)
      if (reminderType === '1day') {
        const lastSentAt = isTrial ? sub.lastTrialEndReminderAt : sub.lastRenewalReminderAt
        if (lastSentAt && lastSentAt > last25h) { skipped++; return }
      }

      const settings = sub.company.subscriptionSettings
      const lang     = (settings?.emailLanguage ?? 'fr') as EmailLang
      const type: EmailType = isTrial ? 'trialEnd' : 'renewal'
      const template = getTemplate(
        (settings?.emailTemplates ?? null) as TemplatesByLang | null,
        type,
        lang,
      )

      const amount     = Number(sub.plan.price)
      const clientName = [sub.client.firstName, sub.client.name].filter(Boolean).join(' ') || sub.client.name

      let chargilyUrl: string | null = null
      if (settings?.chargilyKey) {
        chargilyUrl = await generateChargilyCheckout(
          settings.chargilyKey,
          amount,
          sub.plan.name,
          APP_URL,
          { subscriptionId: sub.id, companyId: sub.company.id },
        )
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
          whatsapp:            settings?.whatsapp ?? null,
          ccpNumber:           settings?.ccpNumber ?? null,
          chargilyCheckoutUrl: chargilyUrl,
        },
      })

      try {
        await sendEmail({ to: sub.clientEmail, subject, html })

        const updateData =
          reminderType === '3day'
            ? { lastRenewalReminder3At: new Date() }
            : isTrial
              ? { lastTrialEndReminderAt: new Date() }
              : { lastRenewalReminderAt: new Date() }

        await prisma.subscription.update({ where: { id: sub.id }, data: updateData })
        sent++
      } catch { /* email non critique */ }
    }

    for (const sub of expiring3) await sendReminder(sub, false, '3day')
    for (const sub of expiring1) await sendReminder(sub, sub.status === 'TRIAL', '1day')

    // ── Expiration automatique ─────────────────────────────────────────────────
    // ACTIVE sans renouvellement depuis plus de 7 jours → EXPIRED
    const overdueLimit = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const expiredActive = await prisma.subscription.updateMany({
      where: { status: 'ACTIVE', nextBilling: { lt: overdueLimit } },
      data: { status: 'EXPIRED' },
    })

    // TRIAL dont la période d'essai est terminée → EXPIRED
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
