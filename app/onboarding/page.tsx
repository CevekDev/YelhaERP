'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, TrendingUp, Building2 } from 'lucide-react'
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

export default function OnboardingPage() {
  const router = useRouter()
  const { data: session, update } = useSession()
  const [loading, setLoading] = useState(false)
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

  useEffect(() => {
    if (session?.user) {
      setForm(f => ({
        ...f,
        email: session.user.email ?? '',
        companyName: session.user.companyName ?? '',
      }))
    }
  }, [session])

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }))
  const isAE = form.legalForm === 'AE'

  const handleSave = async () => {
    if (!form.legalForm) { toast.error('Veuillez choisir une forme juridique'); return }
    setLoading(true)
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
    setLoading(false)
    if (!res.ok) { toast.error("Erreur lors de l'enregistrement"); return }
    await update()
    toast.success('Profil configuré !')
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yelha-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-yelha-500 rounded-xl flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-bold text-yelha-700">YelhaERP</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
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
              <Label>Nom de l'entreprise</Label>
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

            {/* Numéro carte AE — seulement si Auto-entrepreneur */}
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
                  <Input value={form.nif} onChange={e => set('nif', e.target.value)} placeholder="000000000000000" />
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

            <Button className="w-full h-12 text-base" onClick={handleSave} disabled={loading || !form.legalForm}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Terminer la configuration →
            </Button>
          </div>
        </div>

        <p className="text-center text-slate-400 text-xs mt-4">
          Vous pourrez modifier ces informations à tout moment dans les Paramètres.
        </p>
      </div>
    </div>
  )
}
