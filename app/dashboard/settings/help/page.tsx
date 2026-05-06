'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { CheckCircle, Lightbulb, BookOpen } from 'lucide-react'
import { MODULE_HELP, type ModuleHelpContent } from '@/lib/help/modules-help'

type Lang = 'fr' | 'ar' | 'en'

const MODULE_KEYS = Object.keys(MODULE_HELP)

const QUICK_START: Record<Lang, { title: string; steps: string[]; contact: string }> = {
  fr: {
    title: 'Démarrage rapide',
    steps: [
      'Créez votre compte sur erp.yelha.net',
      "Configurez votre entreprise dans Paramètres → Profil de l'entreprise",
      'Activez vos modules dans Paramètres → Modules',
      'Ajoutez vos clients et produits',
      'Créez votre première facture',
    ],
    contact: 'Support : cvkdev@outlook.fr',
  },
  ar: {
    title: 'البدء السريع',
    steps: [
      'أنشئ حسابك على erp.yelha.net',
      'اضبط بيانات شركتك في الإعدادات → ملف الشركة',
      'فعّل الوحدات في الإعدادات → الوحدات',
      'أضف عملاءك ومنتجاتك',
      'أنشئ أول فاتورة لك',
    ],
    contact: 'الدعم: cvkdev@outlook.fr',
  },
  en: {
    title: 'Quick Start',
    steps: [
      'Create your account on erp.yelha.net',
      'Configure your company in Settings → Company Profile',
      'Enable your modules in Settings → Modules',
      'Add your clients and products',
      'Create your first invoice',
    ],
    contact: 'Support: cvkdev@outlook.fr',
  },
}

const FAQ: Record<Lang, { q: string; a: string }[]> = {
  fr: [
    { q: 'Comment changer mon mot de passe ?', a: 'Allez dans Paramètres → Profil → section Mot de passe, saisissez votre mot de passe actuel et le nouveau.' },
    { q: 'Comment ajouter un collaborateur ?', a: 'Allez dans Paramètres → Collaborateurs & accès → cliquez sur "Inviter". Renseignez l\'email et le rôle.' },
    { q: 'Comment générer un G50 ?', a: 'Activez le module Fiscalité dans Paramètres → Modules, puis allez dans Comptabilité → G50. Le formulaire est pré-rempli automatiquement.' },
    { q: 'Comment configurer Chargily Pay ?', a: 'Allez dans Paramètres → Intégrations → Chargily, puis saisissez votre clé publique et votre clé secrète.' },
    { q: 'Comment importer mes clients depuis Excel ?', a: 'Dans le module Clients, cliquez sur "Importer CSV". Téléchargez le modèle, remplissez-le avec vos données et importez.' },
    { q: 'Comment sauvegarder mes données ?', a: 'Allez dans Paramètres → Export des données pour télécharger une archive complète de vos données.' },
    { q: 'Quelle est la différence entre les plans ?', a: 'Consultez la page Tarifs sur notre site. Chaque plan débloque des modules supplémentaires et augmente les limites d\'utilisation.' },
    { q: 'Comment annuler mon abonnement YelhaERP ?', a: 'Contactez-nous à cvkdev@outlook.fr avec votre email de compte et la demande d\'annulation.' },
  ],
  ar: [
    { q: 'كيف أغير كلمة المرور؟', a: 'اذهب إلى الإعدادات → الملف الشخصي → قسم كلمة المرور، أدخل كلمتك الحالية والجديدة.' },
    { q: 'كيف أضيف متعاوناً؟', a: 'اذهب إلى الإعدادات → المتعاونون والصلاحيات → اضغط "دعوة". أدخل البريد الإلكتروني والدور.' },
    { q: 'كيف أنشئ G50؟', a: 'فعّل وحدة الجباية في الإعدادات → الوحدات، ثم اذهب إلى المحاسبة → G50. يُملأ النموذج تلقائياً.' },
    { q: 'كيف أضبط Chargily Pay؟', a: 'اذهب إلى الإعدادات → التكاملات → Chargily، وأدخل مفتاحك العام والسري.' },
    { q: 'كيف أستورد عملائي من Excel؟', a: 'في وحدة العملاء، اضغط "استيراد CSV". حمّل النموذج، أملأه ببياناتك ثم استورده.' },
    { q: 'كيف أحفظ نسخة احتياطية من بياناتي؟', a: 'اذهب إلى الإعدادات → تصدير البيانات لتنزيل أرشيف كامل.' },
    { q: 'ما الفرق بين الخطط؟', a: 'راجع صفحة الأسعار على موقعنا. كل خطة تفتح وحدات إضافية وترفع حدود الاستخدام.' },
    { q: 'كيف ألغي اشتراكي في YelhaERP؟', a: 'تواصل معنا على cvkdev@outlook.fr مع بريدك الإلكتروني وطلب الإلغاء.' },
  ],
  en: [
    { q: 'How do I change my password?', a: 'Go to Settings → Profile → Password section, enter your current password and the new one.' },
    { q: 'How do I add a team member?', a: 'Go to Settings → Team & Access → click "Invite". Enter the email and role.' },
    { q: 'How do I generate a G50?', a: 'Enable the Tax module in Settings → Modules, then go to Accounting → G50. The form is auto-filled.' },
    { q: 'How do I set up Chargily Pay?', a: 'Go to Settings → Integrations → Chargily, then enter your public key and secret key.' },
    { q: 'How do I import clients from Excel?', a: 'In the Clients module, click "Import CSV". Download the template, fill it with your data and import.' },
    { q: 'How do I back up my data?', a: 'Go to Settings → Export Data to download a full archive of your data.' },
    { q: 'What is the difference between plans?', a: 'See the Pricing page on our website. Each plan unlocks additional modules and increases usage limits.' },
    { q: 'How do I cancel my YelhaERP subscription?', a: 'Contact us at cvkdev@outlook.fr with your account email and the cancellation request.' },
  ],
}

