'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, TrendingUp, Building2, Layers, Globe, CheckCircle } from 'lucide-react'
import { WILAYAS_LIST } from '@/lib/algerian/format'

const LEGAL_FORMS = [
  { value: 'SARL',  label: 'SARL — Société à Responsabilité Limitée' },
  { value: 'EURL',  label: 'EURL — Entreprise Unipersonnelle à Responsabilité Limitée' },
  { value: 'SPA',   label: 'SPA — Société par Actions' },
  { value: 'SNC',   label: 'SNC — Société en Nom Collectif' },
  { value: 'EI',    label: 'EI — Établissement Individuel' },
  { value: 'AE',    label: 'Auto-entrepreneur' },
  { value: 'NONE',  label: 'Sans RC / Informel' },
]

const ALWAYS_ON_MODULES = [
  { key: 'invoices',  label: 'Facturation' },
  { key: 'clients',   label: 'Clients' },
  { key: 'stock',     label: 'Stock' },
  { key: 'expenses',  label: 'Dépenses' },
]

const OPTIONAL_MODULES = [
  { key: 'crm',           label: 'CRM',                   desc: 'Pipeline commercial et leads' },
  { key: 'quotes',        label: 'Devis',                  desc: 'Propositions commerciales' },
  { key: 'suppliers',     label: 'Fournisseurs',           desc: 'Gestion des fournisseurs' },
  { key: 'purchases',     label: 'Achats',                 desc: 'Bons de commande' },
  { key: 'accounting',    label: 'Comptabilité',           desc: 'Journal SCF' },
  { key: 'hr',            label: 'RH',                     desc: 'Employés et congés' },
  { key: 'payroll',       label: 'Paie',                   desc: 'Bulletins de paie IRG/CNAS', requiresHr: true },
  { key: 'projects',      label: 'Projets',                desc: 'Gestion de projets' },
  { key: 'production',    label: 'Production',             desc: 'Ordres de fabrication' },
  { key: 'pos',           label: 'Caisse POS',             desc: 'Point de vente physique' },
  { key: 'ecommerce',     label: 'E-commerce',             desc: 'Shopify / WooCommerce' },
  { key: 'restaurant',    label: 'Restaurant',             desc: 'Tables, commandes, KDS' },
  { key: 'subscriptions', label: 'Abonnements clients',    desc: 'Abonnements récurrents' },
  { key: 'tax',           label: 'Fiscalité G50',          desc: 'Déclarations mensuelles', disabledIfNoRc: true },
]

type SelectedModules = {
  crm: boolean; quotes: boolean; suppliers: boolean; purchases: boolean;
  accounting: boolean; hr: boolean; payroll: boolean; projects: boolean;
  production: boolean; pos: boolean; ecommerce: boolean; restaurant: boolean;
  subscriptions: boolean; tax: boolean;
}

