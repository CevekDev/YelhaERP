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
      subject: '🎉 Bienvenue chez {{companyName}}',
      body: `Bonjour {{clientName}},

Nous sommes ravis de vous compter parmi nos abonnés ! Votre abonnement au plan **{{planName}}** est désormais actif.

Nous restons à votre disposition pour toute question. Bienvenue à bord ! 🚀`,
    },
    en: {
      subject: '🎉 Welcome to {{companyName}}',
      body: `Hello {{clientName}},

We're thrilled to have you on board! Your subscription to the **{{planName}}** plan is now active.

We're here to help with any questions you may have. Welcome aboard! 🚀`,
    },
    ar: {
      subject: '🎉 مرحباً بك في {{companyName}}',
      body: `مرحباً {{clientName}}،

يسعدنا انضمامك إلينا! اشتراكك في خطة **{{planName}}** مفعّل الآن.

نحن في خدمتك لأي استفسار. أهلاً بك! 🚀`,
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
