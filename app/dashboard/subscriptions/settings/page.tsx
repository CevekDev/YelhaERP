'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowLeft, Save, CreditCard, MessageCircle, AlertTriangle, Webhook, Copy } from 'lucide-react'
import { toast } from 'sonner'

interface Settings {
  whatsapp: string | null
  ccpNumber: string | null
  chargilyKey: string | null
}

export default function SubscriptionSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<Settings>({
    whatsapp: '', ccpNumber: '', chargilyKey: '',
  })

  useEffect(() => {
    fetch('/api/subscriptions/settings')
      .then(r => r.json())
      .then(d => {
        if (d && !d.error) {
          setSettings({
            whatsapp:    d.whatsapp ?? '',
            ccpNumber:   d.ccpNumber ?? '',
            chargilyKey: d.chargilyKey ?? '',
          })
        }
        setLoading(false)
      })
      .catch(() => { toast.error('Erreur de chargement'); setLoading(false) })
  }, [])

  async function savePayment() {
    setSaving(true)
    const res = await fetch('/api/subscriptions/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        whatsapp:    settings.whatsapp || null,
        ccpNumber:   settings.ccpNumber || null,
        chargilyKey: settings.chargilyKey || null,
      }),
    })
    if (res.ok) toast.success('Paramètres de paiement enregistrés')
    else toast.error('Erreur')
    setSaving(false)
  }

  const hasNoChargily = !settings.chargilyKey

  if (loading) {
    return (
      <div>
        <Header title="Paramètres des abonnements" />
        <div className="flex items-center justify-center h-96 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title="Paramètres des abonnements" />
      <div className="p-4 md:p-6 max-w-6xl">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Paramètres des abonnements</h1>
            <p className="text-muted-foreground text-sm">
              Configurez vos coordonnées de paiement et le webhook Chargily.
            </p>
          </div>
        </div>

        <Tabs defaultValue="payment" className="space-y-6">
          <TabsList>
            <TabsTrigger value="payment" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Paiement
            </TabsTrigger>
            <TabsTrigger value="webhook" className="gap-2">
              <Webhook className="h-4 w-4" />
              Webhook
            </TabsTrigger>
          </TabsList>

          {/* PAYMENT TAB */}
          <TabsContent value="payment" className="space-y-5">
            <Card>
              <CardContent className="p-6 space-y-5">
                <div>
                  <h2 className="font-semibold text-lg flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                    Coordonnées de paiement
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Ces informations seront automatiquement insérées dans les emails de rappel envoyés à vos clients.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5">
                      <MessageCircle className="h-3.5 w-3.5 text-green-600" />
                      Votre numéro WhatsApp
                    </Label>
                    <Input
                      value={settings.whatsapp ?? ''}
                      onChange={e => setSettings(s => ({ ...s, whatsapp: e.target.value }))}
                      placeholder="+213 5XX XX XX XX"
                      name="sub-whatsapp-xxx"
                      autoComplete="off"
                      data-form-type="other"
                    />
                    <p className="text-xs text-muted-foreground">
                      Affiché aux clients pour vous contacter et payer via virement.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-1.5">
                      💳 Votre numéro CCP
                    </Label>
                    <Input
                      inputMode="numeric"
                      value={settings.ccpNumber ?? ''}
                      onChange={e => setSettings(s => ({ ...s, ccpNumber: e.target.value }))}
                      placeholder="123456789 / Clé 12"
                      name="sub-ccp-xxx"
                      autoComplete="off"
                      data-form-type="other"
                      data-lpignore="true"
                    />
                    <p className="text-xs text-muted-foreground">
                      Compte CCP sur lequel vos clients effectueront le virement.
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    🔵 Votre clé secrète Chargily ePay
                    <Badge variant="outline" className="ml-1 text-[10px]">Optionnel</Badge>
                  </Label>
                  <Input
                    type="password"
                    value={settings.chargilyKey ?? ''}
                    onChange={e => setSettings(s => ({ ...s, chargilyKey: e.target.value }))}
                    placeholder="test_sk_..."
                    name="sub-chargily-xxx"
                    autoComplete="new-password"
                    data-form-type="other"
                    data-lpignore="true"
                  />
                  <p className="text-xs text-muted-foreground">
                    Si renseignée, vos clients pourront payer en ligne via Chargily Pay (Edahabia / CIB) directement depuis l&apos;email.
                    Sinon, seul le virement CCP / WhatsApp sera proposé.
                  </p>
                </div>

                {hasNoChargily && (
                  <div className="flex gap-3 items-start p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-amber-900 dark:text-amber-200">
                      Sans clé Chargily, seuls le <strong>virement CCP</strong> et <strong>WhatsApp</strong> seront proposés dans les emails de rappel.
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <Button onClick={savePayment} disabled={saving} className="gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Enregistrer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* WEBHOOK TAB */}
          <TabsContent value="webhook" className="space-y-5">
            <Card>
              <CardContent className="p-6 space-y-5">
                <div>
                  <h2 className="font-semibold text-lg flex items-center gap-2">
                    <Webhook className="h-4 w-4 text-primary" />
                    Activation automatique des paiements Chargily
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Quand un client paye via Chargily, son abonnement passe automatiquement en <strong>Actif</strong>.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Copiez cette URL :</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value="https://subs.yelha.net/api/webhooks/chargily-subscriptions"
                      className="font-mono text-xs"
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText('https://subs.yelha.net/api/webhooks/chargily-subscriptions')
                          .then(() => toast.success('URL copiée'))
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-2 text-sm">
                  <p className="font-semibold text-primary">Comment l&apos;ajouter dans Chargily :</p>
                  <ol className="list-decimal list-inside space-y-1 text-foreground/90">
                    <li>Allez sur <a href="https://pay.chargily.net" target="_blank" rel="noopener noreferrer" className="text-primary underline">pay.chargily.net</a> → onglet <strong>Webhooks</strong></li>
                    <li>Cliquez sur <strong>« Ajouter un webhook »</strong> et collez l&apos;URL ci-dessus</li>
                    <li>Sauvegardez. C&apos;est tout ✅</li>
                  </ol>
                </div>

                {!settings.chargilyKey && (
                  <div className="flex gap-3 items-start p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-amber-900 dark:text-amber-200">
                      Renseignez d&apos;abord votre <strong>clé Chargily</strong> dans l&apos;onglet <strong>Paiement</strong>. Sans elle, le webhook ne peut pas vérifier les paiements.
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
