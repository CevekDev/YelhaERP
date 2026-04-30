'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Plus, Search, BookOpen } from 'lucide-react'
import { formatDA } from '@/lib/algerian/format'

interface Account {
  id: string
  code: string
  name: string
  class: number
  type: string
  isActive: boolean
  parentCode?: string
}

const CLASS_LABELS: Record<number, string> = {
  1: 'Classe 1 — Capitaux',
  2: 'Classe 2 — Immobilisations',
  3: 'Classe 3 — Stocks',
  4: 'Classe 4 — Tiers',
  5: 'Classe 5 — Trésorerie',
  6: 'Classe 6 — Charges',
  7: 'Classe 7 — Produits',
}

const TYPE_COLORS: Record<string, string> = {
  ACTIF: 'bg-blue-100 text-blue-700',
  PASSIF: 'bg-purple-100 text-purple-700',
  CHARGE: 'bg-red-100 text-red-700',
  PRODUIT: 'bg-green-100 text-green-700',
}

export default function PlanComptablePage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ code: '', name: '', class: '4', type: 'ACTIF', parentCode: '' })

  const fetchAccounts = async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (classFilter) params.set('class', classFilter)
    const res = await fetch(`/api/accounting/accounts?${params}`)
    const data = await res.json()
    setAccounts(data.data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchAccounts() }, [search, classFilter])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch('/api/accounting/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, class: Number(form.class), parentCode: form.parentCode || undefined }),
    })
    setOpen(false)
    fetchAccounts()
  }

  const grouped = accounts.reduce((acc, a) => {
    if (!acc[a.class]) acc[a.class] = []
    acc[a.class].push(a)
    return acc
  }, {} as Record<number, Account[]>)

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Breadcrumb items={[{ label: 'Comptabilité', href: '/dashboard/accounting' }, { label: 'Plan Comptable' }]} />

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Plan Comptable National</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Nouveau compte</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Créer un compte PCN</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Code</Label>
                  <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="512" required />
                </div>
                <div className="space-y-1">
                  <Label>Classe</Label>
                  <Select value={form.class} onValueChange={v => setForm(f => ({ ...f, class: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,7].map(c => <SelectItem key={c} value={String(c)}>{CLASS_LABELS[c]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label>Intitulé</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Banques" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIF">Actif</SelectItem>
                      <SelectItem value="PASSIF">Passif</SelectItem>
                      <SelectItem value="CHARGE">Charge</SelectItem>
                      <SelectItem value="PRODUIT">Produit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Code parent</Label>
                  <Input value={form.parentCode} onChange={e => setForm(f => ({ ...f, parentCode: e.target.value }))} placeholder="51" />
                </div>
              </div>
              <Button type="submit" className="w-full">Créer</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Rechercher un compte..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={classFilter} onValueChange={setClassFilter}>
          <SelectTrigger className="w-52"><SelectValue placeholder="Toutes les classes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Toutes les classes</SelectItem>
            {[1,2,3,4,5,6,7].map(c => <SelectItem key={c} value={String(c)}>Classe {c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement...</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).sort(([a],[b]) => Number(a)-Number(b)).map(([cls, accs]) => (
            <div key={cls}>
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-muted-foreground" />
                <h2 className="font-semibold text-sm">{CLASS_LABELS[Number(cls)]}</h2>
                <Badge variant="secondary">{accs.length}</Badge>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium w-24">Code</th>
                      <th className="text-left px-4 py-2 font-medium">Intitulé</th>
                      <th className="text-left px-4 py-2 font-medium">Type</th>
                      <th className="text-left px-4 py-2 font-medium">Parent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accs.map((acc, i) => (
                      <tr key={acc.id} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                        <td className="px-4 py-2 font-mono font-medium">{acc.code}</td>
                        <td className="px-4 py-2">{acc.name}</td>
                        <td className="px-4 py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[acc.type] ?? ''}`}>{acc.type}</span>
                        </td>
                        <td className="px-4 py-2 text-muted-foreground font-mono text-xs">{acc.parentCode ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {accounts.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Aucun compte trouvé.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
