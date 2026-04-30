'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Plus, User } from 'lucide-react'

interface JobPosting {
  id: string
  title: string
  department?: string
  status: string
  _count: { applications: number }
  createdAt: string
}

interface Application {
  id: string
  firstName: string
  lastName: string
  email: string
  stage: string
  postingId: string
  createdAt: string
}

const STAGES = ['NEW', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED']
const STAGE_LABELS: Record<string, string> = {
  NEW: 'Nouveau', SCREENING: 'Pré-sélection', INTERVIEW: 'Entretien',
  OFFER: 'Offre', HIRED: 'Embauché', REJECTED: 'Rejeté',
}
const STAGE_COLORS: Record<string, string> = {
  NEW: 'bg-slate-500', SCREENING: 'bg-blue-500', INTERVIEW: 'bg-amber-500',
  OFFER: 'bg-purple-500', HIRED: 'bg-green-500', REJECTED: 'bg-red-500',
}
const STAGE_BG: Record<string, string> = {
  NEW: 'bg-slate-50 border-slate-200', SCREENING: 'bg-blue-50 border-blue-200',
  INTERVIEW: 'bg-amber-50 border-amber-200', OFFER: 'bg-purple-50 border-purple-200',
  HIRED: 'bg-green-50 border-green-200', REJECTED: 'bg-red-50 border-red-200',
}

export default function RecruitmentPage() {
  const [postings, setPostings] = useState<JobPosting[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [selectedPosting, setSelectedPosting] = useState<string | 'all'>('all')
  const [dragging, setDragging] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', department: '', description: '' })

  const fetchData = async () => {
    const [pr, ar] = await Promise.all([
      fetch('/api/hr/job-postings').then(r => r.json()),
      fetch('/api/hr/leave-requests').then(r => r.json()),
    ])
    setPostings(pr.data ?? [])
    if (pr.data?.length > 0) {
      const appsRes = await Promise.all(
        (pr.data as JobPosting[]).map(p => fetch(`/api/hr/job-postings/${p.id}/applications`).then(r => r.json()))
      )
      const allApps = appsRes.flatMap((r, i) => (r.data ?? []).map((a: Application) => ({ ...a, postingId: (pr.data as JobPosting[])[i].id })))
      setApplications(allApps)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleCreatePosting = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch('/api/hr/job-postings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setOpen(false)
    fetchData()
  }

  const moveApplication = async (appId: string, stage: string) => {
    await fetch(`/api/hr/applications/${appId}/stage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    })
    setDragging(null)
    fetchData()
  }

  const filteredApps = selectedPosting === 'all'
    ? applications
    : applications.filter(a => a.postingId === selectedPosting)

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Breadcrumb items={[{ label: 'RH', href: '/dashboard/hr/leaves' }, { label: 'Recrutement' }]} />

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Pipeline de Recrutement</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Nouvelle offre</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Créer une offre d'emploi</DialogTitle></DialogHeader>
            <form onSubmit={handleCreatePosting} className="space-y-4 mt-2">
              <div className="space-y-1">
                <Label>Titre du poste *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <Label>Département</Label>
                <Input value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4} />
              </div>
              <Button type="submit" className="w-full">Publier l'offre</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedPosting('all')}
          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${selectedPosting === 'all' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}
        >
          Toutes les offres ({applications.length})
        </button>
        {postings.map(p => (
          <button
            key={p.id}
            onClick={() => setSelectedPosting(p.id)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${selectedPosting === p.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}
          >
            {p.title} ({p._count.applications})
          </button>
        ))}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '60vh' }}>
        {STAGES.map(stage => {
          const stageApps = filteredApps.filter(a => a.stage === stage)
          return (
            <div
              key={stage}
              className="flex-shrink-0 w-56 flex flex-col"
              onDragOver={e => e.preventDefault()}
              onDrop={() => dragging && moveApplication(dragging, stage)}
            >
              <div className={`${STAGE_COLORS[stage]} text-white rounded-t-lg px-3 py-2 flex items-center justify-between`}>
                <span className="font-medium text-sm">{STAGE_LABELS[stage]}</span>
                <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-full">{stageApps.length}</span>
              </div>
              <div className={`flex-1 border border-t-0 rounded-b-lg p-2 space-y-2 min-h-40 ${STAGE_BG[stage]}`}>
                {stageApps.map(app => (
                  <div
                    key={app.id}
                    draggable
                    onDragStart={() => setDragging(app.id)}
                    className="bg-white border rounded-lg p-3 cursor-grab hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium">{app.firstName} {app.lastName}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{app.email}</div>
                    <div className="text-xs text-muted-foreground">{new Date(app.createdAt).toLocaleDateString('fr-DZ')}</div>
                  </div>
                ))}
                {stageApps.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-xs">Aucun candidat</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
