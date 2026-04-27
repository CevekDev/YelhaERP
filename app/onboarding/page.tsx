'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, Building2, CreditCard, UserCheck, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

type BusinessType = 'RC' | 'AE' | 'NONE'

export default function OnboardingPage() {
  const router = useRouter()
  const { update } = useSession()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<1 | 2>(1)
  const [selected, setSelected] = useState<BusinessType | null>(null)
  const [fields, setFields] = useState({
    nif: '', nis: '', rc: '', legalForm: '', aeCardNumber: '',
    address: '', wilaya: '', phone: '',
  })

  const options = [
    {
      type: 'RC' as BusinessType,
      icon: Building2,
      title: 'Registre de Commerce',
      desc: 'SARL, EURL, SPA ou autre forme juridique',
    },
    {
      type: 'AE' as BusinessType,
      icon: CreditCard,
      title: 'Auto-Entrepreneur',
      desc: "Carte d'auto-entrepreneur (AE)",
    },
    {
      type: 'NONE' as BusinessType,
      icon: UserCheck,
      title: "Pas encore de statut",
      desc: 'Je commencerai à formaliser plus tard',
    },
  ]

  const handleSave = async () => {
    if (!selected) return
    setLoading(true)
    const res = await fetch('/api/company/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessType: selected, ...fields }),
    })
    setLoading(false)
    if (!res.ok) {
      toast.error("Erreur lors de l'enregistrement")
      return
    }
    await update()
    toast.success('Profil configuré !')
    router.push('/dashboard')
  }

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

        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold">Bienvenue !</h2>
              <p className="text-muted-foreground mt-1">Quel est votre statut juridique ?</p>
            </div>
            <div className="grid gap-3">
              {options.map(opt => (
                <button
                  key={opt.type}
                  onClick={() => setSelected(opt.type)}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all',
                    selected === opt.type
                      ? 'border-yelha-500 bg-yelha-50'
                      : 'border-border bg-card hover:border-yelha-200'
                  )}
                >
                  <div className={cn(
                    'p-3 rounded-lg',
                    selected === opt.type ? 'bg-yelha-500 text-white' : 'bg-muted'
                  )}>
                    <opt.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{opt.title}</p>
                    <p className="text-sm text-muted-foreground">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <Button
              className="w-full mt-6"
              disabled={!selected}
              onClick={() => selected === 'NONE' ? handleSave() : setStep(2)}
            >
              Continuer
            </Button>
          </div>
        )}

        {step === 2 && selected && (
          <Card>
            <CardHeader>
              <CardTitle>
                {selected === 'RC' ? 'Informations RC' : 'Carte Auto-Entrepreneur'}
              </CardTitle>
              <CardDescription>Ces informations apparaîtront sur vos factures</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selected === 'RC' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>NIF</Label>
                      <Input placeholder="000000000000000" value={fields.nif} onChange={e => setFields(f => ({...f, nif: e.target.value}))} />
                    </div>
                    <div className="space-y-2">
                      <Label>NIS</Label>
                      <Input placeholder="000000000000000" value={fields.nis} onChange={e => setFields(f => ({...f, nis: e.target.value}))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>RC</Label>
                      <Input placeholder="16/00-00000000 B 00" value={fields.rc} onChange={e => setFields(f => ({...f, rc: e.target.value}))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Forme juridique</Label>
                      <Input placeholder="SARL, EURL, SPA..." value={fields.legalForm} onChange={e => setFields(f => ({...f, legalForm: e.target.value}))} />
                    </div>
                  </div>
                </>
              )}
              {selected === 'AE' && (
                <div className="space-y-2">
                  <Label>Numéro de carte AE</Label>
                  <Input placeholder="AE-00-000000" value={fields.aeCardNumber} onChange={e => setFields(f => ({...f, aeCardNumber: e.target.value}))} />
                </div>
              )}
              <div className="space-y-2">
                <Label>Adresse</Label>
                <Input placeholder="Rue, quartier..." value={fields.address} onChange={e => setFields(f => ({...f, address: e.target.value}))} />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)}>Retour</Button>
                <Button className="flex-1" onClick={handleSave} disabled={loading}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Terminer la configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