export default function OnboardingPage() {
  const router = useRouter()
  const { data: session, update } = useSession()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [nifError, setNifError] = useState('')

  const [form, setForm] = useState({
    companyName: '',
    legalForm: '',
    aeCardNumber: '',
    nif: '',
    nis: '',
    phone: '',
    email: '',
    address: '',
    wilaya: '',
  })

  const [selectedModules, setSelectedModules] = useState<SelectedModules>({
    crm: true, quotes: true, suppliers: true, purchases: true,
    accounting: false, hr: false, payroll: false, projects: false,
    production: false, pos: false, ecommerce: false, restaurant: false,
    subscriptions: false, tax: false,
  })

  const [locale, setLocale] = useState<'fr' | 'ar' | 'en'>('fr')

  useEffect(() => {
    if (session?.user) {
      setForm(f => ({
        ...f,
        email: session.user.email ?? '',
        companyName: session.user.companyName ?? '',
      }))
    }
  }, [session])

  const set = (key: string, value: string) => {
    setForm(f => ({ ...f, [key]: value }))
    if (key === 'nif') {
      if (value && !/^\d{15}$/.test(value)) {
        setNifError('Le NIF doit contenir exactement 15 chiffres')
      } else {
        setNifError('')
      }
    }
  }

  const toggleModule = (key: keyof SelectedModules, checked: boolean) => {
    setSelectedModules(prev => {
      const next = { ...prev, [key]: checked }
      // Si payroll coché, cocher hr automatiquement
      if (key === 'payroll' && checked) {
        next.hr = true
      }
      return next
    })
  }

  const isAE = form.legalForm === 'AE'
  const isNoRc = form.legalForm === 'NONE' || form.legalForm === 'AE'

  const validateStep1 = () => {
    if (!form.legalForm) { toast.error('Veuillez choisir une forme juridique'); return false }
    if (form.nif && !/^\d{15}$/.test(form.nif)) { toast.error('Le NIF doit contenir exactement 15 chiffres'); return false }
    return true
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/company/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessType: form.legalForm === 'AE' ? 'AE' : form.legalForm === 'NONE' ? 'NONE' : 'RC',
          legalForm: form.legalForm,
          aeCardNumber: form.aeCardNumber,
          nif: form.nif,
          nis: form.nis,
          phone: form.phone,
          email: form.email,
          address: form.address,
          wilaya: form.wilaya,
          name: form.companyName,
        }),
      })
      if (!res.ok) { toast.error("Erreur lors de l'enregistrement"); setLoading(false); return }

      const modulesPayload: Record<string, boolean> = {
        // always on
        invoices: true, clients: true, stock: true, expenses: true,
        // tax disabled for NONE/AE legalForm
        ...selectedModules,
        tax: isNoRc ? false : selectedModules.tax,
      }

      await fetch('/api/settings/modules', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modulesPayload),
      })

      if (typeof window !== 'undefined') {
        localStorage.setItem('yelha-locale', locale)
      }

      await update()
      toast.success('Bienvenue sur YelhaERP ! 🎉')
      router.push('/dashboard')
    } catch {
      toast.error('Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  const STEPS = [
    { num: 1, label: 'Société',  icon: Building2 },
    { num: 2, label: 'Modules',  icon: Layers },
    { num: 3, label: 'Langue',   icon: Globe },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-yelha-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-yelha-500 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-yelha-700">YelhaERP</span>
        </div>

        {/* Progress steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, idx) => {
            const Icon = s.icon
            const isActive = step === s.num
            const isDone = step > s.num
            return (
              <div key={s.num} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  isDone
                    ? 'bg-yelha-500 text-white'
                    : isActive
                    ? 'bg-yelha-100 text-yelha-700 ring-2 ring-yelha-400'
                    : 'bg-slate-100 text-slate-400'
                }`}>
                  {isDone ? <CheckCircle className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  {s.label}
                </div>
                {idx < STEPS.length - 1 && (
                  <div className={`w-8 h-0.5 ${step > s.num ? 'bg-yelha-400' : 'bg-slate-200'}`} />
                )}
              </div>
            )
          })}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">

          {/* ── ÉTAPE 1 — Informations société ── */}
          {step === 1 && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-yelha-100 rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-yelha-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Configurez votre entreprise</h2>
                  <p className="text-slate-500 text-sm">Ces informations apparaîtront sur vos factures</p>
                </div>
              </div>

              <div className="space-y-5">
                {/* Nom entreprise */}
                <div className="space-y-2">
                  <Label>Nom de l&apos;entreprise</Label>
                  <Input value={form.companyName} onChange={e => set('companyName', e.target.value)} placeholder="SARL MonEntreprise" />
                </div>

                {/* Forme juridique */}
                <div className="space-y-2">
                  <Label>Forme juridique <span className="text-red-500">*</span></Label>
                  <Select value={form.legalForm} onValueChange={v => set('legalForm', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez votre forme juridique..." />
                    </SelectTrigger>
                    <SelectContent>
                      {LEGAL_FORMS.map(f => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Encadré info sans RC */}
                {isNoRc && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                    <span className="text-amber-500 text-lg">ℹ️</span>
                    <p className="text-amber-800 text-sm leading-relaxed">
                      <strong>Sans RC</strong> — le module <strong>Fiscalité (G50)</strong> sera désactivé par défaut.
                      Vous pourrez l&apos;activer ultérieurement dans Paramètres → Modules si votre situation évolue.
                    </p>
                  </div>
                )}

                {/* Numéro carte AE */}
                {isAE && (
                  <div className="space-y-2">
                    <Label>Numéro de carte Auto-entrepreneur</Label>
                    <Input value={form.aeCardNumber} onChange={e => set('aeCardNumber', e.target.value)} placeholder="AE-00-000000" />
                  </div>
                )}

                {/* NIF / NIS — masqué si NONE */}
                {form.legalForm && form.legalForm !== 'NONE' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>NIF</Label>
                      <Input
                        value={form.nif}
                        onChange={e => set('nif', e.target.value)}
                        placeholder="000000000000000"
                        className={nifError ? 'border-red-400 focus-visible:ring-red-400' : ''}
                      />
                      {nifError && <p className="text-red-500 text-xs">{nifError}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>NIS</Label>
                      <Input value={form.nis} onChange={e => set('nis', e.target.value)} placeholder="000000000000000" />
                    </div>
                  </div>
                )}

                {/* Téléphone / Email */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Téléphone</Label>
                    <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="0555 123 456" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
                  </div>
                </div>

                {/* Adresse */}
                <div className="space-y-2">
                  <Label>Adresse</Label>
                  <Input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Rue, quartier, ville..." />
                </div>

                {/* Wilaya */}
                <div className="space-y-2">
                  <Label>Wilaya</Label>
                  <Select value={form.wilaya} onValueChange={v => set('wilaya', v)}>
                    <SelectTrigger><SelectValue placeholder="Choisir une wilaya..." /></SelectTrigger>
                    <SelectContent>
                      {WILAYAS_LIST.map(w => (
                        <SelectItem key={w.code} value={w.name}>{w.code} — {w.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="w-full h-12 text-base"
                  onClick={() => { if (validateStep1()) setStep(2) }}
                  disabled={!form.legalForm || !!nifError}
                >
                  Suivant →
                </Button>
              </div>
            </>
          )}

          {/* ── ÉTAPE 2 — Modules ── */}
          {step === 2 && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-yelha-100 rounded-xl flex items-center justify-center">
                  <Layers className="w-5 h-5 text-yelha-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Quels modules voulez-vous utiliser ?</h2>
                  <p className="text-slate-500 text-sm">Vous pourrez les modifier à tout moment dans Paramètres → Modules</p>
                </div>
              </div>

              {/* Modules toujours actifs */}
              <div className="mb-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Inclus par défaut</p>
                <div className="grid grid-cols-2 gap-2">
                  {ALWAYS_ON_MODULES.map(m => (
                    <div key={m.key} className="flex items-center gap-3 bg-yelha-50 border border-yelha-100 rounded-xl px-4 py-3 opacity-75">
                      <CheckCircle className="w-4 h-4 text-yelha-500 flex-shrink-0" />
                      <span className="text-sm font-medium text-slate-700">{m.label}</span>
                      <Badge variant="secondary" className="ml-auto text-xs bg-yelha-100 text-yelha-700 border-0">Inclus</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modules optionnels */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Modules optionnels</p>
                <div className="grid grid-cols-2 gap-2">
                  {OPTIONAL_MODULES.map(m => {
                    const key = m.key as keyof SelectedModules
                    const isDisabled = m.disabledIfNoRc && isNoRc
                    const isChecked = selectedModules[key]
                    return (
                      <label
                        key={m.key}
                        className={`flex items-start gap-3 rounded-xl px-4 py-3 border transition-colors cursor-pointer ${
                          isDisabled
                            ? 'bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed'
                            : isChecked
                            ? 'bg-yelha-50 border-yelha-200'
                            : 'bg-white border-slate-200 hover:border-yelha-200'
                        }`}
                      >
                        <Checkbox
                          checked={isChecked}
                          disabled={isDisabled}
                          onCheckedChange={(checked: boolean | 'indeterminate') => toggleModule(key, checked === true)}
                          className="mt-0.5"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-800 leading-tight">{m.label}</p>
                          <p className="text-xs text-slate-500 leading-tight mt-0.5">{m.desc}</p>
                          {m.requiresHr && (
                            <p className="text-xs text-amber-600 mt-0.5">Nécessite RH</p>
                          )}
                          {isDisabled && (
                            <p className="text-xs text-slate-400 mt-0.5">Non disponible sans RC</p>
                          )}
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="outline" className="flex-1 h-12" onClick={() => setStep(1)}>← Retour</Button>
                <Button className="flex-1 h-12" onClick={() => setStep(3)}>Suivant →</Button>
              </div>
            </>
          )}

          {/* ── ÉTAPE 3 — Langue ── */}
          {step === 3 && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-yelha-100 rounded-xl flex items-center justify-center">
                  <Globe className="w-5 h-5 text-yelha-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Quelle langue préférez-vous ?</h2>
                  <p className="text-slate-500 text-sm">Vous pourrez la changer dans Paramètres → Profil</p>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {[
                  { value: 'fr', flag: '🇫🇷', label: 'Français', sub: 'Interface en français' },
                  { value: 'ar', flag: '🇩🇿', label: 'العربية',  sub: 'واجهة باللغة العربية' },
                  { value: 'en', flag: '🇬🇧', label: 'English',  sub: 'Interface in English' },
                ].map(opt => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-4 rounded-xl px-5 py-4 border-2 cursor-pointer transition-all ${
                      locale === opt.value
                        ? 'bg-yelha-50 border-yelha-400'
                        : 'bg-white border-slate-200 hover:border-yelha-200'
                    }`}
                  >
                    <input
                      type="radio"
                      name="locale"
                      value={opt.value}
                      checked={locale === opt.value}
                      onChange={() => setLocale(opt.value as 'fr' | 'ar' | 'en')}
                      className="h-4 w-4 accent-yelha-600"
                    />
                    <span className="text-2xl">{opt.flag}</span>
                    <div>
                      <p className="font-semibold text-slate-900">{opt.label}</p>
                      <p className="text-sm text-slate-500">{opt.sub}</p>
                    </div>
                  </label>
                ))}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 h-12" onClick={() => setStep(2)}>← Retour</Button>
                <Button className="flex-1 h-12" onClick={handleSave} disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Terminer
                </Button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-slate-400 text-xs mt-4">
          Vous pourrez modifier ces informations à tout moment dans les Paramètres.
        </p>
      </div>
    </div>
  )
}
