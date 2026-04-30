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
import { Plus, Star } from 'lucide-react'

interface Employee { id: string; firstName: string; lastName: string; position?: string }
interface Review {
  id: string
  period: string
  score?: number
  status: string
  comments?: string
  employee: { firstName: string; lastName: string; position?: string }
  createdAt: string
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ employeeId: '', period: new Date().getFullYear() + '-H1', score: '', comments: '', goals: '' })

  const fetchData = async () => {
    const [rr, er] = await Promise.all([
      fetch('/api/hr/reviews').then(r => r.json()),
      fetch('/api/employees').then(r => r.json()),
    ])
    setReviews(rr.data ?? [])
    setEmployees(er.data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch('/api/hr/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, score: form.score ? Number(form.score) : undefined }),
    })
    setOpen(false)
    fetchData()
  }

  const renderStars = (score?: number) => {
    if (!score) return <span className="text-muted-foreground text-sm">—</span>
    const stars = Math.round(score / 20)
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} className={`w-3.5 h-3.5 ${i < stars ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground'}`} />
        ))}
        <span className="text-xs ml-1">{score}/100</span>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Breadcrumb items={[{ label: 'RH', href: '/dashboard/hr/leaves' }, { label: 'Évaluations' }]} />

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Évaluations de performance</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Nouvelle évaluation</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Créer une évaluation</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <div className="space-y-1">
                <Label>Employé *</Label>
                <Select value={form.employeeId} onValueChange={v => setForm(f => ({ ...f, employeeId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}{e.position ? ` — ${e.position}` : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Période</Label>
                  <Input value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))} placeholder="2024-H1" />
                </div>
                <div className="space-y-1">
                  <Label>Score (0-100)</Label>
                  <Input type="number" min="0" max="100" value={form.score} onChange={e => setForm(f => ({ ...f, score: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Commentaires</Label>
                <Textarea value={form.comments} onChange={e => setForm(f => ({ ...f, comments: e.target.value }))} rows={3} />
              </div>
              <div className="space-y-1">
                <Label>Objectifs</Label>
                <Textarea value={form.goals} onChange={e => setForm(f => ({ ...f, goals: e.target.value }))} rows={3} />
              </div>
              <Button type="submit" className="w-full" disabled={!form.employeeId}>Créer</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Employé</th>
              <th className="text-left px-4 py-3 font-medium">Poste</th>
              <th className="text-left px-4 py-3 font-medium">Période</th>
              <th className="text-left px-4 py-3 font-medium">Score</th>
              <th className="text-left px-4 py-3 font-medium">Statut</th>
              <th className="text-left px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Chargement...</td></tr>
            ) : reviews.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">
                <Star className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Aucune évaluation
              </td></tr>
            ) : reviews.map(r => (
              <tr key={r.id} className="border-t hover:bg-muted/20">
                <td className="px-4 py-3 font-medium">{r.employee.firstName} {r.employee.lastName}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.employee.position ?? '—'}</td>
                <td className="px-4 py-3"><Badge variant="outline">{r.period}</Badge></td>
                <td className="px-4 py-3">{renderStars(r.score)}</td>
                <td className="px-4 py-3">
                  <Badge className={r.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}>
                    {r.status === 'DRAFT' ? 'Brouillon' : r.status === 'COMPLETED' ? 'Complété' : r.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{new Date(r.createdAt).toLocaleDateString('fr-DZ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
