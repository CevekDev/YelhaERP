'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { AutoStatusBadge } from '@/components/ui/status-badge'
import { StatCard } from '@/components/ui/stat-card'
import { formatDA } from '@/lib/algerian/format'
import { Plus, Clock, CheckSquare, Calendar } from 'lucide-react'
import { useParams } from 'next/navigation'

interface ProjectTask {
  id: string
  title: string
  status: string
  priority: string
  assignedTo?: string
  dueDate?: string
  estimatedHours?: number | string
}

interface Project {
  id: string
  name: string
  status: string
  description?: string
  budget?: number | string
  startDate?: string
  endDate?: string
  client?: { name: string }
  tasks: ProjectTask[]
  _count: { tasks: number; timeLogs: number }
}

const TASK_STAGES = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']
const STAGE_LABELS: Record<string, string> = { TODO: 'À faire', IN_PROGRESS: 'En cours', REVIEW: 'Révision', DONE: 'Terminé' }
const STAGE_COLORS: Record<string, string> = {
  TODO: 'bg-slate-500', IN_PROGRESS: 'bg-blue-500', REVIEW: 'bg-amber-500', DONE: 'bg-green-500',
}
const STAGE_BG: Record<string, string> = {
  TODO: 'bg-slate-50 border-slate-200', IN_PROGRESS: 'bg-blue-50 border-blue-200',
  REVIEW: 'bg-amber-50 border-amber-200', DONE: 'bg-green-50 border-green-200',
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [dragging, setDragging] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', priority: 'MEDIUM', assignedTo: '', dueDate: '', estimatedHours: '' })

  const fetchProject = async () => {
    const res = await fetch(`/api/projects/${id}`)
    const data = await res.json()
    setProject(data.data)
    setLoading(false)
  }

  useEffect(() => { fetchProject() }, [id])

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch(`/api/projects/${id}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        assignedTo: form.assignedTo || undefined,
        dueDate: form.dueDate || undefined,
        estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : undefined,
      }),
    })
    setOpen(false)
    fetchProject()
  }

  const moveTask = async (taskId: string, status: string) => {
    await fetch(`/api/projects/${id}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setDragging(null)
    fetchProject()
  }

  if (loading) return <div className="p-6 text-muted-foreground">Chargement...</div>
  if (!project) return <div className="p-6 text-muted-foreground">Projet introuvable</div>

  const totalEstimated = project.tasks.reduce((s, t) => s + Number(t.estimatedHours ?? 0), 0)
  const doneTasks = project.tasks.filter(t => t.status === 'DONE').length

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Breadcrumb items={[
        { label: 'Projets', href: '/dashboard/projects' },
        { label: project.name },
      ]} />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          {project.client && <p className="text-muted-foreground">{project.client.name}</p>}
          {project.description && <p className="text-sm text-muted-foreground mt-1">{project.description}</p>}
        </div>
        <div className="flex items-center gap-3">
          <AutoStatusBadge status={project.status} />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="w-4 h-4 mr-2" />Tâche</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nouvelle tâche</DialogTitle></DialogHeader>
              <form onSubmit={handleCreateTask} className="space-y-4 mt-2">
                <div className="space-y-1">
                  <Label>Titre *</Label>
                  <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Priorité</Label>
                    <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LOW">Faible</SelectItem>
                        <SelectItem value="MEDIUM">Normale</SelectItem>
                        <SelectItem value="HIGH">Haute</SelectItem>
                        <SelectItem value="URGENT">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Heures estimées</Label>
                    <Input type="number" min="0.25" step="0.25" value={form.estimatedHours} onChange={e => setForm(f => ({ ...f, estimatedHours: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Échéance</Label>
                  <Input type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
                <Button type="submit" className="w-full">Créer</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Tâches" value={`${doneTasks}/${project._count.tasks}`} color="blue" />
        <StatCard label="Heures estimées" value={`${totalEstimated}h`} icon={Clock} />
        {project.budget && <StatCard label="Budget" value={formatDA(Number(project.budget))} color="green" />}
        {project.endDate && (
          <StatCard label="Échéance" value={new Date(project.endDate).toLocaleDateString('fr-DZ')} icon={Calendar} />
        )}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '50vh' }}>
        {TASK_STAGES.map(stage => {
          const stageTasks = project.tasks.filter(t => t.status === stage)
          return (
            <div
              key={stage}
              className="flex-shrink-0 w-64 flex flex-col"
              onDragOver={e => e.preventDefault()}
              onDrop={() => dragging && moveTask(dragging, stage)}
            >
              <div className={`${STAGE_COLORS[stage]} text-white rounded-t-lg px-3 py-2 flex items-center justify-between`}>
                <span className="font-medium text-sm">{STAGE_LABELS[stage]}</span>
                <span className="bg-white/20 text-xs px-1.5 py-0.5 rounded-full">{stageTasks.length}</span>
              </div>
              <div className={`flex-1 border border-t-0 rounded-b-lg p-2 space-y-2 min-h-40 ${STAGE_BG[stage]}`}>
                {stageTasks.map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => setDragging(task.id)}
                    className="bg-white border rounded-lg p-3 cursor-grab hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-2">
                      <CheckSquare className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span className="text-sm font-medium">{task.title}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {task.priority && task.priority !== 'MEDIUM' && (
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          task.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                          task.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>{task.priority}</span>
                      )}
                      {task.estimatedHours && (
                        <span className="text-xs text-muted-foreground ml-auto">{Number(task.estimatedHours)}h</span>
                      )}
                    </div>
                    {task.dueDate && (
                      <div className="text-xs text-muted-foreground mt-1">
                        📅 {new Date(task.dueDate).toLocaleDateString('fr-DZ')}
                      </div>
                    )}
                  </div>
                ))}
                {stageTasks.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-xs">Aucune tâche</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
