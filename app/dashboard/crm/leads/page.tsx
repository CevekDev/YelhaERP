'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { formatDA } from '@/lib/algerian/format'
import { Search, User, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface Lead {
  id: string
  firstName?: string
  lastName: string
  company?: string
  email?: string
  phone?: string
  source: string
  stage: string
  score: number
  expectedValue?: number | string
  expectedClose?: string
  createdAt: string
}

const STAGE_COLORS: Record<string, string> = {
  NEW: 'bg-slate-100 text-slate-700',
  QUALIFIED: 'bg-blue-100 text-blue-700',
  PROPOSAL: 'bg-amber-100 text-amber-700',
  NEGOTIATION: 'bg-purple-100 text-purple-700',
  WON: 'bg-green-100 text-green-700',
  LOST: 'bg-red-100 text-red-700',
}

const STAGE_LABELS: Record<string, string> = {
  NEW: 'Nouveau', QUALIFIED: 'Qualifié', PROPOSAL: 'Proposition',
  NEGOTIATION: 'Négociation', WON: 'Gagné', LOST: 'Perdu',
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [stage, setStage] = useState('')
  const [loading, setLoading] = useState(true)
  const limit = 20

  const fetchLeads = async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (search) params.set('search', search)
    if (stage) params.set('stage', stage)
    const res = await fetch(`/api/crm/leads?${params}`)
    const data = await res.json()
    setLeads(data.data?.leads ?? [])
    setTotal(data.data?.total ?? 0)
    setLoading(false)
  }

  useEffect(() => { fetchLeads() }, [page, search, stage])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Breadcrumb items={[{ label: 'CRM', href: '/dashboard/crm/pipeline' }, { label: 'Leads' }]} />

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Leads ({total})</h1>
        <Link href="/dashboard/crm/pipeline">
          <Button variant="outline">Vue Kanban</Button>
        </Link>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={stage} onValueChange={setStage}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Tous les stades" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Tous les stades</SelectItem>
            {Object.entries(STAGE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Lead</th>
              <th className="text-left px-4 py-3 font-medium">Société</th>
              <th className="text-left px-4 py-3 font-medium">Contact</th>
              <th className="text-left px-4 py-3 font-medium">Stade</th>
              <th className="text-right px-4 py-3 font-medium">Valeur</th>
              <th className="text-left px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Chargement...</td></tr>
            ) : leads.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">
                <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Aucun lead trouvé
              </td></tr>
            ) : leads.map(lead => (
              <tr key={lead.id} className="border-t hover:bg-muted/20">
                <td className="px-4 py-3">
                  <Link href={`/dashboard/crm/leads/${lead.id}`} className="font-medium hover:underline">
                    {[lead.firstName, lead.lastName].filter(Boolean).join(' ')}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{lead.company ?? '—'}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {lead.email && <div>{lead.email}</div>}
                  {lead.phone && <div>{lead.phone}</div>}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STAGE_COLORS[lead.stage] ?? ''}`}>
                    {STAGE_LABELS[lead.stage] ?? lead.stage}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono da-amount">
                  {lead.expectedValue ? formatDA(Number(lead.expectedValue)) : '—'}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {new Date(lead.createdAt).toLocaleDateString('fr-DZ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{total} lead{total > 1 ? 's' : ''}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm py-1.5 px-3 border rounded-md">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
