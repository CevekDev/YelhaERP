'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ShoppingBag, Globe, Loader2, CheckCircle, Plug } from 'lucide-react'

export default function IntegrationsPage() {
  const [shopify, setShopify] = useState<{ isActive: boolean; config?: { shopDomain: string }; lastSync?: string } | null>(null)
  const [woo, setWoo] = useState<{ isActive: boolean; config?: { siteUrl: string }; lastSync?: string } | null>(null)
  const [shopifyForm, setShopifyForm] = useState({ shopDomain: '', accessToken: '' })
  const [wooForm, setWooForm] = useState({ siteUrl: '', consumerKey: '', consumerSecret: '' })
  const [savingShopify, setSavingShopify] = useState(false)
  const [savingWoo, setSavingWoo] = useState(false)

  useEffect(() => {
    fetch('/api/integrations/shopify').then(r => r.ok ? r.json() : null).then(d => d && setShopify(d)).catch(() => {})
    fetch('/api/integrations/woocommerce').then(r => r.ok ? r.json() : null).then(d => d && setWoo(d)).catch(() => {})
  }, [])

  const connectShopify = async () => {
    setSavingShopify(true)
    const res = await fetch('/api/integrations/shopify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shopifyForm),
    })
    setSavingShopify(false)
    if (res.ok) {
      toast.success('Shopify connecté avec succès !')
      setShopify({ isActive: true, config: { shopDomain: shopifyForm.shopDomain } })
    } else {
      const e = await res.json()
      toast.error(e.error ?? 'Erreur de connexion')
    }
  }

  const connectWoo = async () => {
    setSavingWoo(true)
    const res = await fetch('/api/integrations/woocommerce', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(wooForm),
    })
    setSavingWoo(false)
    if (res.ok) {
      toast.success('WooCommerce connecté !')
      setWoo({ isActive: true, config: { siteUrl: wooForm.siteUrl } })
    } else {
      const e = await res.json()
      toast.error(e.error ?? 'Erreur de connexion')
    }
  }

  return (
    <div>
      <Header title="Intégrations" />
      <div className="p-6 max-w-3xl space-y-6">
        <PageHeader title="Intégrations e-commerce" description="Synchronisez vos commandes et mettez à jour votre stock automatiquement" />

        {/* Shopify */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#96bf48] rounded-xl flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-base">Shopify</CardTitle>
                  <CardDescription>Importez vos commandes Shopify comme factures</CardDescription>
                </div>
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
                <div className="space-y-2">
                  <Label>Domaine Shopify</Label>
                  <Input placeholder="ma-boutique.myshopify.com" value={shopifyForm.shopDomain} onChange={e => setShopifyForm(f => ({...f, shopDomain: e.target.value}))} />
                </div>
                <div className="space-y-2">
                  <Label>Token d'accès (Admin API)</Label>
                  <Input type="password" placeholder="shpat_..." value={shopifyForm.accessToken} onChange={e => setShopifyForm(f => ({...f, accessToken: e.target.value}))} />
                </div>
                <Button onClick={connectShopify} disabled={savingShopify || !shopifyForm.shopDomain || !shopifyForm.accessToken}>
                  {savingShopify ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plug className="h-4 w-4 mr-2" />}
                  Connecter Shopify
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
                <div className="w-10 h-10 bg-[#7f54b3] rounded-xl flex items-center justify-center">
                  <Globe className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-base">WooCommerce</CardTitle>
                  <CardDescription>Synchronisation via REST API (polling 15 min)</CardDescription>
                </div>
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
                <div className="space-y-2">
                  <Label>URL de votre boutique</Label>
                  <Input placeholder="https://ma-boutique.dz" value={wooForm.siteUrl} onChange={e => setWooForm(f => ({...f, siteUrl: e.target.value}))} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Consumer Key</Label>
                    <Input type="password" placeholder="ck_..." value={wooForm.consumerKey} onChange={e => setWooForm(f => ({...f, consumerKey: e.target.value}))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Consumer Secret</Label>
                    <Input type="password" placeholder="cs_..." value={wooForm.consumerSecret} onChange={e => setWooForm(f => ({...f, consumerSecret: e.target.value}))} />
                  </div>
                </div>
                <Button onClick={connectWoo} disabled={savingWoo || !wooForm.siteUrl}>
                  {savingWoo ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plug className="h-4 w-4 mr-2" />}
                  Connecter WooCommerce
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