const SECTION_LABELS: Record<Lang, { features: string; tips: string; faq: string; quickstart: string; modules: string }> = {
  fr: { features: 'Fonctionnalités', tips: 'Conseils', faq: 'FAQ', quickstart: 'Démarrage rapide', modules: 'Modules' },
  ar: { features: 'المميزات', tips: 'نصائح', faq: 'الأسئلة الشائعة', quickstart: 'البدء السريع', modules: 'الوحدات' },
  en: { features: 'Features', tips: 'Tips', faq: 'FAQ', quickstart: 'Quick Start', modules: 'Modules' },
}

function ModuleSection({ help, labels }: { help: ModuleHelpContent; labels: typeof SECTION_LABELS['fr'] }) {
  return (
    <div className="space-y-3">
      <p className="text-slate-600 text-sm">{help.description}</p>
      {help.features.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4 text-emerald-500" /> {labels.features}
          </h4>
          <ul className="space-y-1">
            {help.features.map((f, i) => (
              <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5 flex-shrink-0">•</span> {f}
              </li>
            ))}
          </ul>
        </div>
      )}
      {help.tips.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
          <h4 className="text-sm font-semibold text-amber-800 mb-1.5 flex items-center gap-1.5">
            <Lightbulb className="h-4 w-4" /> {labels.tips}
          </h4>
          <ul className="space-y-1">
            {help.tips.map((tip, i) => (
              <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                <span className="mt-0.5 flex-shrink-0">💡</span> {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default function HelpPage() {
  const [lang, setLang] = useState<Lang>('fr')
  const [activeModule, setActiveModule] = useState<string>('quickstart')
  const labels = SECTION_LABELS[lang]
  const qs = QUICK_START[lang]
  const faq = FAQ[lang]

  return (
    <div className="flex flex-col h-full">
      <Header title="Manuel d'utilisation" />

      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-4 md:px-6 py-4 border-b bg-background">
          <Tabs value={lang} onValueChange={(v) => setLang(v as Lang)}>
            <TabsList>
              <TabsTrigger value="fr">🇫🇷 Français</TabsTrigger>
              <TabsTrigger value="ar">🇩🇿 العربية</TabsTrigger>
              <TabsTrigger value="en">🇬🇧 English</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <aside className="w-56 border-r bg-slate-50 overflow-y-auto flex-shrink-0 hidden md:block">
            <nav className="p-3 space-y-0.5">
              <button
                onClick={() => setActiveModule('quickstart')}
                className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${activeModule === 'quickstart' ? 'bg-emerald-100 text-emerald-800 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                🚀 {labels.quickstart}
              </button>
              <div className="pt-2 pb-1 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">{labels.modules}</div>
              {MODULE_KEYS.map((key) => {
                const moduleHelp = MODULE_HELP[key]?.[lang] ?? MODULE_HELP[key]?.fr
                return (
                  <button
                    key={key}
                    onClick={() => setActiveModule(key)}
                    className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${activeModule === key ? 'bg-emerald-100 text-emerald-800 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    {moduleHelp?.title ?? key}
                  </button>
                )
              })}
              <div className="pt-2 pb-1 px-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">FAQ</div>
              <button
                onClick={() => setActiveModule('faq')}
                className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${activeModule === 'faq' ? 'bg-emerald-100 text-emerald-800 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {labels.faq}
              </button>
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 overflow-y-auto p-6">
            {activeModule === 'quickstart' && (
              <div className="max-w-2xl space-y-6">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-xl font-bold text-slate-900">{qs.title}</h2>
                </div>
                <ol className="space-y-3">
                  {qs.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-slate-700 text-sm">{step}</span>
                    </li>
                  ))}
                </ol>
                <div className="mt-6 p-4 bg-slate-50 rounded-xl border">
                  <p className="text-sm text-slate-600">{qs.contact}</p>
                  <a href="mailto:cvkdev@outlook.fr" className="text-sm text-emerald-600 hover:underline">
                    cvkdev@outlook.fr
                  </a>
                </div>
              </div>
            )}

            {activeModule === 'faq' && (
              <div className="max-w-2xl space-y-4">
                <h2 className="text-xl font-bold text-slate-900 mb-4">{labels.faq}</h2>
                {faq.map((item, i) => (
                  <div key={i} className="border rounded-xl p-4 space-y-2">
                    <p className="text-sm font-semibold text-slate-800">{item.q}</p>
                    <p className="text-sm text-slate-600">{item.a}</p>
                  </div>
                ))}
              </div>
            )}

            {MODULE_KEYS.includes(activeModule) && (() => {
              const help = MODULE_HELP[activeModule]?.[lang] ?? MODULE_HELP[activeModule]?.fr
              if (!help) return null
              return (
                <div className="max-w-2xl">
                  <h2 className="text-xl font-bold text-slate-900 mb-4">{help.title}</h2>
                  <ModuleSection help={help} labels={labels} />
                </div>
              )
            })()}
          </main>
        </div>
      </div>
    </div>
  )
}
