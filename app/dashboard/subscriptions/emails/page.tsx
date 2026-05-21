'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Save, RotateCcw, Eye, Wand2, Mail, Globe, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
  DEFAULT_TEMPLATES,
  EMAIL_LANGS,
  PLACEHOLDERS,
  type EmailLang,
  type EmailType,
} from '@/lib/subscriptions/email-templates'

interface Settings {
  emailLanguage: EmailLang
  emailTemplates: Partial<Record<EmailType, Partial<Record<EmailLang, { subject?: string; body?: string }>>>>
}

const TYPES: { id: EmailType; label: string; icon: string; description: string }[] = [
  { id: 'welcome',  label: 'Bienvenue',        icon: '💳', description: "Envoyé à la création — invite le client à payer pour activer son abonnement" },
  { id: 'renewal',  label: 'Renouvellement',   icon: '⚠️', description: "Envoyé 1 jour avant l'expiration d'un abonnement actif" },
  { id: 'trialEnd', label: "Fin d'essai",       icon: '🎁', description: "Envoyé 1 jour avant la fin d'une période d'essai" },
]

export default function EmailsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<Settings>({ emailLanguage: 'fr', emailTemplates: {} })

  const [activeType, setActiveType] = useState<EmailType>('renewal')
  const [activeLang, setActiveLang] = useState<EmailLang>('fr')
  const [editorSubject, setEditorSubject] = useState('')
  const [editorBody, setEditorBody] = useState('')
  const [previewHtml, setPreviewHtml] = useState('')
  const [previewing, setPreviewing] = useState(false)

  useEffect(() => {
    fetch('/api/subscriptions/settings')
      .then(r => r.json())
      .then(d => {
        if (d && !d.error) {
          setSettings({
            emailLanguage:  d.emailLanguage ?? 'fr',
            emailTemplates: d.emailTemplates ?? {},
          })
          setActiveLang((d.emailLanguage ?? 'fr') as EmailLang)
        }
        setLoading(false)
      })
      .catch(() => { toast.error('Erreur de chargement'); setLoading(false) })
  }, [])

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

  const refreshPreview = useCallback(async (subject: string, body: string, lang: EmailLang, type: EmailType) => {
    setPreviewing(true)
    try {
      const res = await fetch('/api/subscriptions/settings/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, lang, subject, body }),
      })
      if (res.ok) setPreviewHtml((await res.json()).html ?? '')
    } finally { setPreviewing(false) }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => refreshPreview(editorSubject, editorBody, activeLang, activeType), 500)
    return () => clearTimeout(t)
  }, [editorSubject, editorBody, activeLang, activeType, refreshPreview])

  async function saveLanguage(lang: EmailLang) {
    setSettings(s => ({ ...s, emailLanguage: lang }))
    setActiveLang(lang)
    const res = await fetch('/api/subscriptions/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailLanguage: lang }),
    })
    if (res.ok) toast.success(`Langue : ${EMAIL_LANGS.find(l => l.code === lang)?.label}`)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-white/30" />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-white flex items-center gap-2">
            <Mail className="w-5 h-5 text-emerald-400" />
            Emails de rappel
          </h1>
          <p className="text-sm text-white/40 mt-0.5">
            Personnalisez les emails envoyés automatiquement à vos clients.
          </p>
        </div>

        {/* Langue globale */}
        <div className="flex items-center gap-2 shrink-0">
          <Globe className="w-4 h-4 text-white/40" />
          <Select value={settings.emailLanguage} onValueChange={v => saveLanguage(v as EmailLang)}>
            <SelectTrigger className="w-36 bg-white/[0.04] border-white/[0.1] text-white text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EMAIL_LANGS.map(l => (
                <SelectItem key={l.code} value={l.code}>{l.flag} {l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Type selector */}
      <div className="grid sm:grid-cols-3 gap-3">
        {TYPES.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveType(t.id)}
            className={`text-left p-4 rounded-xl border transition-all ${
              activeType === t.id
                ? 'border-emerald-500/40 bg-emerald-500/[0.07]'
                : 'border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04]'
            }`}
          >
            <p className="font-semibold text-sm text-white flex items-center gap-2">
              <span>{t.icon}</span>{t.label}
              {activeType === t.id && <CheckCircle className="w-3.5 h-3.5 text-emerald-400 ml-auto" />}
            </p>
            <p className="text-xs text-white/35 mt-1">{t.description}</p>
          </button>
        ))}
      </div>

      {/* Lang tabs + actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1">
          {EMAIL_LANGS.map(l => {
            const hasCustom = !!settings.emailTemplates?.[activeType]?.[l.code]
            return (
              <button
                key={l.code}
                onClick={() => setActiveLang(l.code)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  activeLang === l.code
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-white/[0.04] text-white/40 hover:text-white/70 border border-transparent'
                }`}
              >
                <span>{l.flag}</span>{l.label}
                {hasCustom && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
              </button>
            )
          })}
        </div>
        <div className="flex gap-2">
          {isCustom && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetTemplate}
              disabled={saving}
              className="gap-1.5 border-white/[0.1] text-white/60 hover:text-white hover:bg-white/[0.06] text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Réinitialiser
            </Button>
          )}
          <Button
            size="sm"
            onClick={saveTemplate}
            disabled={saving || !isModified}
            className="gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Enregistrer
          </Button>
        </div>
      </div>

      {/* Editor + preview */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Editor */}
        <div className="space-y-4 rounded-xl border border-white/[0.07] bg-white/[0.02] p-5">
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs uppercase tracking-wider">Objet</Label>
            <Input
              value={editorSubject}
              onChange={e => setEditorSubject(e.target.value)}
              dir={activeLang === 'ar' ? 'rtl' : 'ltr'}
              className="bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/25"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs uppercase tracking-wider">Message</Label>
            <Textarea
              rows={16}
              value={editorBody}
              onChange={e => setEditorBody(e.target.value)}
              dir={activeLang === 'ar' ? 'rtl' : 'ltr'}
              className="font-mono text-xs bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/25 resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-white/30 flex items-center gap-1.5">
              <Wand2 className="h-3 w-3" /> Variables disponibles :
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PLACEHOLDERS.map(ph => (
                <code
                  key={ph}
                  className="px-1.5 py-0.5 bg-white/[0.06] rounded text-[11px] text-white/50 cursor-pointer hover:bg-white/[0.1] hover:text-white transition-colors"
                  onClick={() => navigator.clipboard.writeText(`{{${ph}}}`).then(() => toast.success(`Copié : {{${ph}}}`))}
                >{`{{${ph}}}`}</code>
              ))}
            </div>
            <p className="text-[11px] text-white/25">
              <code className="bg-white/[0.06] px-1 rounded">**gras**</code> · double saut de ligne = nouveau paragraphe
            </p>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-white/60 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" /> Aperçu
            </Label>
            {previewing && <Loader2 className="h-3.5 w-3.5 animate-spin text-white/30" />}
          </div>
          <div className="rounded-xl overflow-hidden border border-white/[0.07] bg-white" style={{ height: 560 }}>
            <iframe
              title="Aperçu email"
              srcDoc={previewHtml}
              className="w-full h-full"
              sandbox=""
            />
          </div>
          <p className="text-[11px] text-white/25">
            Aperçu avec données fictives. Les boutons CCP / Chargily dépendent de vos coordonnées dans Paramètres.
          </p>
        </div>
      </div>
    </div>
  )
}
