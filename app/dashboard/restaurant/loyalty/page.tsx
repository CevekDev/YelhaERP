'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatDA } from '@/lib/algerian/format'
import { toast } from 'sonner'
import { Loader2, Plus, Search, Star, Users, Gift, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { PageHeader } from '@/components/ui/page-header'

// ── Types ──────────────────────────────────────────────────────────────────────
type Tier = 'STANDARD' | 'SILVER' | 'GOLD' | 'VIP'

type LoyaltyMember = {
  id: string
  name: string
  phone?: string | null
  email?: string | null
  points: number
  tier: Tier
  totalSpent: number
  lastVisit?: string | null
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const TIER_BADGE: Record<Tier, { label: string; className: string }> = {
  STANDARD: { label: 'Standard', className: 'bg-gray-100 text-gray-600' },
  SILVER:   { label: 'Argent',   className: 'bg-gray-300 text-gray-700' },
  GOLD:     { label: 'Or',       className: 'bg-amber-400 text-amber-900' },
  VIP:      { label: 'VIP',      className: 'bg-purple-500 text-white' },
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-DZ', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function LoyaltyPage() {
  const [members, setMembers] = useState<LoyaltyMember[]>([])
  const [loading, setLoading] = useState(true)

  // Phone lookup
  const [lookupPhone, setLookupPhone] = useState('')
  const [lookupResult, setLookupResult] = useState<LoyaltyMember | null | 'not_found'>(null)
  const [looking, setLooking] = useState(false)

  // Add member modal
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '' })
  const [saving, setSaving] = useState(false)

  const fetchMembers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/restaurant/loyalty')
      const data = await res.json()
      setMembers(data.data ?? [])
    } catch {
      toast.error('Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  async function lookupByPhone() {
    if (!lookupPhone.trim()) { toast.error('Entrez un numéro'); return }
    setLooking(true)
    setLookupResult(null)
    try {
      const res = await fetch(`/api/restaurant/loyalty/lookup?phone=${encodeURIComponent(lookupPhone)}`)
      const data = await res.json()
      if (res.status === 404 || !data.data) {
        setLookupResult('not_found')
      } else {
        setLookupResult(data.data)
      }
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setLooking(false)
    }
  }

  async function addMember() {
    if (!form.name.trim()) { toast.error('Nom requis'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/restaurant/loyalty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone || null,
          email: form.email || null,
        }),
      })
      if (!res.ok) { toast.error('Erreur'); return }
      toast.success('Membre ajouté')
      setShowModal(false)
      setForm({ name: '', phone: '', email: '' })
      fetchMembers()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSaving(false)
    }
  }

  // ── KPIs ──
  const totalMembers = members.length
  const totalPoints = members.reduce((s, m) => s + m.points, 0)
  const totalSpent = members.reduce((s, m) => s + m.totalSpent, 0)
  const vipCount = members.filter(m => m.tier === 'VIP').length

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title="Restaurant — Fidélité"
        description="Programme de fidélisation clients"
        actionLabel="Ajouter un membre"
        onAction={() => setShowModal(true)}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{totalMembers}</p>
                <p className="text-xs text-muted-foreground">Total membres</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Star className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold">{totalPoints.toLocaleString('fr-DZ')}</p>
                <p className="text-xs text-muted-foreground">Points distribués</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold da-amount">{formatDA(totalSpent)}</p>
                <p className="text-xs text-muted-foreground">CA fidélité</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Gift className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{vipCount}</p>
                <p className="text-xs text-muted-foreground">Membres VIP</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Phone lookup */}
      <div className="flex gap-2 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={lookupPhone}
            onChange={e => setLookupPhone(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && lookupByPhone()}
            placeholder="Rechercher par téléphone..."
            className="pl-9"
            type="tel"
          />
        </div>
        <Button variant="outline" onClick={lookupByPhone} disabled={looking}>
          {looking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Rechercher'}
        </Button>
        {lookupResult && (
          <Button variant="ghost" size="sm" onClick={() => { setLookupResult(null); setLookupPhone('') }}>
            ×
          </Button>
        )}
      </div>

      {/* Lookup result */}
      {lookupResult === 'not_found' && (
        <div className="bg-muted/50 border rounded-lg px-4 py-3 mb-4 text-sm text-muted-foreground">
          Aucun membre trouvé pour ce numéro.
          <Button size="sm" variant="link" className="ml-2" onClick={() => {
            setForm(f => ({ ...f, phone: lookupPhone }))
            setShowModal(true)
          }}>
            Créer un profil
          </Button>
        </div>
      )}
      {lookupResult && lookupResult !== 'not_found' && (
        <div className="bg-card border rounded-xl px-4 py-4 mb-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-lg">{lookupResult.name}</p>
              <p className="text-sm text-muted-foreground">{lookupResult.phone}</p>
            </div>
            <div className="text-right">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${TIER_BADGE[lookupResult.tier].className}`}>
                {TIER_BADGE[lookupResult.tier].label}
              </span>
              <p className="text-2xl font-bold mt-1">{lookupResult.points} pts</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t text-sm">
            <div>
              <span className="text-muted-foreground">Total dépensé</span>
              <p className="font-semibold da-amount">{formatDA(lookupResult.totalSpent)}</p>
            </div>
            {lookupResult.lastVisit && (
              <div>
                <span className="text-muted-foreground">Dernière visite</span>
                <p className="font-semibold">{fmtDate(lookupResult.lastVisit)}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Members table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Points</TableHead>
              <TableHead>Niveau</TableHead>
              <TableHead>Total dépensé</TableHead>
              <TableHead>Dernière visite</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Aucun membre inscrit
                </TableCell>
              </TableRow>
            ) : members.map(member => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">{member.name}</TableCell>
                <TableCell className="text-muted-foreground">{member.phone ?? '—'}</TableCell>
                <TableCell>
                  <span className="font-bold flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-amber-500" />
                    {member.points.toLocaleString('fr-DZ')}
                  </span>
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${TIER_BADGE[member.tier].className}`}>
                    {TIER_BADGE[member.tier].label}
                  </span>
                </TableCell>
                <TableCell className="font-semibold da-amount">{formatDA(member.totalSpent)}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {member.lastVisit ? fmtDate(member.lastVisit) : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add member modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau membre fidélité</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nom *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Prénom et nom"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="0555 000 000"
                type="tel"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="client@email.com"
                type="email"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button onClick={addMember} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Créer le profil'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
