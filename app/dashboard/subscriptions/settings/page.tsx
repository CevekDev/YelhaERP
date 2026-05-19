'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, ArrowLeft, Save, RotateCcw, CreditCard, Mail, MessageCircle, Eye, Wand2, AlertTriangle, Webhook, Copy } from 'lucide-react'
import { toast } from 'sonner'
import {
  DEFAULT_TEMPLATES,
  EMAIL_LANGS,
  PLACEHOLDERS,
  type EmailLang,
  type EmailType,
} from '@/lib/subscriptions/email-templates'

interface Settings {
  whatsapp: string | null
  ccpNumber: string | null
  chargilyKey: string | null
  emailLanguage: EmailLang
  emailTemplates: Partial<Record<EmailType, Partial<Record<EmailLang, { subject?: string; body?: string }>>>>
}

const TYPE_LABELS: Record<EmailType, { label: string; icon: string; description: string }> = {
  welcome:  { label: 'Email de début',      icon: '💳', description: 'Envoyé dès la création — invite le client à payer pour activer son abonnement' },
  renewal:  { label: 'Renouvellement',     icon: '⚠️', description: 'Envoyé 1 jour avant l\'expiration d\'un abonnement actif' },
  trialEnd: { label: 'Fin d\'essai gratuit', icon: '🎁', description: 'Envoyé 1 jour avant la fin d\'une période d\'essai' },
}

