import { Resend } from 'resend'

const FROM = 'YelhaSubs <noreply@yelha.net>'

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
      <span style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">📊 YelhaSubs</span>
    </td></tr>
  </table>`
}

function footer() {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;">
    <tr><td align="center">
      <p style="margin:0;color:#94a3b8;font-size:12px;">© ${new Date().getFullYear()} YelhaSubs — Alger, Algérie</p>
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
    fr: 'Votre code de vérification — YelhaSubs',
    en: 'Your verification code — YelhaSubs',
    ar: 'رمز التحقق الخاص بك — YelhaSubs',
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
    fr: 'Bienvenue sur YelhaSubs 🎉',
    en: 'Welcome to YelhaSubs 🎉',
    ar: 'مرحباً بك في YelhaSubs 🎉',
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
      <a href="https://subs.yelha.net/dashboard" style="display:inline-block;background:#1D9E75;color:#fff;font-size:15px;font-weight:600;padding:14px 40px;border-radius:12px;text-decoration:none;">${cta} →</a>
    </div>`

  await getResend().emails.send({
    from: FROM,
    to: email,
    subject: subjects[locale as keyof typeof subjects] ?? subjects.fr,
    html: wrap(locale, content),
  })
}

// ── Billing helpers ───────────────────────────────────────────

function planComparisonTable(): string {
  const plans = [
    { name: 'Starter',  price: '990',   limit: '20 abonnements',    wl: false },
    { name: 'Premium',  price: '1 990', limit: '50 abonnements',    wl: false },
    { name: 'Pro',      price: '2 990', limit: '220 abonnements',   wl: true  },
    { name: 'Agency',   price: '4 990', limit: 'Illimité',           wl: true  },
  ]
  const rows = plans.map(p => `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-size:14px;font-weight:700;color:#0f172a;">${p.name}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;text-align:center;"><strong>${p.price} DA</strong><span style="color:#94a3b8;font-size:12px;">/mois</span></td>
      <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#64748b;text-align:center;">${p.limit}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;color:${p.wl ? '#1D9E75' : '#94a3b8'};text-align:center;">${p.wl ? '✅ Emails à votre nom' : '—'}</td>
    </tr>`).join('')

  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:8px;">
    <tr style="background:#f8fafc;">
      <th style="padding:10px 14px;font-size:12px;color:#94a3b8;text-align:left;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Plan</th>
      <th style="padding:10px 14px;font-size:12px;color:#94a3b8;text-align:center;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Prix</th>
      <th style="padding:10px 14px;font-size:12px;color:#94a3b8;text-align:center;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Limite</th>
      <th style="padding:10px 14px;font-size:12px;color:#94a3b8;text-align:center;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">White-label</th>
    </tr>
    ${rows}
  </table>
  <p style="margin:0 0 4px;color:#94a3b8;font-size:11px;text-align:center;">15 jours d'essai gratuit · Sans carte bancaire · Annulable à tout moment</p>`
}

function ccpBlock(): string {
  return `
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-top:12px;">
    <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#0f172a;">🏦 Instructions virement CCP :</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:4px 0;color:#64748b;font-size:13px;">Compte CCP</td><td style="padding:4px 0;font-weight:700;font-size:13px;text-align:right;font-family:monospace;color:#0f172a;">00799999004399346548</td></tr>
      <tr><td style="padding:4px 0;color:#64748b;font-size:13px;">Titulaire</td><td style="padding:4px 0;font-weight:600;font-size:13px;text-align:right;">Yelha Technologies</td></tr>
    </table>
    <p style="margin:10px 0 0;color:#92400e;font-size:12px;line-height:1.5;">Après le virement, envoyez votre reçu sur WhatsApp au <strong>+33 7 61 17 93 79</strong> ou à <a href="mailto:cvkdev@outlook.fr" style="color:#1D9E75;">cvkdev@outlook.fr</a> — activation sous 24h.</p>
  </div>`
}

// ── Billing emails ────────────────────────────────────────────

