import type { EmailLang, EmailTemplate } from './email-templates'

export interface RenderData {
  clientName: string
  planName: string
  companyName: string
  amount: number
  expiresAt: Date
}

export interface PaymentSettings {
  whatsapp?: string | null
  ccpNumber?: string | null
  chargilyCheckoutUrl?: string | null
  isNew?: boolean  // true = start email (activate), false/undefined = renewal email
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function replacePlaceholders(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? '')
}

function formatAmount(amount: number, lang: EmailLang): string {
  const locale = lang === 'ar' ? 'ar-DZ' : 'fr-DZ'
  return amount.toLocaleString(locale) + ' DA'
}

function formatDate(date: Date, lang: EmailLang): string {
  const locale = lang === 'fr' ? 'fr-DZ' : lang === 'ar' ? 'ar-DZ' : 'en-GB'
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
}

function renderBodyHtml(body: string): string {
  // Convert simple markdown-ish syntax to HTML
  // Escape HTML first, then convert **bold** and newlines
  const escaped = escapeHtml(body)
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .split(/\n{2,}/)
    .map(para => `<p style="margin:0 0 16px;color:#334155;font-size:15px;line-height:1.6;">${para.replace(/\n/g, '<br/>')}</p>`)
    .join('')
}

function whatsappLinkFor(lang: EmailLang, whatsapp: string, planName: string, isNew = false): string {
  const msg =
    isNew
      ? (lang === 'ar'  ? `مرحباً، أريد الدفع لاشتراك ${planName}` :
         lang === 'en'  ? `Hello, I would like to pay for my ${planName} subscription` :
                          `Bonjour, je souhaite payer pour mon abonnement ${planName}`)
      : (lang === 'ar'  ? `مرحباً، أريد تجديد اشتراك ${planName}` :
         lang === 'en'  ? `Hello, I want to renew my ${planName} subscription` :
                          `Bonjour, je souhaite renouveler mon abonnement ${planName}`)
  return `https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`
}

function buildPaymentBlocks(lang: EmailLang, planName: string, amount: number, s: PaymentSettings): string {
  const isNew = s.isNew ?? false
  const t = {
    fr: {
      title: isNew ? '👇 Comment payer ?' : '👇 Comment renouveler ?',
      ccpTitle: '💳 Virement CCP',
      ccpInstr: (a: string) => `Effectuez un virement de <strong>${a}</strong> sur le compte CCP :`,
      chargilyTitle: '🔵 Paiement en ligne (Chargily ePay)',
      chargilyBtn: 'Payer maintenant',
      whatsappTitle: '📱 WhatsApp',
      whatsappInstr: isNew ? 'Contactez-nous sur WhatsApp pour payer votre abonnement :' : 'Contactez-nous sur WhatsApp pour finaliser votre renouvellement :',
      whatsappBtn: 'Ouvrir WhatsApp',
    },
    en: {
      title: isNew ? '👇 How to pay?' : '👇 How to renew?',
      ccpTitle: '💳 CCP Bank Transfer',
      ccpInstr: (a: string) => `Transfer <strong>${a}</strong> to CCP account:`,
      chargilyTitle: '🔵 Online Payment (Chargily ePay)',
      chargilyBtn: 'Pay now',
      whatsappTitle: '📱 WhatsApp',
      whatsappInstr: isNew ? 'Contact us on WhatsApp to pay for your subscription:' : 'Contact us on WhatsApp to complete your renewal:',
      whatsappBtn: 'Open WhatsApp',
    },
    ar: {
      title: isNew ? '👇 كيفية الدفع؟' : '👇 كيفية التجديد؟',
      ccpTitle: '💳 تحويل CCP',
      ccpInstr: (a: string) => `قم بتحويل مبلغ <strong>${a}</strong> إلى حساب CCP:`,
      chargilyTitle: '🔵 الدفع الإلكتروني (Chargily ePay)',
      chargilyBtn: 'ادفع الآن',
      whatsappTitle: '📱 واتساب',
      whatsappInstr: isNew ? 'تواصل معنا عبر واتساب للدفع :' : 'تواصل معنا عبر واتساب لإتمام التجديد:',
      whatsappBtn: 'فتح واتساب',
    },
  }[lang]

  const amountStr = formatAmount(amount, lang)
  const blocks: string[] = []

  if (s.ccpNumber) {
    blocks.push(`
      <div style="margin-bottom:12px;padding:16px 20px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;">
        <p style="margin:0 0 6px;font-weight:700;font-size:14px;color:#15803d;">${t.ccpTitle}</p>
        <p style="margin:0 0 8px;font-size:14px;color:#166534;">${t.ccpInstr(amountStr)}</p>
        <p style="margin:0;font-size:18px;font-weight:800;letter-spacing:1px;color:#14532d;background:#dcfce7;display:inline-block;padding:6px 14px;border-radius:8px;">${escapeHtml(s.ccpNumber)}</p>
      </div>`)
  }

  if (s.chargilyCheckoutUrl) {
    blocks.push(`
      <div style="margin-bottom:12px;padding:16px 20px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;">
        <p style="margin:0 0 10px;font-weight:700;font-size:14px;color:#1d4ed8;">${t.chargilyTitle}</p>
        <a href="${s.chargilyCheckoutUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">${t.chargilyBtn}</a>
      </div>`)
  }

  if (s.whatsapp) {
    const link = whatsappLinkFor(lang, s.whatsapp, planName, s.isNew)
    blocks.push(`
      <div style="margin-bottom:12px;padding:16px 20px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;">
        <p style="margin:0 0 6px;font-weight:700;font-size:14px;color:#15803d;">${t.whatsappTitle}</p>
        <p style="margin:0 0 10px;font-size:14px;color:#166534;">${t.whatsappInstr}</p>
        <a href="${link}" style="display:inline-block;background:#25d366;color:#fff;padding:10px 22px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;">${t.whatsappBtn}</a>
      </div>`)
  }

  if (blocks.length === 0) {
    const contactMsg = {
      fr: `Veuillez nous contacter pour effectuer votre paiement de <strong>${amountStr}</strong>.`,
      en: `Please contact us to make your payment of <strong>${amountStr}</strong>.`,
      ar: `يرجى التواصل معنا لإتمام دفع مبلغ <strong>${amountStr}</strong>.`,
    }[lang]
    return `
      <p style="margin:24px 0 16px;font-weight:700;font-size:15px;color:#0f172a;">${t.title}</p>
      <div style="margin-bottom:12px;padding:16px 20px;background:#fef3c7;border:1px solid #fde68a;border-radius:12px;">
        <p style="margin:0;font-size:14px;color:#92400e;">${contactMsg}</p>
      </div>`
  }
  return `<p style="margin:24px 0 16px;font-weight:700;font-size:15px;color:#0f172a;">${t.title}</p>${blocks.join('')}`
}