export default function SubscriptionSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<Settings>({
    whatsapp: '', ccpNumber: '', chargilyKey: '', emailLanguage: 'fr', emailTemplates: {},
  })

  // Email editor state
  const [activeType, setActiveType] = useState<EmailType>('renewal')
  const [activeLang, setActiveLang] = useState<EmailLang>('fr')
  const [editorSubject, setEditorSubject] = useState('')
  const [editorBody, setEditorBody] = useState('')
  const [previewHtml, setPreviewHtml] = useState<string>('')
  const [previewing, setPreviewing] = useState(false)

  // Charger settings
  useEffect(() => {
    fetch('/api/subscriptions/settings')
      .then(r => r.json())
      .then(d => {
        if (d && !d.error) {
          setSettings({
            whatsapp:       d.whatsapp ?? '',
            ccpNumber:      d.ccpNumber ?? '',
            chargilyKey:    d.chargilyKey ?? '',
            emailLanguage:  d.emailLanguage ?? 'fr',
            emailTemplates: d.emailTemplates ?? {},
          })
          setActiveLang((d.emailLanguage ?? 'fr') as EmailLang)
        }
        setLoading(false)
      })
      .catch(() => { toast.error('Erreur de chargement'); setLoading(false) })
  }, [])

  // Sync editor when type/lang/templates change
  useEffect(() => {
    const custom = settings.emailTemplates?.[activeType]?.[activeLang]
    const def = DEFAULT_TEMPLATES[activeType][activeLang]
    setEditorSubject(custom?.subject ?? def.subject)
    setEditorBody(custom?.body ?? def.body)
  }, [activeType, activeLang, settings.emailTemplates])

  const isCustom = useMemo(() => {
    const custom = settings.emailTemplates?.[activeType]?.[activeLang]
    return !!(custom?.subject || custom?.body)
  }, [settings.emailTemplates, activeType, activeLang])

  const isModified = useMemo(() => {
    const def = DEFAULT_TEMPLATES[activeType][activeLang]
    const custom = settings.emailTemplates?.[activeType]?.[activeLang]
    const current = { subject: custom?.subject ?? def.subject, body: custom?.body ?? def.body }
    return current.subject !== editorSubject || current.body !== editorBody
  }, [editorSubject, editorBody, activeType, activeLang, settings.emailTemplates])

  // Live preview (debounced)
  const refreshPreview = useCallback(async (subject: string, body: string, lang: EmailLang, type: EmailType) => {
    setPreviewing(true)
    try {
      const res = await fetch('/api/subscriptions/settings/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, lang, subject, body }),
      })
      if (res.ok) {
        const d = await res.json()
        setPreviewHtml(d.html ?? '')
      }
    } finally {
      setPreviewing(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      refreshPreview(editorSubject, editorBody, activeLang, activeType)
    }, 500)
    return () => clearTimeout(t)
  }, [editorSubject, editorBody, activeLang, activeType, refreshPreview, settings.whatsapp, settings.ccpNumber, settings.chargilyKey])

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

  async function saveTemplate() {
    setSaving(true)
    const def = DEFAULT_TEMPLATES[activeType][activeLang]
    const subjectChanged = editorSubject.trim() && editorSubject !== def.subject
    const bodyChanged    = editorBody.trim()    && editorBody    !== def.body

    const next = { ...(settings.emailTemplates ?? {}) }
    if (!next[activeType]) next[activeType] = {}
    next[activeType]![activeLang] = {
      ...(subjectChanged ? { subject: editorSubject } : {}),
      ...(bodyChanged    ? { body:    editorBody    } : {}),
    }
    // If nothing custom remains, clean up
    if (!subjectChanged && !bodyChanged) {
      delete next[activeType]![activeLang]
      if (Object.keys(next[activeType]!).length === 0) delete next[activeType]
    }

    const res = await fetch('/api/subscriptions/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailTemplates: next, emailLanguage: settings.emailLanguage }),
    })
    if (res.ok) {
      const d = await res.json()
      setSettings(s => ({ ...s, emailTemplates: d.emailTemplates ?? {} }))
      toast.success('Template enregistré')
    } else toast.error('Erreur')
    setSaving(false)
  }

  async function resetTemplate() {
    if (!isCustom) return
    setSaving(true)
    const res = await fetch('/api/subscriptions/settings/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: activeType, lang: activeLang }),
    })
    if (res.ok) {
      const d = await res.json()
      setSettings(s => ({ ...s, emailTemplates: d.emailTemplates ?? {} }))
      const def = DEFAULT_TEMPLATES[activeType][activeLang]
      setEditorSubject(def.subject)
      setEditorBody(def.body)
      toast.success('Template réinitialisé')
    } else toast.error('Erreur')
    setSaving(false)
  }

  async function saveLanguage(lang: EmailLang) {
    setSettings(s => ({ ...s, emailLanguage: lang }))
    const res = await fetch('/api/subscriptions/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailLanguage: lang }),
    })
    if (res.ok) toast.success(`Langue active : ${EMAIL_LANGS.find(l => l.code === lang)?.label}`)
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
              Configurez vos coordonnées de paiement et personnalisez les emails de rappel envoyés à vos clients.
            </p>
          </div>
        </div>

        <Tabs defaultValue="payment" className="space-y-6">
          <TabsList>
            <TabsTrigger value="payment" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Paiement
            </TabsTrigger>
            <TabsTrigger value="email" className="gap-2">
              <Mail className="h-4 w-4" />
              Emails
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

          {/* EMAIL TAB */}
          <TabsContent value="email" className="space-y-5">
            <Card>
              <CardContent className="p-6 space-y-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="font-semibold text-lg flex items-center gap-2">
                      <Mail className="h-4 w-4 text-primary" />
                      Langue active des emails
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      C&apos;est cette langue qui sera utilisée pour envoyer les rappels à vos clients.
                    </p>
                  </div>
                  <Select value={settings.emailLanguage} onValueChange={v => saveLanguage(v as EmailLang)}>
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EMAIL_LANGS.map(l => (
                        <SelectItem key={l.code} value={l.code}>{l.flag} {l.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 space-y-5">
                {/* Type selector */}
                <div className="grid sm:grid-cols-3 gap-3">
                  {(Object.keys(TYPE_LABELS) as EmailType[]).map(t => (
                    <button
                      key={t}
                      onClick={() => setActiveType(t)}
                      className={`text-left p-4 rounded-xl border-2 transition-all ${
                        activeType === t
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground bg-card'
                      }`}
                    >
                      <p className="font-semibold text-sm flex items-center gap-2">
                        <span>{TYPE_LABELS[t].icon}</span>
                        {TYPE_LABELS[t].label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{TYPE_LABELS[t].description}</p>
                    </button>
                  ))}
                </div>

                {/* Lang tabs */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex gap-1 flex-wrap">
                    {EMAIL_LANGS.map(l => {
                      const has = !!settings.emailTemplates?.[activeType]?.[l.code]
                      return (
                        <button
                          key={l.code}
                          onClick={() => setActiveLang(l.code)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                            activeLang === l.code
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <span>{l.flag}</span>{l.label}
                          {has && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-amber-500" title="Personnalisé" />}
                        </button>
                      )
                    })}
                  </div>
                  <div className="flex gap-2">
                    {isCustom && (
                      <Button variant="outline" size="sm" onClick={resetTemplate} disabled={saving} className="gap-1.5">
                        <RotateCcw className="h-3.5 w-3.5" />
                        Réinitialiser
                      </Button>
                    )}
                    <Button size="sm" onClick={saveTemplate} disabled={saving || !isModified} className="gap-1.5">
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Enregistrer
                    </Button>
                  </div>
                </div>

                {/* Editor + preview side by side */}
                <div className="grid lg:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>Objet</Label>
                      <Input
                        value={editorSubject}
                        onChange={e => setEditorSubject(e.target.value)}
                        dir={activeLang === 'ar' ? 'rtl' : 'ltr'}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Message</Label>
                      <Textarea
                        rows={14}
                        value={editorBody}
                        onChange={e => setEditorBody(e.target.value)}
                        dir={activeLang === 'ar' ? 'rtl' : 'ltr'}
                        className="font-mono text-xs"
                      />
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p className="flex items-center gap-1.5"><Wand2 className="h-3 w-3" /> Variables disponibles :</p>
                      <div className="flex flex-wrap gap-1.5">
                        {PLACEHOLDERS.map(ph => (
                          <code
                            key={ph}
                            className="px-1.5 py-0.5 bg-muted rounded text-[11px] cursor-pointer hover:bg-muted-foreground/20"
                            onClick={() => navigator.clipboard.writeText(`{{${ph}}}`).then(() => toast.success(`Copié : {{${ph}}}`))}
                          >{`{{${ph}}}`}</code>
                        ))}
                      </div>
                      <p className="pt-1">
                        Mise en forme : <code className="px-1 bg-muted rounded text-[11px]">**gras**</code>, double saut de ligne pour un nouveau paragraphe.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-1.5">
                        <Eye className="h-3.5 w-3.5" />
                        Aperçu
                      </Label>
                      {previewing && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                    </div>
                    <div className="rounded-lg overflow-hidden border border-border bg-white" style={{ height: 540 }}>
                      <iframe
                        title="Aperçu email"
                        srcDoc={previewHtml}
                        className="w-full h-full"
                        sandbox=""
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Aperçu généré avec des données fictives. Les boutons CCP / Chargily / WhatsApp dépendent de vos coordonnées de paiement.
                    </p>
                  </div>
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