export async function sendTrialWelcome({ to, name, trialEndsAt }: { to: string; name: string; trialEndsAt: Date }) {
  const endStr = trialEndsAt.toLocaleDateString('fr-DZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">🎁 Bienvenue, ${name} !</h1>
    <p style="margin:0 0 20px;color:#64748b;font-size:15px;line-height:1.6;">Votre essai gratuit de <strong>15 jours</strong> vient de commencer. Aucune carte bancaire requise.</p>
    <div style="background:#f0fdf8;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 6px;font-weight:700;color:#166534;font-size:14px;">📅 Votre essai est actif jusqu'au :</p>
      <p style="margin:0;font-size:18px;font-weight:800;color:#15803d;">${endStr}</p>
    </div>
    <p style="margin:0 0 12px;color:#64748b;font-size:14px;">Pendant votre essai, vous pouvez :</p>
    <ul style="margin:0 0 24px;padding-left:20px;color:#64748b;font-size:14px;line-height:1.8;">
      <li>Créer jusqu'à <strong>5 abonnements clients</strong></li>
      <li>Configurer vos plans et tarifs</li>
      <li>Envoyer des rappels de paiement automatiques</li>
      <li>Tester les paiements Chargily et CCP</li>
    </ul>
    <div style="text-align:center;margin:28px 0;">
      <a href="https://subs.yelha.net/dashboard" style="display:inline-block;background:#1D9E75;color:#fff;font-size:15px;font-weight:600;padding:14px 36px;border-radius:12px;text-decoration:none;">Accéder à mon tableau de bord →</a>
    </div>
    <p style="margin:0;color:#94a3b8;font-size:13px;text-align:center;">À la fin de l'essai, choisissez un plan pour continuer sans interruption.</p>`
  await getResend().emails.send({ from: FROM, to, subject: `🎁 Votre essai YelhaSubs de 15 jours a commencé — expire le ${endStr}`, html: wrap('fr', content) }).catch(() => {})
}

export async function sendTrialReminder({ to, name, daysLeft, trialEndsAt }: { to: string; name: string; daysLeft: number; trialEndsAt: Date }) {
  const urgent = daysLeft <= 1
  const endStr = trialEndsAt.toLocaleDateString('fr-DZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const billingUrl = 'https://subs.yelha.net/dashboard/settings/billing'
  const waMsg = encodeURIComponent(`Bonjour, mon essai YelhaSubs expire le ${endStr}. Je souhaite choisir un plan et payer.`)
  const waUrl = `https://wa.me/33761179379?text=${waMsg}`
  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">
      ${urgent ? '🚨 Votre essai expire demain !' : `⏰ Votre essai expire dans ${daysLeft} jours`}
    </h1>
    <p style="margin:0 0 4px;color:#64748b;font-size:15px;">Bonjour ${name}, votre essai YelhaSubs se termine le <strong>${endStr}</strong>.</p>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;">Choisissez un plan maintenant pour continuer sans interruption.</p>

    ${planComparisonTable()}

    <p style="margin:20px 0 12px;font-size:14px;font-weight:700;color:#0f172a;">Comment payer :</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
      <tr>
        <td style="padding:0 6px 0 0;" width="50%">
          <a href="${billingUrl}" style="display:block;background:#1D9E75;color:#fff;font-size:14px;font-weight:600;padding:13px 16px;border-radius:12px;text-decoration:none;text-align:center;">💳 Payer par Chargily<br><span style="font-size:11px;font-weight:400;opacity:.9;">Edahabia / CIB — immédiat</span></a>
        </td>
        <td style="padding:0 0 0 6px;" width="50%">
          <a href="${waUrl}" style="display:block;background:#25D366;color:#fff;font-size:14px;font-weight:600;padding:13px 16px;border-radius:12px;text-decoration:none;text-align:center;">📱 WhatsApp<br><span style="font-size:11px;font-weight:400;opacity:.9;">+33 7 61 17 93 79</span></a>
        </td>
      </tr>
    </table>
    ${ccpBlock()}`
  await getResend().emails.send({ from: FROM, to, subject: urgent ? `🚨 Votre essai YelhaSubs expire demain — choisissez un plan` : `⏰ Votre essai YelhaSubs expire dans ${daysLeft} jours`, html: wrap('fr', content) }).catch(() => {})
}

export async function sendTrialExpired({ to, name }: { to: string; name: string }) {
  const billingUrl = 'https://subs.yelha.net/dashboard/settings/billing'
  const waMsg = encodeURIComponent(`Bonjour, mon essai gratuit YelhaSubs est terminé. Je souhaite choisir un plan et payer.`)
  const waUrl = `https://wa.me/33761179379?text=${waMsg}`
  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">⏰ Votre essai YelhaSubs est terminé</h1>
    <p style="margin:0 0 4px;color:#64748b;font-size:15px;">Bonjour ${name}, votre période d'essai gratuit a expiré.</p>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;">Vos données sont conservées pendant <strong>15 jours</strong>. Choisissez un plan maintenant pour les conserver et reprendre sans interruption.</p>

    ${planComparisonTable()}

    <p style="margin:20px 0 12px;font-size:14px;font-weight:700;color:#0f172a;">Comment activer votre abonnement :</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
      <tr>
        <td style="padding:0 6px 0 0;" width="50%">
          <a href="${billingUrl}" style="display:block;background:#1D9E75;color:#fff;font-size:14px;font-weight:600;padding:13px 16px;border-radius:12px;text-decoration:none;text-align:center;">💳 Payer par Chargily<br><span style="font-size:11px;font-weight:400;opacity:.9;">Edahabia / CIB — immédiat</span></a>
        </td>
        <td style="padding:0 0 0 6px;" width="50%">
          <a href="${waUrl}" style="display:block;background:#25D366;color:#fff;font-size:14px;font-weight:600;padding:13px 16px;border-radius:12px;text-decoration:none;text-align:center;">📱 WhatsApp<br><span style="font-size:11px;font-weight:400;opacity:.9;">+33 7 61 17 93 79</span></a>
        </td>
      </tr>
    </table>
    ${ccpBlock()}`
  await getResend().emails.send({ from: FROM, to, subject: '⏰ Votre essai YelhaSubs est terminé — activez un plan pour continuer', html: wrap('fr', content) }).catch(() => {})
}

export async function sendPaymentConfirmation({ to, name, planName, amount, nextBillingDate, apps }: {
  to: string; name: string; planName: string; amount: number; nextBillingDate: Date; apps: string[]
}) {
  const nextDate = nextBillingDate.toLocaleDateString('fr-DZ', { day: 'numeric', month: 'long', year: 'numeric' })
  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Paiement reçu ✅</h1>
    <p style="margin:0 0 20px;color:#64748b;font-size:15px;">Bonjour ${name}, plan <strong>${planName}</strong> activé. Prochaine facture : <strong>${nextDate}</strong> — ${amount.toLocaleString('fr-DZ')} DA.</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="https://subs.yelha.net/dashboard" style="display:inline-block;background:#1D9E75;color:#fff;font-size:15px;font-weight:600;padding:14px 36px;border-radius:12px;text-decoration:none;">Accéder à mon dashboard →</a>
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
      <p style="margin:4px 0;font-size:14px;"><strong>CCP :</strong> 00799999004399346548</p>
      <p style="margin:4px 0;font-size:14px;"><strong>Titulaire :</strong> Yelha Technologies</p>
      <p style="margin:4px 0;font-size:16px;color:#1D9E75;font-weight:700;"><strong>Montant :</strong> ${amount.toLocaleString('fr-DZ')} DA</p>
      <p style="margin:4px 0;font-size:14px;"><strong>Référence :</strong> ${ccpRef}</p>
    </div>
    <p style="color:#92400e;font-size:13px;">Envoyez votre reçu à <a href="mailto:cvkdev@outlook.fr">cvkdev@outlook.fr</a> avec la référence <strong>${ccpRef}</strong>. Activation sous 24–48h.</p>`
  await getResend().emails.send({ from: FROM, to, subject: 'Instructions de virement CCP — YelhaSubs', html: wrap('fr', content) }).catch(() => {})
}

export async function sendAppGiftSubscription(params: {
  to: string; name: string; appName: string; planName: string
  periodStart: Date; periodEnd: Date; months: number
}) {
  const { to, name, appName, planName, periodStart, periodEnd, months } = params
  const startStr = periodStart.toLocaleDateString('fr-DZ', { day: 'numeric', month: 'long', year: 'numeric' })
  const endStr   = periodEnd.toLocaleDateString('fr-DZ',   { day: 'numeric', month: 'long', year: 'numeric' })

  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">🎁 Vous avez reçu un abonnement offert !</h1>
    <p style="margin:0 0 20px;color:#64748b;font-size:15px;">Bonjour ${name}, YelhaSubs vous offre un abonnement <strong>${appName} — ${planName}</strong> valable <strong>${months} mois</strong>.</p>
    <div style="background:#f0fdf8;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:6px 0;color:#64748b;font-size:14px;">🎁 Offert par</td><td style="padding:6px 0;font-weight:700;color:#166534;text-align:right;">YelhaSubs</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;font-size:14px;">📅 Début</td><td style="padding:6px 0;font-weight:600;font-size:14px;text-align:right;">${startStr}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;font-size:14px;">📅 Fin</td><td style="padding:6px 0;font-weight:600;font-size:14px;text-align:right;">${endStr}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;font-size:14px;">💰 Montant</td><td style="padding:6px 0;font-weight:700;color:#166534;text-align:right;">Gratuit</td></tr>
      </table>
    </div>
    <div style="text-align:center;margin:28px 0;">
      <a href="https://subs.yelha.net/dashboard" style="display:inline-block;background:#1D9E75;color:#fff;font-size:15px;font-weight:600;padding:14px 36px;border-radius:12px;text-decoration:none;">Accéder au dashboard →</a>
    </div>
    <p style="margin:0;color:#94a3b8;font-size:13px;text-align:center;">Vous recevrez un rappel avant la fin de votre abonnement. Merci de votre confiance.</p>`

  await getResend().emails.send({
    from: FROM, to,
    subject: `🎁 Abonnement ${appName} offert — ${months} mois gratuits`,
    html: wrap('fr', content),
  }).catch(() => {})
}

// ── App trial emails ───────────────────────────────────────────

export async function sendAppTrialWelcome(params: {
  to: string; name: string; appName: string; trialEndsAt: Date; appId: string
}) {
  const { to, name, appName, trialEndsAt, appId } = params
  const endStr = trialEndsAt.toLocaleDateString('fr-DZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const checkoutUrl = `https://subs.yelha.net/dashboard/settings/subscriptions`
  const upgradeUrl  = `https://subs.yelha.net/subscriptions/checkout?app=${appId}`

  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">🎁 Votre essai gratuit commence !</h1>
    <p style="margin:0 0 20px;color:#64748b;font-size:15px;">Bonjour ${name}, votre essai gratuit de <strong>${appName}</strong> est activé pour 15 jours.</p>
    <div style="background:#f0fdf8;border:1px solid #bbf7d0;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0;color:#166534;font-size:14px;font-weight:600;">📅 Expire le <strong>${endStr}</strong></p>
    </div>
    <p style="margin:0 0 20px;color:#64748b;font-size:14px;">Profitez de toutes les fonctionnalités pendant votre essai. À la fin, choisissez un plan pour continuer sans interruption.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr>
        <td style="padding:0 6px 0 0;" width="50%">
          <a href="${upgradeUrl}" style="display:block;background:#4f46e5;color:#fff;font-size:14px;font-weight:600;padding:13px 20px;border-radius:12px;text-decoration:none;text-align:center;">Voir les plans →</a>
        </td>
        <td style="padding:0 0 0 6px;" width="50%">
          <a href="${checkoutUrl}" style="display:block;background:#f8fafc;color:#0f172a;border:1px solid #e2e8f0;font-size:14px;font-weight:600;padding:13px 20px;border-radius:12px;text-decoration:none;text-align:center;">Mon abonnement →</a>
        </td>
      </tr>
    </table>`

  await getResend().emails.send({
    from: FROM, to,
    subject: `🎁 Votre essai ${appName} de 15 jours a commencé`,
    html: wrap('fr', content),
  }).catch(() => {})
}

export async function sendAppTrialReminder(params: {
  to: string; name: string; appName: string; trialEndsAt: Date; appId: string
}) {
  const { to, name, appName, trialEndsAt, appId } = params
  const endStr = trialEndsAt.toLocaleDateString('fr-DZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const upgradeUrl  = `https://subs.yelha.net/subscriptions/checkout?app=${appId}`
  const manageUrl   = `https://subs.yelha.net/dashboard/settings/subscriptions`
  const waMessage = encodeURIComponent(
    `Bonjour,\nMon essai *${appName}* expire demain (${endStr}).\n\nJe souhaite activer un abonnement payant.\n📧 Email : ${to}\n\nMerci de me contacter.`
  )
  const waUrl = `https://wa.me/33761179379?text=${waMessage}`

  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">⏰ Votre essai expire demain</h1>
    <p style="margin:0 0 20px;color:#64748b;font-size:15px;">Bonjour ${name}, votre essai gratuit de <strong>${appName}</strong> se termine le <strong>${endStr}</strong>.</p>
    <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0;color:#991b1b;font-size:14px;font-weight:600;">🚨 Activez un abonnement maintenant pour continuer à utiliser ${appName} sans interruption.</p>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
      <tr>
        <td style="padding:0 6px 12px 0;" width="50%">
          <a href="${upgradeUrl}" style="display:block;background:#4f46e5;color:#fff;font-size:14px;font-weight:600;padding:13px 16px;border-radius:12px;text-decoration:none;text-align:center;">💳 Choisir un plan</a>
        </td>
        <td style="padding:0 0 12px 6px;" width="50%">
          <a href="${waUrl}" style="display:block;background:#25D366;color:#fff;font-size:14px;font-weight:600;padding:13px 16px;border-radius:12px;text-decoration:none;text-align:center;">📱 Contacter par WhatsApp</a>
        </td>
      </tr>
    </table>
    <div style="text-align:center;margin-bottom:20px;">
      <a href="${manageUrl}" style="color:#4f46e5;font-size:13px;text-decoration:underline;">Gérer mon abonnement →</a>
    </div>`

  await getResend().emails.send({
    from: FROM, to,
    subject: `⚠️ Votre essai ${appName} expire demain`,
    html: wrap('fr', content),
  }).catch(() => {})
}

// ── App-specific subscription emails ──────────────────────────

export async function sendAppPaymentConfirmation(params: {
  to: string; name: string; appName: string; planName: string
  amount: number; periodStart: Date; periodEnd: Date
}) {
  const { to, name, appName, planName, amount, periodStart, periodEnd } = params
  const startStr = periodStart.toLocaleDateString('fr-DZ', { day: 'numeric', month: 'long', year: 'numeric' })
  const endStr   = periodEnd.toLocaleDateString('fr-DZ',   { day: 'numeric', month: 'long', year: 'numeric' })

  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Abonnement activé ✅</h1>
    <p style="margin:0 0 20px;color:#64748b;font-size:15px;">Bonjour ${name}, votre abonnement <strong>${appName} — ${planName}</strong> est maintenant actif.</p>
    <div style="background:#f0fdf8;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:6px 0;color:#64748b;font-size:14px;">💰 Montant</td><td style="padding:6px 0;font-weight:700;font-size:15px;color:#166534;text-align:right;">${amount.toLocaleString('fr-DZ')} DA / mois</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;font-size:14px;">📅 Début</td><td style="padding:6px 0;font-weight:600;font-size:14px;text-align:right;">${startStr}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b;font-size:14px;">📅 Fin</td><td style="padding:6px 0;font-weight:600;font-size:14px;text-align:right;">${endStr}</td></tr>
      </table>
    </div>
    <div style="text-align:center;margin:28px 0;">
      <a href="https://subs.yelha.net/dashboard" style="display:inline-block;background:#1D9E75;color:#fff;font-size:15px;font-weight:600;padding:14px 36px;border-radius:12px;text-decoration:none;">Accéder au dashboard →</a>
    </div>
    <p style="margin:0;color:#94a3b8;font-size:13px;text-align:center;">Merci pour votre confiance — YelhaSubs</p>`

  await getResend().emails.send({
    from: FROM, to,
    subject: `✅ Abonnement ${appName} ${planName} activé`,
    html: wrap('fr', content),
  }).catch(() => {})
}

export async function sendAppRenewalReminder(params: {
  to: string; name: string; appName: string; planName: string
  amount: number; expiresAt: Date; appId: string
}) {
  const { to, name, appName, planName, amount, expiresAt, appId } = params
  const expiryStr = expiresAt.toLocaleDateString('fr-DZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const checkoutUrl = `https://subs.yelha.net/subscriptions/checkout?app=${appId}`
  const waMessage = encodeURIComponent(
    `Bonjour,\nJe souhaite renouveler mon abonnement *${planName}* (${appName}).\n\n` +
    `💰 Montant : ${amount.toLocaleString('fr-DZ')} DA/mois\n` +
    `📧 Email : ${to}\n\n` +
    `Merci de m'envoyer les instructions de paiement.`
  )
  const waUrl = `https://wa.me/33761179379?text=${waMessage}`

  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">⏰ Votre abonnement expire dans 2 jours</h1>
    <p style="margin:0 0 20px;color:#64748b;font-size:15px;">Bonjour ${name}, votre abonnement <strong>${appName} — ${planName}</strong> expire le <strong>${expiryStr}</strong>.</p>
    <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0;color:#991b1b;font-size:14px;font-weight:600;">🚨 Renouvelez maintenant pour éviter toute interruption de service.</p>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr>
        <td style="padding:0 6px 12px 0;" width="50%">
          <a href="${checkoutUrl}" style="display:block;background:#4f46e5;color:#fff;font-size:14px;font-weight:600;padding:14px 20px;border-radius:12px;text-decoration:none;text-align:center;">💳 Payer par Chargily</a>
        </td>
        <td style="padding:0 0 12px 6px;" width="50%">
          <a href="${waUrl}" style="display:block;background:#25D366;color:#fff;font-size:14px;font-weight:600;padding:14px 20px;border-radius:12px;text-decoration:none;text-align:center;">📱 Renouveler par WhatsApp</a>
        </td>
      </tr>
    </table>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="${checkoutUrl}" style="color:#4f46e5;font-size:13px;text-decoration:underline;">Changer de plan →</a>
    </div>
    <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">Montant actuel : ${amount.toLocaleString('fr-DZ')} DA/mois</p>`

  await getResend().emails.send({
    from: FROM, to,
    subject: `⚠️ Votre abonnement ${appName} expire dans 2 jours`,
    html: wrap('fr', content),
  }).catch(() => {})
}

export async function sendYelhaRenewalReminder(params: {
  to: string; name: string; planName: string; amount: number
  billingCycle?: string; expiresAt: Date; daysLeft: number
}) {
  const { to, name, planName, amount, billingCycle, expiresAt, daysLeft } = params
  const isAnnual = billingCycle === 'ANNUAL'
  const displayAmount = isAnnual ? amount * 12 : amount
  const periodLabel = isAnnual ? 'DA/an' : 'DA/mois'
  const expiryStr = expiresAt.toLocaleDateString('fr-DZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const isUrgent = daysLeft === 1
  const billingUrl = 'https://subs.yelha.net/dashboard/settings/billing'

  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">
      ${isUrgent ? '🚨 Votre abonnement expire demain' : '⏰ Votre abonnement expire dans 3 jours'}
    </h1>
    <p style="margin:0 0 20px;color:#64748b;font-size:15px;">
      Bonjour ${name}, votre abonnement <strong>YelhaSubs ${planName}</strong> se termine le <strong>${expiryStr}</strong>.
      Renouvelez maintenant pour éviter toute interruption — vos 3 jours restants seront préservés dans la prochaine période.
    </p>
    <div style="background:${isUrgent ? '#fef2f2' : '#fff7ed'};border:1px solid ${isUrgent ? '#fca5a5' : '#fcd34d'};border-radius:12px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0;color:${isUrgent ? '#991b1b' : '#92400e'};font-size:14px;font-weight:600;">
        ${isUrgent ? '🚨' : '⏳'} Il vous reste <strong>${daysLeft} jour${daysLeft > 1 ? 's' : ''}</strong> — Montant : <strong>${displayAmount.toLocaleString('fr-DZ')} ${periodLabel}</strong>
      </p>
    </div>

    <p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#0f172a;">Choisissez votre méthode de paiement :</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:0 6px 0 0;" width="50%">
          <a href="${billingUrl}?method=chargily" style="display:block;background:#1D9E75;color:#fff;font-size:14px;font-weight:600;padding:14px 16px;border-radius:12px;text-decoration:none;text-align:center;">💳 Payer par Chargily<br><span style="font-size:12px;font-weight:400;opacity:.85;">Edahabia / CIB — immédiat</span></a>
        </td>
        <td style="padding:0 0 0 6px;" width="50%">
          <a href="${billingUrl}?method=ccp" style="display:block;background:#1e40af;color:#fff;font-size:14px;font-weight:600;padding:14px 16px;border-radius:12px;text-decoration:none;text-align:center;">🏦 Payer par CCP<br><span style="font-size:12px;font-weight:400;opacity:.85;">Virement postal — 24–48h</span></a>
        </td>
      </tr>
    </table>

    <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:16px;">
      <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#0f172a;">Instructions CCP :</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:4px 0;color:#64748b;font-size:13px;">Compte CCP</td><td style="padding:4px 0;font-weight:600;font-size:13px;text-align:right;font-family:monospace;">00799999004399346548</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;font-size:13px;">Titulaire</td><td style="padding:4px 0;font-weight:600;font-size:13px;text-align:right;">Yelha Technologies</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;font-size:13px;">Montant</td><td style="padding:4px 0;font-weight:700;font-size:14px;color:#1D9E75;text-align:right;">${displayAmount.toLocaleString('fr-DZ')} ${periodLabel}</td></tr>
      </table>
      <p style="margin:10px 0 0;color:#92400e;font-size:12px;">Envoyez votre reçu sur WhatsApp au <strong>+33 7 61 17 93 79</strong> ou à <a href="mailto:cvkdev@outlook.fr" style="color:#1D9E75;">cvkdev@outlook.fr</a> — activation sous 24h.</p>
    </div>
    <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">Vous pouvez aussi renouveler depuis votre <a href="${billingUrl}" style="color:#1D9E75;">espace facturation</a>.</p>`

  await getResend().emails.send({
    from: FROM, to,
    subject: isUrgent
      ? `🚨 Votre abonnement YelhaSubs ${planName} expire demain`
      : `⏰ Votre abonnement YelhaSubs ${planName} expire dans 3 jours`,
    html: wrap('fr', content),
  }).catch(() => {})
}

export async function sendYelhaSubscriptionActivated(params: {
  to: string
  name: string
  planName: string
  periodEnd: Date
  amount: number
  isFree?: boolean
}) {
  const { to, name, planName, periodEnd, amount, isFree } = params
  const endStr = periodEnd.toLocaleDateString('fr-DZ', { day: 'numeric', month: 'long', year: 'numeric' })

  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">${isFree ? '🎁 Abonnement offert !' : '✅ Abonnement activé !'}</h1>
    <p style="margin:0 0 24px;color:#64748b;font-size:15px;">
      Bonjour <strong>${name}</strong>,<br>
      votre abonnement YelhaSubs <strong>Plan ${planName}</strong> est maintenant actif.
    </p>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:13px;color:#64748b;padding:4px 0;">Plan</td>
          <td style="font-size:13px;font-weight:700;color:#0f172a;text-align:right;padding:4px 0;">${planName}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#64748b;padding:4px 0;">Valide jusqu'au</td>
          <td style="font-size:13px;font-weight:700;color:#0f172a;text-align:right;padding:4px 0;">${endStr}</td>
        </tr>
        <tr>
          <td style="font-size:13px;color:#64748b;padding:4px 0;">Montant</td>
          <td style="font-size:13px;font-weight:700;color:${isFree ? '#1D9E75' : '#0f172a'};text-align:right;padding:4px 0;">${isFree ? 'Offert' : `${amount.toLocaleString('fr-DZ')} DA`}</td>
        </tr>
      </table>
    </div>

    <div style="text-align:center;margin:28px 0;">
      <a href="https://subs.yelha.net/dashboard" style="display:inline-block;background:#1D9E75;color:#fff;font-size:15px;font-weight:600;padding:14px 36px;border-radius:12px;text-decoration:none;">
        Accéder à mon dashboard →
      </a>
    </div>

    <p style="color:#94a3b8;font-size:13px;text-align:center;">
      Une question ? <a href="mailto:cvkdev@outlook.fr" style="color:#1D9E75;">cvkdev@outlook.fr</a>
    </p>`

  await getResend().emails.send({
    from: FROM,
    to,
    subject: `${isFree ? '🎁 Abonnement offert' : '✅ Abonnement activé'} — Plan ${planName}`,
    html: wrap('fr', content),
  }).catch(() => {})
}

export async function sendPasswordReset({ to, name, resetUrl }: { to: string; name: string; resetUrl: string }) {
  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Réinitialisation de mot de passe 🔐</h1>
    <p style="margin:0 0 20px;color:#64748b;font-size:15px;">Bonjour <strong>${name}</strong>, vous avez demandé la réinitialisation de votre mot de passe YelhaSubs.</p>
    <div style="text-align:center;margin:28px 0;">
      <a href="${resetUrl}" style="display:inline-block;background:#1D9E75;color:#fff;font-size:15px;font-weight:600;padding:14px 36px;border-radius:12px;text-decoration:none;">
        Réinitialiser mon mot de passe →
      </a>
    </div>
    <p style="color:#64748b;font-size:13px;text-align:center;">Ce lien expire dans <strong>1 heure</strong>. Si vous n'avez pas fait cette demande, ignorez cet email — votre mot de passe reste inchangé.</p>
    <div style="margin-top:24px;padding:16px;background:#fef3c7;border:1px solid #fde68a;border-radius:10px;">
      <p style="margin:0;font-size:12px;color:#92400e;">⚠️ Ne partagez jamais ce lien. L'équipe YelhaSubs ne vous demandera jamais votre mot de passe.</p>
    </div>`
  await getResend().emails.send({
    from: FROM,
    to,
    subject: 'Réinitialisation de votre mot de passe — YelhaSubs',
    html: wrap('fr', content),
  }).catch(() => {})
}

export async function sendPaymentFailed({ to, name, planName }: { to: string; name: string; planName: string }) {
  const content = `
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;">Problème de paiement ⚠️</h1>
    <p style="margin:0 0 20px;color:#64748b;font-size:15px;">Bonjour ${name}, votre paiement pour le plan <strong>${planName}</strong> n'a pas pu être traité.</p>
    <div style="margin-bottom:24px;">
      <a href="https://subs.yelha.net/subscriptions/checkout" style="display:inline-block;background:#1D9E75;color:#fff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:10px;text-decoration:none;margin-right:8px;">Réessayer →</a>
      <a href="https://subs.yelha.net/subscriptions/checkout?method=ccp" style="display:inline-block;background:#f8fafc;color:#0f172a;border:1px solid #e2e8f0;font-size:14px;padding:12px 24px;border-radius:10px;text-decoration:none;">Payer par CCP →</a>
    </div>
    <p style="color:#94a3b8;font-size:13px;">Aide : <a href="mailto:cvkdev@outlook.fr" style="color:#1D9E75;">cvkdev@outlook.fr</a></p>`
  await getResend().emails.send({ from: FROM, to, subject: 'Problème de paiement — Action requise', html: wrap('fr', content) }).catch(() => {})
}
