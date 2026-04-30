'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { StatCard } from '@/components/ui/stat-card'
import { formatDA } from '@/lib/algerian/format'
import { Plus, User, Building2, Euro } from 'lucide-react'
import Link from 'next/link'

interface Lead {
  id: string
  firstName?: string
  lastName: string
  company?: string
  expectedValue?: number | string
  stage: string
  assignedTo?: string
  createdAt: string
}

interface PipelineColumn {
  stage: string
  leads: Lead[]
  count: number
  totalValue: number
}

const STAGE_LABELS: Record<string, string> = {
  NEW: 'Nouveau',
  QUALIFIED: 'Qualifié',
  PROPOSAL: 'Proposition',
  NEGOTIATION: 'Négociation',
  WON: 'Gagné',
  LOST: 'Perdu',
}

const STAGE_COLORS: Record<string, string> = {
  NEW: 'bg-slate-100 border-slate-300',
  QUALIFIED: 'bg-blue-50 border-blue-200',
  PROPOSAL: 'bg-amber-50 border-amber-200',
  NEGOTIATION: 'bg-purple-50 border-purple-200',
  WON: 'bg-green-50 border-green-200',
  LOST: 'bg-red-50 border-red-200',
}

const STAGE_HEADER: Record<string, string> = {
  NEW: 'bg-slate-500',
  QUALIFIED: 'bg-blue-500',
  PROPOSAL: 'bg-amber-500',
  NEGOTIATION: 'bg-purple-500',
  WON: 'bg-green-500',
  LOST: 'bg-red-500',
}

export default function PipelinePage() {
  const [pipeline, setPipeline] = useState<PipelineColumn[]>([])
  const [totalLeads, setTotalLeads] = useState(0)
  const [totalValue, setTotalValue] = useState(0)
  const [open, setOpen] = useState(false)
  const [dragging, setDragging] = useState<string | null>(null)
  const [form, setForm] = useState({ firstName: '', lastName: '', company: '', email: '', phone: '', source: 'MANUAL', expectedValue: '' })

  const fetchPipeline = async () => {
    const res = await fetch('/api/crm/pipeline')
    const data = await res.json()
    setPipeline(data.data?.pipeline ?? [])
    setTotalLeads(data.data?.totalLeads ?? 0)
    setTotalValue(data.data?.totalValue ?? 0)
  }

  useEffect(() => { fetchPipeline() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch('/api/crm/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, expectedValue: form.expectedValue ? Number(form.expectedValue) : undefined }),
    })
    setOpen(false)
    fetchPipeline()
  }

  const handleDragStart = (leadId: string) => setDragging(leadId)
  const handleDrop = async (targetStage: string) => {
    if (!dragging) return
    await fetch(`/api/crm/leads/${dragging}/stage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage: targetStage }),
    })
    setDragging(null)
    fetchPipeline()
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Breadcrumb items={[{ label: 'CRM', href: '/dashboard/crm/pipeline' }, { label: 'Pipeline' }]} />

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Pipeline Commercial</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Nouveau lead</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouveau lead</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Prénom</Label>
                  <Input value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Nom *</Label>
                  <Input value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} required />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Société</Label>
                <Input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Téléphone</Label>
                  <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Source</Label>
                  <Select value={form.source} onValueChange={v => setForm(f => ({ ...f, source: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MANUAL">Manuel</SelectItem>
                      <SelectItem value="WEBSITE">Site web</SelectItem>
                      <SelectItem value="REFERRAL">Référence</SelectItem>
                      <SelectItem value="EMAIL">Email</SelectItem>
                      <SelectItem value="PHONE">Téléphone</SelectItem>
                      <SelectItem value="SOCIAL">Réseaux sociaux</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Valeur estimée (DA)</Label>
                  <Input type="number" min="0" value={form.expectedValue} onChange={e => setForm(f => ({ ...f, expectedValue: e.target.value }))} />
                </div>
              </div>
              <Button type="submit" className="w-full">Créer le lead</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total leads" value={String(totalLeads)} />
        <StatCard label="Valeur pipeline" value={formatDA(totalValue)} color="blue" />
        <StatCard label="Leads gagnés" value={String(pipeline.find(p => p.stage === 'WON')?.count ?? 0)} color="green" />
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '60vh' }}>
        {pipeline.map(col => (
          <div
            key={col.stage}
            className="flex-shrink-0 w-64 flex flex-col"
            onDragOver={e => e.preventDefault()}
            onDrop={() => handleDrop(col.stage)}
          >
            <div className={`${STAGE_HEADER[col.stage]} text-white rounded-t-lg px-3 py-2 flex items-center justify-between`}>
              <span className="font-medium text-sm">{STAGE_LABELS[col.stage]}</span>
              <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-full">{col.count}</span>
            </div>
            <div className={`flex-1 border border-t-0 rounded-b-lg p-2 space-y-2 min-h-40 ${STAGE_COLORS[col.stage]}`}>
              {col.leads.map(lead => (
                <Link key={lead.id} href={`/dashboard/crm/leads/${lead.id}`}>
                  <div
                    draggable
                    onDragStart={() => handleDragStart(lead.id)}
                    className="bg-white border rounded-lg p-3 cursor-grab hover:shadow-md transition-shadow active:cursor-grabbing"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm font-medium truncate">
                        {[lead.firstName, lead.lastName].filter(Boolean).join(' ')}
                      </span>
                    </div>
                    {lead.company && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Building2 className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{lead.company}</span>
                      </div>
                    )}
                    {lead.expectedValue && (
                      <div className="mt-2 text-xs font-medium text-right da-amount">
                        {formatDA(Number(lead.expectedValue))}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
              {col.leads.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-xs">Aucun lead</div>
              )}
            </div>
            {col.totalValue > 0 && (
              <div className="text-xs text-center py-1 text-muted-foreground da-amount">
                {formatDA(col.totalValue)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
