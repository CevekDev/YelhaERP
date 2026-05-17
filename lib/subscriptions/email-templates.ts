export type EmailLang = 'fr' | 'en' | 'ar'
export type EmailType = 'renewal' | 'trialEnd' | 'welcome'

export interface EmailTemplate {
  subject: string
  body: string
}

export const EMAIL_LANGS: { code: EmailLang; label: string; flag: string }[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English',  flag: '🇬🇧' },
  { code: 'ar', label: 'العربية',  flag: '🇩🇿' },
]

export const PLACEHOLDERS = ['clientName', 'planName', 'companyName', 'amount', 'expiresAt'] as const

export const DEFAULT_TEMPLATES: Record<EmailType, Record<EmailLang, EmailTemplate>> = {
  renewal: {
    fr: {
      subject: '⚠️ Votre abonnement {{planName}} expire demain',
      body: `Bonjour {{clientName}},

Votre abonnement **{{planName}}** chez {{companyName}} expire demain ({{expiresAt}}).

Montant à régler : **{{amount}}**.

Merci de renouveler votre abonnement en utilisant l'un des moyens de paiement ci-dessous pour continuer à profiter de nos services sans interruption.`,
    },
    en: {
      subject: '⚠️ Your {{planName}} subscription expires tomorrow',
      body: `Hello {{clientName}},

Your **{{planName}}** subscription with {{companyName}} expires tomorrow ({{expiresAt}}).

Amount due: **{{amount}}**.

Please renew your subscription using one of the payment methods below to continue enjoying our services without interruption.`,
    },
    ar: {
      subject: '⚠️ اشتراكك {{planName}} ينتهي غداً',
      body: `مرحباً {{clientName}}،

ينتهي اشتراكك **{{planName}}** لدى {{companyName}} غداً ({{expiresAt}}).

المبلغ المستحق: **{{amount}}**.

يرجى تجديد اشتراكك باستخدام إحدى وسائل الدفع أدناه للاستمرار في الاستفادة من خدماتنا دون انقطاع.`,
    },
  },
  trialEnd: {
    fr: {
      subject: '🎁 Votre essai gratuit {{planName}} se termine demain',
      body: `Bonjour {{clientName}},

Votre essai gratuit du plan **{{planName}}** chez {{companyName}} prend fin demain ({{expiresAt}}).

Pour continuer à profiter de nos services, abonnez-vous maintenant pour seulement **{{amount}}**.

Utilisez l'un des moyens de paiement ci-dessous pour activer votre abonnement.`,
    },
    en: {
      subject: '🎁 Your {{planName}} free trial ends tomorrow',
      body: `Hello {{clientName}},

Your free trial of the **{{planName}}** plan with {{companyName}} ends tomorrow ({{expiresAt}}).

To continue enjoying our services, subscribe now for only **{{amount}}**.

Use one of the payment methods below to activate your subscription.`,
    },
    ar: {
      subject: '🎁 تجربتك المجانية {{planName}} تنتهي غداً',
      body: `مرحباً {{clientName}}،

تنتهي تجربتك المجانية لخطة **{{planName}}** لدى {{companyName}} غداً ({{expiresAt}}).

للاستمرار في الاستفادة من خدماتنا، اشترك الآن بـ **{{amount}}** فقط.

استخدم إحدى وسائل الدفع أدناه لتفعيل اشتراكك.`,
    },
  },
  welcome: {
    fr: {
      subject: '💳 Activez votre abonnement {{planName}} chez {{companyName}}',
      body: `Bonjour {{clientName}},

Merci de votre intérêt pour nos services ! Votre abonnement au plan **{{planName}}** a bien été créé.

Montant à régler : **{{amount}}**.

Pour activer votre abonnement, veuillez effectuer le paiement en utilisant l'un des moyens ci-dessous. Votre accès sera activé dès confirmation du règlement.`,
    },
    en: {
      subject: '💳 Activate your {{planName}} subscription at {{companyName}}',
      body: `Hello {{clientName}},

Thank you for your interest in our services! Your subscription to the **{{planName}}** plan has been created.

Amount due: **{{amount}}**.

To activate your subscription, please complete the payment using one of the methods below. Your access will be activated once payment is confirmed.`,
    },
    ar: {
      subject: '💳 فعّل اشتراكك {{planName}} في {{companyName}}',
      body: `مرحباً {{clientName}}،

شكراً لاهتمامك بخدماتنا! تم إنشاء اشتراكك في خطة **{{planName}}**.

المبلغ المستحق: **{{amount}}**.

لتفعيل اشتراكك، يرجى إتمام الدفع باستخدام إحدى الطرق أدناه. سيتم تفعيل وصولك فور تأكيد الدفع.`,
    },
  },
}

export interface TemplatesByLang {
  renewal?:  Partial<Record<EmailLang, Partial<EmailTemplate>>>
  trialEnd?: Partial<Record<EmailLang, Partial<EmailTemplate>>>
  welcome?:  Partial<Record<EmailLang, Partial<EmailTemplate>>>
}

export function getTemplate(
  custom: TemplatesByLang | null | undefined,
  type: EmailType,
  lang: EmailLang
): EmailTemplate {
  const def = DEFAULT_TEMPLATES[type][lang]
  const overrides = custom?.[type]?.[lang]
  return {
    subject: overrides?.subject?.trim() || def.subject,
    body:    overrides?.body?.trim()    || def.body,
  }
}