export function renderEmail(params: {
  template: EmailTemplate
  lang: EmailLang
  data: RenderData
  settings: PaymentSettings
}): { subject: string; html: string } {
  const { template, lang, data, settings } = params

  const values: Record<string, string> = {
    clientName:  escapeHtml(data.clientName),
    planName:    escapeHtml(data.planName),
    companyName: escapeHtml(data.companyName),
    amount:      formatAmount(data.amount, lang),
    expiresAt:   formatDate(data.expiresAt, lang),
  }

  const subject = replacePlaceholders(template.subject, {
    ...values,
    clientName:  data.clientName,
    planName:    data.planName,
    companyName: data.companyName,
  })

  const bodyHtml = replacePlaceholders(renderBodyHtml(template.body), values)
  const paymentHtml = buildPaymentBlocks(lang, data.planName, data.amount, settings)
  const isRtl = lang === 'ar'

  const html = `<!DOCTYPE html>
<html lang="${lang}" dir="${isRtl ? 'rtl' : 'ltr'}">
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
        <tr><td style="padding:40px;" dir="${isRtl ? 'rtl' : 'ltr'}">
          ${bodyHtml}
          ${paymentHtml}
        </td></tr>
        <tr><td>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;">
            <tr><td align="center"><p style="margin:0;color:#94a3b8;font-size:12px;">© ${new Date().getFullYear()} ${escapeHtml(data.companyName)}</p></td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`

  return { subject, html }
}

export async function generateChargilyCheckout(
  key: string,
  amountDA: number,
  planName: string,
  successUrl = 'https://erp.yelha.net',
  metadata?: { subscriptionId: string; companyId: string },
): Promise<string | null> {
  try {
    const res = await fetch('https://pay.chargily.net/api/v2/checkouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        amount: Math.round(amountDA * 100),
        currency: 'dzd',
        success_url: successUrl,
        failure_url: successUrl,
        description: `${planName}`,
        ...(metadata ? { metadata: { type: 'sub_renewal', ...metadata } } : {}),
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return (data.checkout_url ?? data.url ?? null) as string | null
  } catch {
    return null
  }
}
