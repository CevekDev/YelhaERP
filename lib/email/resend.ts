import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'YelhaERP <noreply@yelha.net>'
const BASE_URL = process.env.NEXTAUTH_URL ?? 'https://erp.yelha.net'

export async function sendVerificationEmail(email: string, token: string, name: string, locale = 'fr') {
  const url = `${BASE_URL}/verify-email?token=${token}`

  const subjects = {
    fr: 'Confirmez votre adresse email — YelhaERP',
    en: 'Confirm your email address — YelhaERP',
    ar: 'تأكيد بريدك الإلكتروني — YelhaERP',
  }
  const subject = subjects[locale as keyof typeof subjects] ?? subjects.fr

  const html = `
<!DOCTYPE html>
<html lang="${locale}" dir="${locale === 'ar' ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Inter,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.06);">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1D9E75,#3ec79c);padding:32px 40px;text-align:center;">
          <div style="display:inline-flex;align-items:center;gap:10px;">
            <div style="width:36px;height:36px;background:rgba(255,255,255,.2);border-radius:10px;display:inline-flex;align-items:center;justify-content:center;font-size:20px;">📊</div>
            <span style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">YelhaERP</span>
          </div>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0f172a;">
            ${locale === 'ar' ? `مرحباً ${name}` : locale === 'en' ? `Hi ${name}` : `Bonjour ${name}`}
          </h1>
          <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.6;">
            ${locale === 'ar'
              ? 'شكراً لتسجيلك في YelhaERP. انقر على الزر أدناه لتأكيد بريدك الإلكتروني وتفعيل حسابك.'
              : locale === 'en'
              ? 'Thank you for signing up for YelhaERP. Click the button below to confirm your email address and activate your account.'
              : 'Merci de vous être inscrit sur YelhaERP. Cliquez sur le bouton ci-dessous pour confirmer votre adresse email et activer votre compte.'}
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${url}" style="display:inline-block;background:#1D9E75;color:#fff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:10px;text-decoration:none;">
              ${locale === 'ar' ? 'تأكيد البريد الإلكتروني' : locale === 'en' ? 'Confirm my email' : 'Confirmer mon email'}
            </a>
          </div>
          <p style="margin:0;color:#94a3b8;font-size:13px;text-align:center;">
            ${locale === 'ar'
              ? 'هذا الرابط صالح لمدة 24 ساعة. إذا لم تطلب هذا، تجاهل هذا البريد.'
              : locale === 'en'
              ? 'This link is valid for 24 hours. If you didn\'t request this, ignore this email.'
              : 'Ce lien est valable 24 heures. Si vous n\'avez pas fait cette demande, ignorez cet email.'}
          </p>
          <hr style="margin:32px 0;border:none;border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
            ${url}
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#94a3b8;font-size:12px;">
            © ${new Date().getFullYear()} YelhaERP — Alger, Algérie
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  await resend.emails.send({ from: FROM, to: email, subject, html })
}
