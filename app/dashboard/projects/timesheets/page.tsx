'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Clock } from 'lucide-react'

interface Project { id: string; name: string }
interface TimeLog {
  id: string
  date: string
  hours: number | string
  description?: string
  billable: boolean
  project: { name: string }
  task?: { title: string }
}

const DAYS_OF_WEEK = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

function getWeekDates(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(d.setDate(diff))
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(monday)
    dd.setDate(monday.getDate() + i)
    return dd
  })
}

export default function TimesheetsPage() {
  const [logs, setLogs] = useState<TimeLog[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ projectId: '', date: new Date().toISOString().split('T')[0], hours: 1, description: '', billable: true })

  const weekDates = getWeekDates(currentWeek)
  const from = weekDates[0].toISOString().split('T')[0]
  const to = weekDates[6].toISOString().split('T')[0]

  const fetchData = async () => {
    const [lr, pr] = await Promise.all([
      fetch(`/api/time-logs?from=${from}&to=${to}`).then(r => r.json()),
      fetch('/api/projects').then(r => r.json()),
    ])
    setLogs(lr.data ?? [])
    setProjects(pr.data ?? [])
  }

  useEffect(() => { fetchData() }, [from, to])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch('/api/time-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setOpen(false)
    fetchData()
  }

  const totalHours = logs.reduce((s, l) => s + Number(l.hours), 0)

  const getLogsForDay = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return logs.filter(l => l.date.startsWith(dateStr))
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Breadcrumb items={[{ label: 'Projets', href: '/dashboard/projects' }, { label: 'Feuilles de temps' }]} />

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Feuilles de temps</h1>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => setCurrentWeek(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })}>
            ← Semaine préc.
          </Button>
          <span className="text-sm font-medium">
            {weekDates[0].toLocaleDateString('fr-DZ', { day: '2-digit', month: 'short' })} —{' '}
            {weekDates[6].toLocaleDateString('fr-DZ', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
          <Button variant="outline" onClick={() => setCurrentWeek(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })}>
            Semaine suiv. →
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Saisir</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Saisir du temps</DialogTitle></DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-2">
                <div className="space-y-1">
                  <Label>Projet *</Label>
                  <Select value={form.projectId} onValueChange={v => setForm(f => ({ ...f, projectId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                    <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Date *</Label>
                    <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
                  </div>
                  <div className="space-y-1">
                    <Label>Heures *</Label>
                    <Input type="number" min="0.25" max="24" step="0.25" value={form.hours} onChange={e => setForm(f => ({ ...f, hours: Number(e.target.value) }))} required />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Description</Label>
                  <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <Button type="submit" className="w-full">Enregistrer</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 border-b">
          {weekDates.map((d, i) => {
            const dayLogs = getLogsForDay(d)
            const dayHours = dayLogs.reduce((s, l) => s + Number(l.hours), 0)
            const isToday = d.toDateString() === new Date().toDateString()
            return (
              <div key={i} className={`p-3 text-center border-r last:border-r-0 ${isToday ? 'bg-primary/5' : ''}`}>
                <div className={`text-xs font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>{DAYS_OF_WEEK[i]}</div>
                <div className={`text-sm font-semibold ${isToday ? 'text-primary' : ''}`}>{d.getDate()}</div>
                {dayHours > 0 && (
                  <div className="text-xs mt-1 font-mono text-muted-foreground">{dayHours}h</div>
                )}
              </div>
            )
          })}
        </div>
        <div className="grid grid-cols-7 min-h-40">
          {weekDates.map((d, i) => {
            const dayLogs = getLogsForDay(d)
            return (
              <div key={i} className="p-2 border-r last:border-r-0 space-y-1.5">
                {dayLogs.map(log => (
                  <div key={log.id} className={`text-xs rounded p-1.5 ${log.billable ? 'bg-blue-50 border border-blue-100' : 'bg-muted border'}`}>
                    <div className="font-medium truncate">{log.project.name}</div>
                    <div className="font-mono">{Number(log.hours)}h</div>
                    {log.description && <div className="text-muted-foreground truncate">{log.description}</div>}
                  </div>
                ))}
              </div>
            )
          })}
        </div>
        <div className="border-t px-4 py-3 flex items-center justify-between bg-muted/20">
          <span className="text-sm text-muted-foreground">Total semaine</span>
          <div className="flex items-center gap-1 font-semibold">
            <Clock className="w-4 h-4" />
            {totalHours}h
          </div>
        </div>
      </div>
    </div>
  )
}
