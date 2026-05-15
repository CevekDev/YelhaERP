'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Loader2, ArrowLeft, Key, Plus, Copy, Trash2, Check, BookOpen, Download,
  AlertTriangle, Zap, Eye, EyeOff,
} from 'lucide-react'
import { toast } from 'sonner'

interface ApiKey {
  id: string
  name: string | null
  keyPrefix: string
  lastUsedAt: string | null
  createdAt: string
}

export default function IntegrationPage() {
  const router = useRouter()
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [revealedKey, setRevealedKey] = useState<{ key: string; prefix: string } | null>(null)
  const [docsMd, setDocsMd] = useState<string>('')
  const [docsLoading, setDocsLoading] = useState(true)

  useEffect(() => {
    fetchKeys()
    fetch('/api/sub-api/docs').then(r => r.text()).then(t => {
      setDocsMd(t)
      setDocsLoading(false)
    }).catch(() => setDocsLoading(false))
  }, [])

  async function fetchKeys() {
    setLoading(true)
    const res = await fetch('/api/subscriptions/api-key')
    if (res.ok) setKeys(await res.json())
    setLoading(false)
  }

  async function createKey() {
    setCreating(true)
    const res = await fetch('/api/subscriptions/api-key', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newKeyName || undefined }),
    })
    const data = await res.json()
    if (res.ok) {
      setRevealedKey({ key: data.key, prefix: data.keyPrefix })
      setShowCreate(false)
      setNewKeyName('')
      fetchKeys()
    } else {
      toast.error(data.error ?? 'Erreur')
    }
    setCreating(false)
  }

  async function revokeKey(id: string) {
    if (!confirm('Révoquer cette clé ? Les applications qui l\'utilisent ne pourront plus accéder à l\'API.')) return
    const res = await fetch(`/api/subscriptions/api-key/${id}`, { method: 'DELETE' })
    if (res.ok) {
      toast.success('Clé révoquée')
      fetchKeys()
    } else toast.error('Erreur')
  }

  function copyToClipboard(text: string, msg = 'Copié') {
    navigator.clipboard.writeText(text).then(() => toast.success(msg))
  }

  function downloadDocs() {
    window.open('/api/sub-api/docs?download=1', '_blank')
  }

  return (
    <div>
      <Header title="Intégration API" />
      <div className="p-4 md:p-6 max-w-6xl">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              Intégration API
            </h1>
            <p className="text-muted-foreground text-sm">
              Pilotez vos abonnements depuis votre propre site, app mobile ou SaaS.
            </p>
          </div>
        </div>

        <Tabs defaultValue="keys" className="space-y-6">
          <TabsList>
            <TabsTrigger value="keys" className="gap-2">
              <Key className="h-4 w-4" />
              Clés API
            </TabsTrigger>
            <TabsTrigger value="docs" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Documentation
            </TabsTrigger>
          </TabsList>

          {/* KEYS TAB */}
          <TabsContent value="keys" className="space-y-5">
            <Card>
              <CardContent className="p-6 space-y-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="font-semibold text-lg flex items-center gap-2">
                      <Key className="h-4 w-4 text-primary" />
                      Vos clés API
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Chaque clé donne un accès complet à vos plans, clients et abonnements. Maximum 5 clés actives.
                    </p>
                  </div>
                  <Button onClick={() => setShowCreate(true)} className="gap-2" disabled={keys.length >= 5}>
                    <Plus className="h-4 w-4" />
                    Générer une clé
                  </Button>
                </div>

                {loading ? (
                  <div className="flex justify-center py-8 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : keys.length === 0 ? (
                  <div className="text-center py-10 border-2 border-dashed border-border rounded-xl">
                    <Key className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                    <p className="font-medium">Aucune clé API</p>
                    <p className="text-sm text-muted-foreground mt-1">Générez votre première clé pour commencer.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {keys.map(k => (
                      <div key={k.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm">{k.name || 'Clé sans nom'}</p>
                            <code className="text-xs px-2 py-0.5 bg-muted rounded font-mono">{k.keyPrefix}…</code>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Créée le {new Date(k.createdAt).toLocaleDateString('fr-DZ')}
                            {k.lastUsedAt
                              ? ` · Dernière utilisation : ${new Date(k.lastUsedAt).toLocaleString('fr-DZ')}`
                              : ' · Jamais utilisée'}
                          </p>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => revokeKey(k.id)} title="Révoquer">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 items-start p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-amber-900 dark:text-amber-200">
                    Une clé n&apos;est affichée <strong>qu&apos;une seule fois</strong> à sa création. Conservez-la dans un endroit sûr.
                    En cas de perte ou compromission, révoquez-la et générez-en une nouvelle.
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* DOCS TAB */}
          <TabsContent value="docs" className="space-y-5">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="font-semibold text-lg flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" />
                      Documentation complète
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Toutes les routes, paramètres, exemples cURL/JS/PHP/Python.
                    </p>
                  </div>
                  <Button onClick={downloadDocs} variant="outline" className="gap-2">
                    <Download className="h-4 w-4" />
                    Télécharger (.md)
                  </Button>
                </div>

                {docsLoading ? (
                  <div className="flex justify-center py-8 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : (
                  <pre className="text-xs font-mono p-4 rounded-lg bg-muted overflow-auto max-h-[700px] whitespace-pre-wrap break-words">
                    {docsMd}
                  </pre>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Create key dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Générer une clé API
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Nom (optionnel)</Label>
              <Input
                value={newKeyName}
                onChange={e => setNewKeyName(e.target.value)}
                placeholder="ex: Production, Mon site WordPress..."
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                Pour vous repérer entre plusieurs clés. La clé sera affichée une seule fois.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Annuler</Button>
              <Button onClick={createKey} disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Générer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Revealed key dialog */}
      <RevealedKeyDialog
        revealedKey={revealedKey}
        onClose={() => setRevealedKey(null)}
        onCopy={() => copyToClipboard(revealedKey!.key, 'Clé copiée dans le presse-papier')}
      />
    </div>
  )
}

function RevealedKeyDialog({
  revealedKey,
  onClose,
  onCopy,
}: {
  revealedKey: { key: string; prefix: string } | null
  onClose: () => void
  onCopy: () => void
}) {
  const [shown, setShown] = useState(false)
  useEffect(() => { if (revealedKey) setShown(false) }, [revealedKey])

  return (
    <Dialog open={!!revealedKey} onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <Check className="h-5 w-5" />
            Clé générée
          </DialogTitle>
        </DialogHeader>
        {revealedKey && (
          <div className="space-y-4 mt-2">
            <div className="flex gap-3 items-start p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-amber-900 dark:text-amber-200">
                <strong>Copiez cette clé maintenant</strong>. Elle ne sera plus jamais affichée. En cas de perte, vous devrez en générer une nouvelle.
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Votre clé API</Label>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    readOnly
                    type={shown ? 'text' : 'password'}
                    value={revealedKey.key}
                    className="font-mono text-xs pr-10"
                  />
                  <button
                    onClick={() => setShown(s => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    title={shown ? 'Masquer' : 'Afficher'}
                  >
                    {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <Button onClick={onCopy} variant="outline" size="icon">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button onClick={onClose}>J&apos;ai copié la clé</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
