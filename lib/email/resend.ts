import { Resend } from 'resend'

const FROM = 'YelhaERP <noreply@yelha.net>'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY)
}

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  return getResend().emails.send({ from: FROM, to, subject, html })
}

function header(locale: string) {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1D9E75,#3ec79c);padding:32px 40px;">
    <tr><td align="center">
      <span style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">📊 YelhaERP</span>
    </td></tr>
  </table>`
}

function footer() {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;">
    <tr><td align="center">
      <p style="margin:0;color:#94a3b8;font-size:12px;">© ${new Date().getFullYear()} YelhaERP — Alger, Algérie</p>
    </td></tr>
  </table>`
}

function wrap(locale: string, content: string) {
  return `<!DOCTYPE html>
<html lang="${locale}" dir="${locale === 'ar' ? 'rtl' : 'ltr'}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Inter,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.06);">
        <tr><td>${header(locale)}</td></tr>
        <tr><td style="padding:40px;">${content}</td></tr>
        <tr><td>${footer()}</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

export async function sendVerificationCode(email: string, code: string, name: string, locale = 'fr') {
  const subjects = {
    fr: 'Votre code de vérification — YelhaERP',
    en: 'Your verification code — YelhaERP',
    ar: 'رمز التحقق الخاص بك — YelhaERP',
  }

  const greet = locale === 'ar' ? `مرحباً ${name}` : locale === 'en' ? `Hi ${name}` : `Bonjour ${name}`
  const desc = locale === 'ar'
    ? 'استخدم الرمز أدناه لتأكيد بريدك الإلكتروني وتفعيل حسابك.'
    : locale === 'en'
    ? 'Use the code below to confirm your email address and activate your account.'
    : 'Utilisez le code ci-dessous pour confirmer votre adresse email et activer votre compte.'
  const validity = locale === 'ar' ? 'صالح لمدة 15 دقيقة' : locale === 'en' ? 'Valid for 15 minutes' : 'Valable 15 minutes'
  const ignore = locale === 'ar' ? 'إذا لم تطلب ذلك، تجاهل هذا البريد.' : locale === 'en' ? "If you didn't request this, ignore this email." : "Si vous n'avez pas fait cette demande, ignorez cet email."

  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">${greet}</h1>
    <p style="margin:0 0 28px;color:#64748b;font-size:15px;line-height:1.6;">${desc}</p>
    <div style="background:#f8fafc;border:2px dashed #e2e8f0;border-radius:16px;padding:32px;text-align:center;margin-bottom:28px;">
      <p style="margin:0 0 8px;color:#94a3b8;font-size:12px;text-transform:uppercase;letter-spacing:1px;">${validity}</p>
      <div style="font-size:48px;font-weight:900;letter-spacing:12px;color:#1D9E75;font-family:monospace;">${code}</div>
    </div>
    <p style="margin:0;color:#94a3b8;font-size:13px;text-align:center;">${ignore}</p>`

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: subjects[locale as keyof typeof subjects] ?? subjects.fr,
    html: wrap(locale, content),
  })
}

export async function sendWelcomeEmail(email: string, name: string, locale = 'fr') {
  const subjects = {
    fr: 'Bienvenue sur YelhaERP 🎉',
    en: 'Welcome to YelhaERP 🎉',
    ar: 'مرحباً بك في YelhaERP 🎉',
  }

  const greet = locale === 'ar' ? `مرحباً بك ${name}!` : locale === 'en' ? `Welcome, ${name}!` : `Bienvenue, ${name} !`
  const msg = locale === 'ar'
    ? 'حسابك جاهز الآن. يمكنك الآن إدارة فواتيرك ومخزونك ومحاسبتك ورواتبك في مكان واحد.'
    : locale === 'en'
    ? 'Your account is ready. You can now manage your invoices, stock, accounting, and payroll — all in one place.'
    : 'Votre compte est prêt. Gérez désormais vos factures, votre stock, votre comptabilité et votre paie — tout en un seul endroit.'
  const cta = locale === 'ar' ? 'البدء الآن' : locale === 'en' ? 'Get started' : 'Commencer'
  const trial = locale === 'ar' ? 'أنت في فترة تجريبية مجانية لمدة 10 أيام.' : locale === 'en' ? "You're on a free 10-day trial." : 'Vous bénéficiez d\'un essai gratuit de 10 jours.'

  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">${greet}</h1>
    <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.6;">${msg}</p>
    <div style="background:#f0fdf8;border-left:4px solid #1D9E75;border-radius:8px;padding:16px 20px;margin-bottom:28px;">
      <p style="margin:0;color:#166534;font-size:14px;">🎁 ${trial}</p>
    </div>
    <div style="text-align:center;margin:32px 0;">
      <a href="https://erp.yelha.net/dashboard" style="display:inline-block;background:#1D9E75;color:#fff;font-size:15px;font-weight:600;padding:14px 40px;border-radius:12px;text-decoration:none;">${cta} →</a>
    </div>`

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: subjects[locale as keyof typeof subjects] ?? subjects.fr,
    html: wrap(locale, content),
  })
}
