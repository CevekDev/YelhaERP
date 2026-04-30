'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Building2, Users, FileText, TrendingUp, ShieldCheck, Search, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Company {
  id: string
  name: string
  plan: string
  trialEndsAt: string | null
  createdAt: string
  _count: { users: number; invoices: number }
}

const PLAN_COLORS: Record<string, string> = {
  TRIAL:   'bg-gray-100 text-gray-600',
  STARTER: 'bg-blue-100 text-blue-700',
  PRO:     'bg-yelha-100 text-yelha-700',
  AGENCY:  'bg-purple-100 text-purple-700',
}

export default function AdminPanel() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [companies, setCompanies] = useState<Company[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const isOwner = session?.user?.role === 'OWNER'

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status === 'authenticated' && !isOwner) { router.push('/dashboard'); return }
    if (status === 'authenticated' && isOwner) fetchCompanies()
  }, [status, isOwner])

  const fetchCompanies = async () => {
    setLoading(true)
    const res = await fetch('/api/admin/companies')
    if (res.ok) {
      const d = await res.json()
      setCompanies(d.data?.companies ?? [])
      setTotal(d.data?.total ?? 0)
    }
    setLoading(false)
  }

  const updatePlan = async (companyId: string, plan: string) => {
    setUpdatingId(companyId)
    const res = await fetch('/api/admin/companies', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, plan }),
    })
    setUpdatingId(null)
    if (res.ok) {
      toast.success('Plan mis à jour')
      setCompanies(prev => prev.map(c => c.id === companyId ? { ...c, plan } : c))
    } else {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total,
    trial:   companies.filter(c => c.plan === 'TRIAL').length,
    paid:    companies.filter(c => c.plan !== 'TRIAL').length,
    users:   companies.reduce((s, c) => s + c._count.users, 0),
    invoices: companies.reduce((s, c) => s + c._count.invoices, 0),
  }

  if (status === 'loading' || (status === 'authenticated' && !isOwner)) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Chargement...</div>
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-yelha-500 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Panneau Admin — YelhaERP</h1>
            <p className="text-xs text-muted-foreground">Gestion des entreprises clientes</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{session?.user?.email}</span>
          <Button variant="outline" size="sm" onClick={fetchCompanies}><RefreshCw className="w-3.5 h-3.5" /></Button>
        </div>
      </div>

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { icon: Building2, label: 'Entreprises', value: stats.total, color: 'text-blue-600' },
            { icon: TrendingUp, label: 'En essai', value: stats.trial, color: 'text-orange-500' },
            { icon: ShieldCheck, label: 'Abonnés', value: stats.paid, color: 'text-green-600' },
            { icon: Users, label: 'Utilisateurs', value: stats.users, color: 'text-purple-600' },
            { icon: FileText, label: 'Factures', value: stats.invoices, color: 'text-yelha-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border p-4 flex items-center gap-3">
              <s.icon className={`w-8 h-8 ${s.color}`} />
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="p-4 border-b flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une entreprise..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <span className="text-sm text-muted-foreground">{filtered.length} entreprise{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          {loading ? (
            <div className="py-16 text-center text-muted-foreground">Chargement...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Entreprise</th>
                    <th className="text-left px-4 py-3 font-medium">Plan</th>
                    <th className="text-left px-4 py-3 font-medium">Utilisateurs</th>
                    <th className="text-left px-4 py-3 font-medium">Factures</th>
                    <th className="text-left px-4 py-3 font-medium">Inscrit le</th>
                    <th className="text-left px-4 py-3 font-medium">Changer plan</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => (
                    <tr key={c.id} className="border-t hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <p className="font-medium">{c.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{c.id.slice(0, 8)}…</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${PLAN_COLORS[c.plan] ?? 'bg-gray-100 text-gray-600'}`}>
                          {c.plan}
                        </span>
                        {c.trialEndsAt && c.plan === 'TRIAL' && (
                          <p className="text-[10px] text-orange-500 mt-0.5">
                            Expire {new Date(c.trialEndsAt).toLocaleDateString('fr-DZ')}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{c._count.users}</td>
                      <td className="px-4 py-3 text-muted-foreground">{c._count.invoices}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(c.createdAt).toLocaleDateString('fr-DZ')}</td>
                      <td className="px-4 py-3">
                        <Select
                          value={c.plan}
                          onValueChange={plan => updatePlan(c.id, plan)}
                          disabled={updatingId === c.id}
                        >
                          <SelectTrigger className="h-8 w-32 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="TRIAL">TRIAL</SelectItem>
                            <SelectItem value="STARTER">STARTER</SelectItem>
                            <SelectItem value="PRO">PRO</SelectItem>
                            <SelectItem value="AGENCY">AGENCY</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">Aucune entreprise trouvée</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
