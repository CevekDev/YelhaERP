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

// ── Restaurant emails ─────────────────────────────────────────

export async function sendReservationConfirmation(params: {
  to: string
  guestName: string
  restaurantName: string
  date: Date
  guestCount: number
  tableNumber?: string
  restaurantAddress?: string
  restaurantPhone?: string
}) {
  const { to, guestName, restaurantName, date, guestCount, tableNumber, restaurantAddress, restaurantPhone } = params
  const dateStr = date.toLocaleDateString('fr-DZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr = date.toLocaleTimeString('fr-DZ', { hour: '2-digit', minute: '2-digit' })

  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Réservation confirmée ✅</h1>
    <p style="margin:0 0 24px;color:#64748b;font-size:15px;">Bonjour ${guestName}, votre réservation au <strong>${restaurantName}</strong> est confirmée.</p>
    <div style="background:#f0fdf8;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:6px 0;color:#64748b;font-size:14px;">📅 Date</td><td style="padding:6px 0;font-weight:600;font-size:14px;text-align:right;">${dateStr}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;font-size:14px;">⏰ Heure</td><td style="padding:6px 0;font-weight:600;font-size:14px;text-align:right;">${timeStr}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;font-size:14px;">👥 Couverts</td><td style="padding:6px 0;font-weight:600;font-size:14px;text-align:right;">${guestCount} personne${guestCount > 1 ? 's' : ''}</td></tr>
        ${tableNumber ? `<tr><td style="padding:6px 0;color:#64748b;font-size:14px;">🪑 Table</td><td style="padding:6px 0;font-weight:600;font-size:14px;text-align:right;">${tableNumber}</td></tr>` : ''}
        ${restaurantAddress ? `<tr><td style="padding:6px 0;color:#64748b;font-size:14px;">📍 Adresse</td><td style="padding:6px 0;font-weight:600;font-size:14px;text-align:right;">${restaurantAddress}</td></tr>` : ''}
        ${restaurantPhone ? `<tr><td style="padding:6px 0;color:#64748b;font-size:14px;">📞 Contact</td><td style="padding:6px 0;font-weight:600;font-size:14px;text-align:right;">${restaurantPhone}</td></tr>` : ''}
      </table>
    </div>
    <p style="margin:0;color:#94a3b8;font-size:13px;text-align:center;">Pour annuler ou modifier votre réservation, appelez-nous au ${restaurantPhone ?? 'notre numéro'}.</p>`

  await getResend().emails.send({
    from: FROM,
    to,
    subject: `Votre réservation au ${restaurantName} est confirmée`,
    html: wrap('fr', content),
  }).catch(() => {})
}

export async function sendReservationReminder(params: {
  to: string
  guestName: string
  restaurantName: string
  date: Date
  guestCount: number
  restaurantAddress?: string
}) {
  const { to, guestName, restaurantName, date, guestCount, restaurantAddress } = params
  const timeStr = date.toLocaleTimeString('fr-DZ', { hour: '2-digit', minute: '2-digit' })
  const mapsLink = restaurantAddress
    ? `https://maps.google.com/?q=${encodeURIComponent(restaurantAddress)}`
    : null

  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">⏰ Rappel de réservation</h1>
    <p style="margin:0 0 24px;color:#64748b;font-size:15px;">Bonjour ${guestName}, nous vous rappelons votre réservation au <strong>${restaurantName}</strong> dans <strong>1 heure</strong>.</p>
    <div style="background:#fefce8;border:1px solid #fde68a;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0;font-size:15px;font-weight:600;">🍽️ ${timeStr} — ${guestCount} couvert${guestCount > 1 ? 's' : ''}</p>
    </div>
    ${mapsLink ? `<div style="text-align:center;margin:24px 0;"><a href="${mapsLink}" style="display:inline-block;background:#1D9E75;color:#fff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:10px;text-decoration:none;">📍 Voir l'itinéraire</a></div>` : ''}
    <p style="margin:0;color:#94a3b8;font-size:13px;text-align:center;">À tout à l'heure !</p>`

  await getResend().emails.send({
    from: FROM,
    to,
    subject: `Rappel : votre réservation au ${restaurantName} dans 1h`,
    html: wrap('fr', content),
  }).catch(() => {})
}

// ── Subscription emails ───────────────────────────────────────

export async function sendSubscriptionRenewed(params: {
  to: string
  clientName: string
  planName: string
  nextBillingDate: Date
  companyName: string
}) {
  const { to, clientName, planName, nextBillingDate, companyName } = params
  const nextDate = nextBillingDate.toLocaleDateString('fr-DZ', { day: 'numeric', month: 'long', year: 'numeric' })

  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Abonnement renouvelé ✅</h1>
    <p style="margin:0 0 24px;color:#64748b;font-size:15px;">Bonjour ${clientName}, votre paiement pour l'abonnement <strong>${planName}</strong> chez <strong>${companyName}</strong> a bien été reçu.</p>
    <div style="background:#f0fdf8;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0;color:#166534;font-size:14px;">📅 Prochaine facturation : <strong>${nextDate}</strong></p>
    </div>
    <p style="margin:0;color:#94a3b8;font-size:13px;text-align:center;">Merci pour votre confiance.</p>`

  await getResend().emails.send({
    from: FROM, to,
    subject: `Abonnement ${planName} renouvelé — ${companyName}`,
    html: wrap('fr', content),
  }).catch(() => {})
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

// ── Billing emails ────────────────────────────────────────────

export async function sendTrialWelcome({ to, name }: { to: string; name: string }) {
  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">🎁 Bonjour ${name} !</h1>
    <p style="margin:0 0 20px;color:#64748b;font-size:15px;line-height:1.6;">Votre essai gratuit de <strong>30 jours</strong> vient de commencer.</p>
    <div style="background:#E1F5EE;border:1px solid #1D9E75;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0;color:#0F6E56;font-size:14px;">✅ Inclus : Facturation · Clients · Stock · Dépenses · Devis + 3 apps au choix</p>
    </div>
    <div style="text-align:center;margin:28px 0;">
      <a href="https://erp.yelha.net/onboarding/apps" style="display:inline-block;background:#1D9E75;color:#fff;font-size:15px;font-weight:600;padding:14px 36px;border-radius:12px;text-decoration:none;">Choisir mes 3 apps →</a>
    </div>`
  await getResend().emails.send({ from: FROM, to, subject: 'Bienvenue sur YelhaERP — votre essai de 30 jours commence', html: wrap('fr', content) }).catch(() => {})
}

export async function sendTrialReminder({ to, name, daysLeft }: { to: string; name: string; daysLeft: number }) {
  const urgent = daysLeft <= 3
  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">⏰ Votre essai expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}</h1>
    <p style="margin:0 0 20px;color:#64748b;font-size:15px;">Bonjour ${name}, continuez avec le plan <strong>Starter à 990 DA/mois</strong>.</p>
    <div style="background:${urgent ? '#FEF2F2' : '#FFF7ED'};border:1px solid ${urgent ? '#FCA5A5' : '#FCD34D'};border-radius:12px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0;color:${urgent ? '#991B1B' : '#92400E'};font-size:14px;font-weight:600;">${urgent ? '🚨' : '⏳'} Il vous reste ${daysLeft} jour${daysLeft > 1 ? 's' : ''}.</p>
    </div>
    <div style="text-align:center;margin:28px 0;">
      <a href="https://erp.yelha.net/pricing" style="display:inline-block;background:#1D9E75;color:#fff;font-size:15px;font-weight:600;padding:14px 36px;border-radius:12px;text-decoration:none;">Choisir un plan →</a>
    </div>`
  await getResend().emails.send({ from: FROM, to, subject: `Votre essai YelhaERP expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`, html: wrap('fr', content) }).catch(() => {})
}

export async function sendTrialExpired({ to, name }: { to: string; name: string }) {
  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Votre essai YelhaERP est terminé</h1>
    <p style="margin:0 0 20px;color:#64748b;font-size:15px;">Bonjour ${name}, vos données sont conservées pendant 30 jours supplémentaires.</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="https://erp.yelha.net/pricing" style="display:inline-block;background:#1D9E75;color:#fff;font-size:15px;font-weight:600;padding:14px 36px;border-radius:12px;text-decoration:none;">Voir les plans →</a>
    </div>`
  await getResend().emails.send({ from: FROM, to, subject: 'Votre essai YelhaERP est terminé — vos données sont conservées 30 jours', html: wrap('fr', content) }).catch(() => {})
}

export async function sendPaymentConfirmation({ to, name, planName, amount, nextBillingDate, apps }: {
  to: string; name: string; planName: string; amount: number; nextBillingDate: Date; apps: string[]
}) {
  const nextDate = nextBillingDate.toLocaleDateString('fr-DZ', { day: 'numeric', month: 'long', year: 'numeric' })
  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Paiement reçu ✅</h1>
    <p style="margin:0 0 20px;color:#64748b;font-size:15px;">Bonjour ${name}, plan <strong>${planName}</strong> activé. Prochaine facture : <strong>${nextDate}</strong> — ${amount.toLocaleString('fr-DZ')} DA.</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="https://erp.yelha.net/dashboard" style="display:inline-block;background:#1D9E75;color:#fff;font-size:15px;font-weight:600;padding:14px 36px;border-radius:12px;text-decoration:none;">Accéder à mon dashboard →</a>
    </div>
    ${apps.length > 0 ? `<p style="color:#64748b;font-size:13px;text-align:center;">Apps : ${apps.join(' · ')}</p>` : ''}`
  await getResend().emails.send({ from: FROM, to, subject: `Paiement reçu — Plan ${planName} activé`, html: wrap('fr', content) }).catch(() => {})
}

export async function sendCCPInstructions({ to, name, amount, ccpRef, planName }: {
  to: string; name: string; amount: number; ccpRef: string; planName: string
}) {
  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Instructions de virement CCP</h1>
    <p style="margin:0 0 20px;color:#64748b;font-size:15px;">Bonjour ${name}, pour activer votre plan <strong>${planName}</strong> :</p>
    <div style="background:#f8fafc;border:2px dashed #e2e8f0;border-radius:12px;padding:24px;margin-bottom:24px;">
      <p style="margin:4px 0;font-size:14px;"><strong>CCP :</strong> 00123456789 CCP Alger</p>
      <p style="margin:4px 0;font-size:14px;"><strong>Titulaire :</strong> Yelha Technologies</p>
      <p style="margin:4px 0;font-size:16px;color:#1D9E75;font-weight:700;"><strong>Montant :</strong> ${amount.toLocaleString('fr-DZ')} DA</p>
      <p style="margin:4px 0;font-size:14px;"><strong>Référence :</strong> ${ccpRef}</p>
    </div>
    <p style="color:#92400e;font-size:13px;">Envoyez votre reçu à <a href="mailto:cvkdev@outlook.fr">cvkdev@outlook.fr</a> avec la référence <strong>${ccpRef}</strong>. Activation sous 24–48h.</p>`
  await getResend().emails.send({ from: FROM, to, subject: 'Instructions de virement CCP — YelhaERP', html: wrap('fr', content) }).catch(() => {})
}

export async function sendPaymentFailed({ to, name, planName }: { to: string; name: string; planName: string }) {
  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Problème de paiement ⚠️</h1>
    <p style="margin:0 0 20px;color:#64748b;font-size:15px;">Bonjour ${name}, votre paiement pour le plan <strong>${planName}</strong> n'a pas pu être traité.</p>
    <div style="margin-bottom:24px;">
      <a href="https://erp.yelha.net/subscriptions/checkout" style="display:inline-block;background:#1D9E75;color:#fff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:10px;text-decoration:none;margin-right:8px;">Réessayer →</a>
      <a href="https://erp.yelha.net/subscriptions/checkout?method=ccp" style="display:inline-block;background:#f8fafc;color:#0f172a;border:1px solid #e2e8f0;font-size:14px;padding:12px 24px;border-radius:10px;text-decoration:none;">Payer par CCP →</a>
    </div>
    <p style="color:#94a3b8;font-size:13px;">Aide : <a href="mailto:cvkdev@outlook.fr" style="color:#1D9E75;">cvkdev@outlook.fr</a></p>`
  await getResend().emails.send({ from: FROM, to, subject: 'Problème de paiement — Action requise', html: wrap('fr', content) }).catch(() => {})
}
