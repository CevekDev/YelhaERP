'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  ShoppingBag, Globe, Loader2, CheckCircle, Plug, ArrowLeft,
  Code2, Plus, Trash2, Copy, Check, Eye, EyeOff, FileText,
  Key, AlertTriangle, ExternalLink,
} from 'lucide-react'
import Link from 'next/link'

interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  scopes: string[]
  lastUsedAt: string | null
  createdAt: string
}

const PLAN_LIMITS: Record<string, { label: string; color: string }> = {
  TRIAL:   { label: '100 req/heure',    color: 'bg-gray-100 text-gray-600' },
  STARTER: { label: '1 000 req/heure',  color: 'bg-blue-100 text-blue-700' },
  PRO:     { label: '10 000 req/heure', color: 'bg-yelha-100 text-yelha-700' },
  AGENCY:  { label: '100 000 req/heure', color: 'bg-purple-100 text-purple-700' },
}

export default function IntegrationsSettingsPage() {
  const { data: session } = useSession()
  const plan = session?.user?.plan ?? 'TRIAL'

  const [shopify, setShopify] = useState<{ isActive: boolean; config?: { shopDomain: string }; lastSync?: string } | null>(null)
  const [woo, setWoo] = useState<{ isActive: boolean; config?: { siteUrl: string }; lastSync?: string } | null>(null)
  const [shopifyForm, setShopifyForm] = useState({ shopDomain: '', accessToken: '' })
  const [wooForm, setWooForm] = useState({ siteUrl: '', consumerKey: '', consumerSecret: '' })
  const [savingShopify, setSavingShopify] = useState(false)
  const [savingWoo, setSavingWoo] = useState(false)

  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loadingKeys, setLoadingKeys] = useState(true)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['read'])
  const [creatingKey, setCreatingKey] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [revealedKey, setRevealedKey] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState(false)

  useEffect(() => {
    fetch('/api/integrations/shopify').then(r => r.ok ? r.json() : null).then(d => d && setShopify(d)).catch(() => {})
    fetch('/api/integrations/woocommerce').then(r => r.ok ? r.json() : null).then(d => d && setWoo(d)).catch(() => {})
    fetchApiKeys()
  }, [])

  const fetchApiKeys = () => {
    setLoadingKeys(true)
    fetch('/api/company/api-keys')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setApiKeys(d.data ?? []) })
      .catch(() => {})
      .finally(() => setLoadingKeys(false))
  }

  const connectShopify = async () => {
    setSavingShopify(true)
    const res = await fetch('/api/integrations/shopify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(shopifyForm) })
    setSavingShopify(false)
    if (res.ok) { toast.success('Shopify connecté !'); setShopify({ isActive: true, config: { shopDomain: shopifyForm.shopDomain } }) }
    else { const e = await res.json(); toast.error(e.error ?? 'Erreur') }
  }

  const connectWoo = async () => {
    setSavingWoo(true)
    const res = await fetch('/api/integrations/woocommerce', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(wooForm) })
    setSavingWoo(false)
    if (res.ok) { toast.success('WooCommerce connecté !'); setWoo({ isActive: true, config: { siteUrl: wooForm.siteUrl } }) }
    else { const e = await res.json(); toast.error(e.error ?? 'Erreur') }
  }

  const createApiKey = async () => {
    if (!newKeyName.trim()) return
    setCreatingKey(true)
    const res = await fetch('/api/company/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newKeyName, scopes: newKeyScopes }),
    })
    setCreatingKey(false)
    if (res.ok) {
      const d = await res.json()
      setRevealedKey(d.data?.rawKey ?? null)
      fetchApiKeys()
      setNewKeyName('')
    } else {
      const e = await res.json()
      toast.error(e.error ?? 'Erreur lors de la création')
    }
  }

  const revokeKey = async (id: string, name: string) => {
    if (!confirm(`Révoquer la clé "${name}" ? Cette action est irréversible.`)) return
    const res = await fetch(`/api/company/api-keys/${id}`, { method: 'DELETE' })
    if (res.ok) { toast.success('Clé révoquée'); fetchApiKeys() }
    else toast.error('Erreur lors de la révocation')
  }

  const copyKey = () => {
    if (!revealedKey) return
    navigator.clipboard.writeText(revealedKey)
    setCopiedKey(true)
    setTimeout(() => setCopiedKey(false), 2000)
  }

  const planLimit = PLAN_LIMITS[plan] ?? PLAN_LIMITS.TRIAL

  return (
    <div className="p-4 md:p-6 max-w-3xl space-y-6">
      <Breadcrumb items={[{ label: 'Paramètres', href: '/dashboard/settings' }, { label: 'Intégrations' }]} />
      <div className="flex items-center gap-3">
        <Link href="/dashboard/settings"><Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">Intégrations</h1>
          <p className="text-muted-foreground text-sm">Connectez vos outils et accédez à l'API</p>
        </div>
      </div>

      {/* API YelhaERP */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yelha-500 rounded-xl flex items-center justify-center"><Code2 className="h-5 w-5 text-white" /></div>
              <div>
                <CardTitle className="text-base">API YelhaERP</CardTitle>
                <CardDescription>Accès programmatique à vos données via REST API</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${planLimit.color}`}>{planLimit.label}</span>
              <Link href="/api-docs" target="_blank">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <FileText className="w-3.5 h-3.5" />Documentation
                  <ExternalLink className="w-3 h-3" />
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* URL de base */}
          <div className="bg-muted/40 rounded-lg p-3 font-mono text-sm flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Base URL :</span>
            <span className="font-semibold">{process.env.NEXT_PUBLIC_APP_URL ?? 'https://yelhaerp.vercel.app'}/api/v1</span>
          </div>

          {/* Revealed key banner */}
          {revealedKey && (
            <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
                <AlertTriangle className="w-4 h-4" />
                Copiez cette clé maintenant — elle ne sera plus affichée
              </div>
              <div className="flex items-center gap-2 bg-white border rounded-lg p-2">
                <code className="flex-1 text-xs font-mono break-all text-slate-800">{revealedKey}</code>
                <button onClick={copyKey} className="shrink-0 text-yelha-600 hover:text-yelha-700">
                  {copiedKey ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <button onClick={() => setRevealedKey(null)} className="text-xs text-amber-600 hover:underline">
                J'ai bien copié la clé ✓
              </button>
            </div>
          )}

          {/* Create key */}
          <Dialog open={dialogOpen} onOpenChange={o => { setDialogOpen(o); if (!o) setRevealedKey(null) }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" />Créer une clé API</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nouvelle clé API</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label>Nom de la clé *</Label>
                  <Input
                    value={newKeyName}
                    onChange={e => setNewKeyName(e.target.value)}
                    placeholder="ex: Mon application, ERP interne..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Permissions</Label>
                  <div className="flex gap-2">
                    {['read', 'write'].map(scope => (
                      <label key={scope} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newKeyScopes.includes(scope)}
                          onChange={e => setNewKeyScopes(prev =>
                            e.target.checked ? [...prev, scope] : prev.filter(s => s !== scope)
                          )}
                          className="rounded"
                        />
                        <span className="text-sm capitalize">{scope === 'read' ? 'Lecture (GET)' : 'Écriture (POST/PUT/DELETE)'}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {revealedKey && (
                  <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" />Copiez maintenant — non récupérable
                    </p>
                    <div className="flex items-center gap-2 bg-white border rounded p-2">
                      <code className="flex-1 text-xs font-mono break-all">{revealedKey}</code>
                      <button onClick={copyKey}>{copiedKey ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-yelha-600" />}</button>
                    </div>
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={createApiKey}
                  disabled={creatingKey || !newKeyName.trim() || newKeyScopes.length === 0}
                >
                  {creatingKey ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Key className="w-4 h-4 mr-2" />}
                  Générer la clé
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Keys list */}
          {loadingKeys ? (
            <div className="text-sm text-muted-foreground py-4 text-center">Chargement...</div>
          ) : apiKeys.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center border rounded-xl border-dashed">
              Aucune clé API — créez-en une pour commencer
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">Nom</th>
                    <th className="text-left px-4 py-2.5 font-medium">Clé</th>
                    <th className="text-left px-4 py-2.5 font-medium">Permissions</th>
                    <th className="text-left px-4 py-2.5 font-medium">Dernière utilisation</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.map(k => (
                    <tr key={k.id} className="border-t hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">{k.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{k.keyPrefix}••••</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {k.scopes.map(s => (
                            <span key={s} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${s === 'write' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString('fr-DZ') : 'Jamais'}
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => revokeKey(k.id, k.name)} className="text-destructive hover:opacity-70">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shopify */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#96bf48] rounded-xl flex items-center justify-center"><ShoppingBag className="h-5 w-5 text-white" /></div>
              <div><CardTitle className="text-base">Shopify</CardTitle><CardDescription>Importez vos commandes comme factures</CardDescription></div>
            </div>
            {shopify?.isActive && <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" />Connecté</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          {shopify?.isActive ? (
            <div className="p-3 rounded-lg bg-yelha-50 text-sm">
              <p className="font-medium text-yelha-700">Boutique : {shopify.config?.shopDomain}</p>
              {shopify.lastSync && <p className="text-muted-foreground mt-1">Dernière sync : {new Date(shopify.lastSync).toLocaleString('fr-DZ')}</p>}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2"><Label>Domaine Shopify</Label><Input placeholder="ma-boutique.myshopify.com" value={shopifyForm.shopDomain} onChange={e => setShopifyForm(f => ({...f, shopDomain: e.target.value}))} /></div>
              <div className="space-y-2"><Label>Token d'accès (Admin API)</Label><Input type="password" placeholder="shpat_..." value={shopifyForm.accessToken} onChange={e => setShopifyForm(f => ({...f, accessToken: e.target.value}))} /></div>
              <Button onClick={connectShopify} disabled={savingShopify || !shopifyForm.shopDomain || !shopifyForm.accessToken}>
                {savingShopify ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plug className="h-4 w-4 mr-2" />}Connecter Shopify
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* WooCommerce */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#7f54b3] rounded-xl flex items-center justify-center"><Globe className="h-5 w-5 text-white" /></div>
              <div><CardTitle className="text-base">WooCommerce</CardTitle><CardDescription>Synchronisation REST API (polling 15 min)</CardDescription></div>
            </div>
            {woo?.isActive && <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" />Connecté</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          {woo?.isActive ? (
            <div className="p-3 rounded-lg bg-yelha-50 text-sm">
              <p className="font-medium text-yelha-700">Site : {woo.config?.siteUrl}</p>
              {woo.lastSync && <p className="text-muted-foreground mt-1">Dernière sync : {new Date(woo.lastSync).toLocaleString('fr-DZ')}</p>}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2"><Label>URL boutique</Label><Input placeholder="https://ma-boutique.dz" value={wooForm.siteUrl} onChange={e => setWooForm(f => ({...f, siteUrl: e.target.value}))} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Consumer Key</Label><Input type="password" placeholder="ck_..." value={wooForm.consumerKey} onChange={e => setWooForm(f => ({...f, consumerKey: e.target.value}))} /></div>
                <div className="space-y-2"><Label>Consumer Secret</Label><Input type="password" placeholder="cs_..." value={wooForm.consumerSecret} onChange={e => setWooForm(f => ({...f, consumerSecret: e.target.value}))} /></div>
              </div>
              <Button onClick={connectWoo} disabled={savingWoo || !wooForm.siteUrl}>
                {savingWoo ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plug className="h-4 w-4 mr-2" />}Connecter WooCommerce
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
