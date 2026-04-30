'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { AutoStatusBadge } from '@/components/ui/status-badge'
import { StatCard } from '@/components/ui/stat-card'
import { formatDA } from '@/lib/algerian/format'
import { Plus, FolderOpen, CheckSquare, Clock } from 'lucide-react'
import Link from 'next/link'

interface Client { id: string; name: string }
interface Project {
  id: string
  name: string
  status: string
  budget?: number | string
  startDate?: string
  endDate?: string
  client?: { name: string }
  _count: { tasks: number; timeLogs: number }
  createdAt: string
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', clientId: '', description: '', budget: '', startDate: '', endDate: '' })

  const fetchData = async () => {
    const [pr, cr] = await Promise.all([
      fetch('/api/projects').then(r => r.json()),
      fetch('/api/clients').then(r => r.json()),
    ])
    setProjects(pr.data ?? [])
    setClients(cr.data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        clientId: form.clientId || undefined,
        budget: form.budget ? Number(form.budget) : undefined,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      }),
    })
    setOpen(false)
    fetchData()
  }

  const active = projects.filter(p => p.status === 'ACTIVE').length
  const totalBudget = projects.reduce((s, p) => s + Number(p.budget ?? 0), 0)
  const totalTasks = projects.reduce((s, p) => s + p._count.tasks, 0)
  const totalHours = projects.reduce((s, p) => s + p._count.timeLogs, 0)

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Breadcrumb items={[{ label: 'Projets', href: '/dashboard/projects' }]} />

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Projets</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Nouveau projet</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Créer un projet</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <div className="space-y-1">
                <Label>Nom du projet *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <Label>Client</Label>
                <Select value={form.clientId} onValueChange={v => setForm(f => ({ ...f, clientId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Aucun client" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Aucun client</SelectItem>
                    {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label>Budget (DA)</Label>
                  <Input type="number" min="0" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Début</Label>
                  <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Fin</Label>
                  <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
              <Button type="submit" className="w-full">Créer</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Projets actifs" value={String(active)} color="blue" />
        <StatCard label="Budget total" value={formatDA(totalBudget)} color="green" />
        <StatCard label="Tâches" value={String(totalTasks)} icon={CheckSquare} />
        <StatCard label="Saisies temps" value={String(totalHours)} icon={Clock} />
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Chargement...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Aucun projet</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {projects.map(project => (
            <Link key={project.id} href={`/dashboard/projects/${project.id}`}>
              <div className="border rounded-lg p-4 hover:shadow-md transition-shadow bg-card">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{project.name}</div>
                    {project.client && <div className="text-sm text-muted-foreground">{project.client.name}</div>}
                    <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                      <span>{project._count.tasks} tâche{project._count.tasks > 1 ? 's' : ''}</span>
                      <span>{project._count.timeLogs} saisie{project._count.timeLogs > 1 ? 's' : ''}</span>
                      {project.startDate && <span>Début: {new Date(project.startDate).toLocaleDateString('fr-DZ')}</span>}
                      {project.endDate && <span>Fin: {new Date(project.endDate).toLocaleDateString('fr-DZ')}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <AutoStatusBadge status={project.status} />
                    {project.budget && (
                      <div className="text-sm font-mono da-amount text-muted-foreground">{formatDA(Number(project.budget))}</div>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
