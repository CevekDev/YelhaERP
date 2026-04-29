'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { WILAYAS_LIST } from '@/lib/algerian/format'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

const PLAN_FEATURES: Record<string, { label: string; price: string; aiQuota: string; color: string }> = {
  TRIAL: { label: 'Essai gratuit', price: '10 jours', aiQuota: '30 questions/mois', color: 'bg-amber-100 text-amber-800' },
  STARTER: { label: 'Starter', price: '1 500 DA/mois', aiQuota: '50 questions/mois', color: 'bg-blue-100 text-blue-800' },
  PRO: { label: 'Pro', price: '3 200 DA/mois', aiQuota: '300 questions/mois', color: 'bg-yelha-100 text-yelha-800' },
  AGENCY: { label: 'Agency', price: '9 900 DA/mois', aiQuota: 'Illimité', color: 'bg-purple-100 text-purple-800' },
}

export default function SettingsPage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', nif: '', nis: '', legalForm: '', aeCardNumber: '', address: '', wilaya: '', phone: '', email: '' })

  useEffect(() => {
    fetch('/api/company/profile').then(r => r.ok ? r.json() : null).then(d => d && setForm({
      name: d.name ?? '', nif: d.nif ?? '', nis: d.nis ?? '',
      legalForm: d.legalForm ?? '', aeCardNumber: d.aeCardNumber ?? '',
      address: d.address ?? '', wilaya: d.wilaya ?? '',
      phone: d.phone ?? '', email: d.email ?? session?.user?.email ?? '',
    }))
  }, [session])

  const save = async () => {
    setSaving(true)
    const res = await fetch('/api/company/profile', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      const updated = await res.json()
      // Refresh JWT token with new businessType + companyName so sidebar updates live
      const newBusinessType = updated.businessType ?? session?.user?.businessType
      const newCompanyName  = updated.name         ?? session?.user?.companyName
      await update({ businessType: newBusinessType, companyName: newCompanyName })
      router.refresh()
      toast.success('Paramètres sauvegardés')
    } else {
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  const plan = session?.user?.plan ?? 'TRIAL'
  const planInfo = PLAN_FEATURES[plan] ?? PLAN_FEATURES.TRIAL

  return (
    <div>
      <Header title="Paramètres" />
      <div className="p-4 md:p-6 max-w-2xl space-y-6">
        <PageHeader title="Paramètres" />

        {/* Plan actuel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Votre abonnement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${planInfo.color}`}>
                  Plan {planInfo.label}
                </span>
                <p className="text-sm text-muted-foreground mt-2">{planInfo.price} · {planInfo.aiQuota}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Contactez-nous pour changer de plan</p>
                <p className="text-xs text-muted-foreground mt-1">contact@yelhaerp.dz</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profil entreprise */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Profil de l'entreprise</CardTitle>
            <CardDescription>Ces informations apparaissent sur vos factures</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Nom de l'entreprise</Label><Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} /></div>
            <div className="space-y-2">
              <Label>Forme juridique</Label>
              <Select value={form.legalForm} onValueChange={v => setForm(f => ({...f, legalForm: v}))}>
                <SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
                <SelectContent>
                  {[
                    { value: 'SARL', label: 'SARL' }, { value: 'EURL', label: 'EURL' },
                    { value: 'SPA', label: 'SPA' }, { value: 'SNC', label: 'SNC' },
                    { value: 'EI', label: 'EI — Établissement Individuel' },
                    { value: 'AE', label: 'Auto-entrepreneur' },
                    { value: 'NONE', label: 'Sans RC / Informel' },
                  ].map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {form.legalForm === 'AE' && (
              <div className="space-y-2"><Label>Numéro carte Auto-entrepreneur</Label><Input value={form.aeCardNumber} onChange={e => setForm(f => ({...f, aeCardNumber: e.target.value}))} placeholder="AE-00-000000" /></div>
            )}
            {form.legalForm && form.legalForm !== 'NONE' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>NIF</Label><Input value={form.nif} onChange={e => setForm(f => ({...f, nif: e.target.value}))} /></div>
                <div className="space-y-2"><Label>NIS</Label><Input value={form.nis} onChange={e => setForm(f => ({...f, nis: e.target.value}))} /></div>
              </div>
            )}
            <div className="space-y-2"><Label>Téléphone</Label><Input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} /></div>
            <div className="space-y-2"><Label>Adresse</Label><Input value={form.address} onChange={e => setForm(f => ({...f, address: e.target.value}))} /></div>
            <div className="space-y-2">
              <Label>Wilaya</Label>
              <Select value={form.wilaya} onValueChange={v => setForm(f => ({...f, wilaya: v}))}>
                <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                <SelectContent>{WILAYAS_LIST.map(w => <SelectItem key={w.code} value={w.name}>{w.code} — {w.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Enregistrer
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
