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
import { Plus, CheckCircle, XCircle } from 'lucide-react'

interface LeaveType { id: string; name: string; maxDays: number }
interface LeaveRequest {
  id: string
  status: string
  startDate: string
  endDate: string
  days: number
  reason?: string
  leaveType: { name: string }
  employee: { firstName: string; lastName: string }
}

export default function LeavesPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([])
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ leaveTypeId: '', startDate: '', endDate: '', reason: '' })
  const [isHR, setIsHR] = useState(false)

  const fetchData = async () => {
    const [lr, ltr] = await Promise.all([
      fetch('/api/hr/leave-requests').then(r => r.json()),
      fetch('/api/hr/leave-types').then(r => r.json()),
    ])
    setRequests(lr.data ?? [])
    setLeaveTypes(ltr.data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    await fetch('/api/hr/leave-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setOpen(false)
    fetchData()
  }

  const handleApprove = async (id: string) => {
    await fetch(`/api/hr/leave-requests/${id}/approve`, { method: 'POST' })
    fetchData()
  }

  const handleReject = async (id: string) => {
    await fetch(`/api/hr/leave-requests/${id}/reject`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: 'Refusé' }) })
    fetchData()
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Breadcrumb items={[{ label: 'RH', href: '/dashboard/hr/leaves' }, { label: 'Congés' }]} />

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Demandes de congé</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Nouvelle demande</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Demande de congé</DialogTitle></DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-2">
              <div className="space-y-1">
                <Label>Type de congé</Label>
                <Select value={form.leaveTypeId} onValueChange={v => setForm(f => ({ ...f, leaveTypeId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map(lt => <SelectItem key={lt.id} value={lt.id}>{lt.name} ({lt.maxDays}j max)</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Date début</Label>
                  <Input type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} required />
                </div>
                <div className="space-y-1">
                  <Label>Date fin</Label>
                  <Input type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} required />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Motif</Label>
                <Textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={3} />
              </div>
              <Button type="submit" className="w-full">Soumettre</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Employé</th>
              <th className="text-left px-4 py-3 font-medium">Type</th>
              <th className="text-left px-4 py-3 font-medium">Période</th>
              <th className="text-right px-4 py-3 font-medium">Jours</th>
              <th className="text-left px-4 py-3 font-medium">Statut</th>
              <th className="text-left px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Chargement...</td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Aucune demande</td></tr>
            ) : requests.map(r => (
              <tr key={r.id} className="border-t hover:bg-muted/20">
                <td className="px-4 py-3">{r.employee.firstName} {r.employee.lastName}</td>
                <td className="px-4 py-3">{r.leaveType.name}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {new Date(r.startDate).toLocaleDateString('fr-DZ')} → {new Date(r.endDate).toLocaleDateString('fr-DZ')}
                </td>
                <td className="px-4 py-3 text-right font-medium">{r.days}j</td>
                <td className="px-4 py-3"><AutoStatusBadge status={r.status} /></td>
                <td className="px-4 py-3">
                  {r.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleApprove(r.id)} className="text-green-600 hover:opacity-70">
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleReject(r.id)} className="text-red-500 hover:opacity-70">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
