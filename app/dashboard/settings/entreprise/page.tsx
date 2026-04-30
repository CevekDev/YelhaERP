'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { WILAYAS_LIST } from '@/lib/algerian/format'
import { toast } from 'sonner'
import { Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function EntrepriseSettingsPage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', nif: '', nis: '', legalForm: '', aeCardNumber: '',
    address: '', wilaya: '', phone: '', email: '',
  })

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
      await update({ businessType: updated.businessType ?? session?.user?.businessType, companyName: updated.name ?? session?.user?.companyName })
      router.refresh()
      toast.success('Profil sauvegardé')
    } else {
      toast.error('Erreur lors de la sauvegarde')
    }
  }

  const f = (k: keyof typeof form) => form[k]
  const set = (k: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div className="p-4 md:p-6 max-w-2xl space-y-6">
      <Breadcrumb items={[{ label: 'Paramètres', href: '/dashboard/settings' }, { label: 'Entreprise' }]} />
      <div className="flex items-center gap-3">
        <Link href="/dashboard/settings"><Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <h1 className="text-2xl font-bold">Profil de l'entreprise</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informations générales</CardTitle>
          <CardDescription>Ces informations apparaissent sur vos factures et devis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Nom de l'entreprise</Label><Input value={f('name')} onChange={e => set('name')(e.target.value)} /></div>
          <div className="space-y-2">
            <Label>Forme juridique</Label>
            <Select value={f('legalForm')} onValueChange={set('legalForm')}>
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
          {f('legalForm') === 'AE' && (
            <div className="space-y-2"><Label>Numéro carte d'auto-entrepreneur</Label><Input value={f('aeCardNumber')} onChange={e => set('aeCardNumber')(e.target.value)} placeholder="AE-XXXX-XXXXXX" /></div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Identifiants fiscaux</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>NIF</Label><Input value={f('nif')} onChange={e => set('nif')(e.target.value)} placeholder="15 chiffres" /></div>
            <div className="space-y-2"><Label>NIS</Label><Input value={f('nis')} onChange={e => set('nis')(e.target.value)} placeholder="15 chiffres" /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Coordonnées</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Adresse</Label><Input value={f('address')} onChange={e => set('address')(e.target.value)} /></div>
          <div className="space-y-2">
            <Label>Wilaya</Label>
            <Select value={f('wilaya')} onValueChange={set('wilaya')}>
              <SelectTrigger><SelectValue placeholder="Sélectionnez..." /></SelectTrigger>
              <SelectContent className="max-h-60">
                {WILAYAS_LIST.map(w => <SelectItem key={w.code} value={w.code}>{w.code} — {w.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Téléphone</Label><Input value={f('phone')} onChange={e => set('phone')(e.target.value)} placeholder="05XXXXXXXX" /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={f('email')} onChange={e => set('email')(e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Sauvegarder
        </Button>
      </div>
    </div>
  )
}
