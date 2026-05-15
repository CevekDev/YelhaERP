import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/security/api-response'
import { sendEmail } from '@/lib/email/resend'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://erp.yelha.net'

async function generateChargilyCheckout(key: string, amountDA: number, planName: string) {
  try {
    const res = await fetch('https://pay.chargily.net/api/v2/checkouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        amount: Math.round(amountDA * 100),
        currency: 'dzd',
        success_url: APP_URL,
        failure_url: APP_URL,
        description: `Renouvellement ${planName}`,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return (data.checkout_url ?? data.url ?? null) as string | null
  } catch {
    return null
  }
}

type Lang = 'fr' | 'en' | 'ar'

interface EmailParams {
  lang: Lang
  clientName: string
  planName: string
  companyName: string
  expiresAt: Date
  amount: number
  customMessage?: string | null
  ccpNumber?: string | null
  whatsapp?: string | null
  chargilyUrl?: string | null
}

function buildRenewalEmail(p: EmailParams): { subject: string; html: string } {
  const isRtl = p.lang === 'ar'
  const dir = isRtl ? 'rtl' : 'ltr'

  const dateStr = p.expiresAt.toLocaleDateString(
    p.lang === 'fr' ? 'fr-DZ' : p.lang === 'ar' ? 'ar-DZ' : 'en-GB',
    { day: 'numeric', month: 'long', year: 'numeric' }
  )

  const fmt = (n: number) => n.toLocaleString(p.lang === 'ar' ? 'ar-DZ' : 'fr-DZ') + ' DA'

  const t = {
    fr: {
      subject: `⚠️ Votre abonnement ${p.planName} expire demain`,
      greeting: `Bonjour ${p.clientName},`,
      body: `Votre abonnement <strong>${p.planName}</strong> chez <strong>${p.companyName}</strong> expire demain.`,
      expiry: `Date d'échéance`,
      amount: `Montant`,
      payTitle: 'Comment renouveler ?',
      ccpTitle: 'Virement CCP',
      ccpInstr: `Effectuez un virement de <strong>${fmt(p.amount)}</strong> sur le compte CCP :`,
      chargilyTitle: 'Paiement en ligne (Chargily ePay)',
      chargilyBtn: 'Payer maintenant',
      whatsappTitle: 'WhatsApp',
      whatsappInstr: 'Contactez-nous sur WhatsApp pour finaliser votre renouvellement :',
      whatsappBtn: 'Ouvrir WhatsApp',
    },
    en: {
      subject: `⚠️ Your ${p.planName} subscription expires tomorrow`,
      greeting: `Hello ${p.clientName},`,
      body: `Your <strong>${p.planName}</strong> subscription with <strong>${p.companyName}</strong> expires tomorrow.`,
      expiry: `Expiry date`,
      amount: `Amount`,
      payTitle: 'How to renew?',
      ccpTitle: 'CCP Bank Transfer',
      ccpInstr: `Transfer <strong>${fmt(p.amount)}</strong> to CCP account:`,
      chargilyTitle: 'Online Payment (Chargily ePay)',
      chargilyBtn: 'Pay now',
      whatsappTitle: 'WhatsApp',
      whatsappInstr: 'Contact us on WhatsApp to complete your renewal:',
      whatsappBtn: 'Open WhatsApp',
    },
    ar: {
      subject: `⚠️ اشتراكك ${p.planName} ينتهي غداً`,
      greeting: `مرحباً ${p.clientName}،`,
      body: `ينتهي اشتراكك <strong>${p.planName}</strong> لدى <strong>${p.companyName}</strong> غداً.`,
      expiry: `تاريخ الانتهاء`,
      amount: `المبلغ`,
      payTitle: 'كيفية التجديد؟',
      ccpTitle: 'تحويل CCP',
      ccpInstr: `قم بتحويل مبلغ <strong>${fmt(p.amount)}</strong> إلى حساب CCP:`,
      chargilyTitle: 'الدفع الإلكتروني (Chargily ePay)',
      chargilyBtn: 'ادفع الآن',
      whatsappTitle: 'واتساب',
      whatsappInstr: 'تواصل معنا عبر واتساب لإتمام التجديد:',
      whatsappBtn: 'فتح واتساب',
    },
  }[p.lang]

  const whatsappLink = p.whatsapp
    ? `https://wa.me/${p.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
        p.lang === 'ar'
          ? `مرحباً، أريد تجديد اشتراك ${p.planName}`
          : p.lang === 'en'
          ? `Hello, I want to renew my ${p.planName} subscription`
          : `Bonjour, je souhaite renouveler mon abonnement ${p.planName}`
      )}`
    : null

  const paymentBlocks: string[] = []

  if (p.ccpNumber) {
    paymentBlocks.push(`
      <div style="margin-bottom:16px;padding:16px 20px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;">
        <p style="margin:0 0 6px;font-weight:700;font-size:14px;color:#15803d;">💳 ${t.ccpTitle}</p>
        <p style="margin:0 0 8px;font-size:14px;color:#166534;">${t.ccpInstr}</p>
        <p style="margin:0;font-size:18px;font-weight:800;letter-spacing:1px;color:#14532d;background:#dcfce7;display:inline-block;padding:6px 14px;border-radius:8px;">${p.ccpNumber}</p>
      </div>`)
  }

  if (p.chargilyUrl) {
    paymentBlocks.push(`
      <div style="margin-bottom:16px;padding:16px 20px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;">
        <p style="margin:0 0 8px;font-weight:700;font-size:14px;color:#1d4ed8;">🔵 ${t.chargilyTitle}</p>
        <a href="${p.chargilyUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">${t.chargilyBtn}</a>
      </div>`)
  }

  if (whatsappLink) {
    paymentBlocks.push(`
      <div style="margin-bottom:16px;padding:16px 20px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;">
        <p style="margin:0 0 6px;font-weight:700;font-size:14px;color:#15803d;">📱 ${t.whatsappTitle}</p>
        <p style="margin:0 0 8px;font-size:14px;color:#166534;">${t.whatsappInstr}</p>
        <a href="${whatsappLink}" style="display:inline-block;background:#25d366;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">${t.whatsappBtn}</a>
      </div>`)
  }

  const customBlock = p.customMessage
    ? `<p style="margin:0 0 24px;font-size:14px;color:#475569;background:#f8fafc;border-left:4px solid #cbd5e1;padding:12px 16px;border-radius:0 8px 8px 0;">${p.customMessage}</p>`
    : ''

  const html = `<!DOCTYPE html>
<html lang="${p.lang}" dir="${dir}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:${isRtl ? 'Tahoma,' : ''}Inter,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.06);">
        <tr><td>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1D9E75,#3ec79c);padding:32px 40px;">
            <tr><td align="center"><span style="color:#fff;font-size:22px;font-weight:800;">📊 YelhaERP</span></td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:40px;" dir="${dir}">
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
            <p style="margin:0;font-size:15px;font-weight:700;color:#991b1b;">⚠️ ${t.greeting}</p>
          </div>
          <p style="margin:0 0 8px;font-size:15px;color:#334155;">${t.body}</p>
          <div style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;padding:14px 18px;margin:16px 0 24px;">
            <p style="margin:0 0 4px;font-size:13px;color:#92400e;">📅 ${t.expiry} : <strong>${dateStr}</strong></p>
            <p style="margin:0;font-size:13px;color:#92400e;">💰 ${t.amount} : <strong>${fmt(p.amount)}</strong></p>
          </div>
          ${customBlock}
          ${paymentBlocks.length > 0 ? `<p style="margin:0 0 16px;font-weight:700;font-size:15px;color:#0f172a;">👇 ${t.payTitle}</p>${paymentBlocks.join('')}` : ''}
        </td></tr>
        <tr><td>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;">
            <tr><td align="center"><p style="margin:0;color:#94a3b8;font-size:12px;">© ${new Date().getFullYear()} YelhaERP — Alger, Algérie</p></td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

  return { subject: t.subject, html }
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return apiError('Non autorisé', 401)

  try {
    const now = new Date()
    const in1day = new Date(now.getTime() + 36 * 60 * 60 * 1000) // 36h window for J-1

    const expiringSoon = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        clientEmail: { not: null },
        nextBilling: { gte: now, lte: in1day },
      },
      include: {
        client: { select: { name: true, firstName: true } },
        plan:   { select: { name: true, price: true } },
        company: { select: { name: true } },
      },
    })

    let sent = 0

    for (const sub of expiringSoon) {
      if (!sub.clientEmail || !sub.nextBilling) continue

      const lang = (sub.emailLanguage ?? 'fr') as Lang
      const amount = Number(sub.plan.price)
      const clientName = [sub.client.firstName, sub.client.name].filter(Boolean).join(' ')

      let chargilyUrl: string | null = null
      if (sub.chargilyKey) {
        chargilyUrl = await generateChargilyCheckout(sub.chargilyKey, amount, sub.plan.name)
      }

      const { subject, html } = buildRenewalEmail({
        lang,
        clientName,
        planName: sub.plan.name,
        companyName: sub.company.name,
        expiresAt: sub.nextBilling,
        amount,
        customMessage: sub.emailMessage,
        ccpNumber: sub.ccpNumber,
        whatsapp: sub.whatsapp,
        chargilyUrl,
      })

      try {
        await sendEmail({ to: sub.clientEmail, subject, html })
        sent++
      } catch { /* email non critique */ }
    }

    // Mark overdue subscriptions as EXPIRED (nextBilling passed by more than 7 days)
    const overdueLimit = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const expired = await prisma.subscription.updateMany({
      where: { status: 'ACTIVE', nextBilling: { lt: overdueLimit } },
      data: { status: 'EXPIRED' },
    })

    return apiSuccess({ remindersSent: sent, markedExpired: expired.count })
  } catch (e) {
    console.error('subscriptions-reminders cron error:', e)
    return apiError('Erreur serveur', 500)
  }
}
