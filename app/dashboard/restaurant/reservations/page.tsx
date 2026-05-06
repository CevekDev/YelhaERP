'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Loader2, Plus, Calendar, List, Phone, User, Clock, Edit2,
  CheckCircle2, X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/ui/page-header'

// ── Types ──────────────────────────────────────────────────────────────────────
type ReservationStatus = 'CONFIRMED' | 'ARRIVED' | 'CANCELLED' | 'NO_SHOW'
type Reservation = {
  id: string
  guestName: string
  phone?: string | null
  guestCount: number
  date: string      // ISO string
  duration?: number | null
  tableId?: string | null
  tableNumber?: string | null
  notes?: string | null
  status: ReservationStatus
}
type RestaurantTable = { id: string; number: string; capacity: number }

// ── Helpers ────────────────────────────────────────────────────────────────────
const STATUS_BADGE: Record<ReservationStatus, string> = {
  CONFIRMED: 'bg-blue-100 text-blue-800',
  ARRIVED:   'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
  NO_SHOW:   'bg-red-100 text-red-600',
}
const STATUS_LABELS: Record<ReservationStatus, string> = {
  CONFIRMED: 'Confirmée',
  ARRIVED:   'Arrivée',
  CANCELLED: 'Annulée',
  NO_SHOW:   'Absent',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-DZ', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('fr-DZ', { hour: '2-digit', minute: '2-digit' })
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [filterDate, setFilterDate] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')

  // Form modal
  const [showModal, setShowModal] = useState(false)
  const [editingRes, setEditingRes] = useState<Reservation | null>(null)
  const [form, setForm] = useState({
    guestName: '',
    phone: '',
    guestCount: 2,
    date: '',
    time: '',
    duration: 90,
    tableId: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [actioning, setActioning] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterDate) params.set('date', filterDate)
      if (filterStatus !== 'ALL') params.set('status', filterStatus)
      const [resRes, tblRes] = await Promise.all([
        fetch(`/api/restaurant/reservations?${params}`),
        fetch('/api/restaurant/tables'),
      ])
      const [resData, tblData] = await Promise.all([resRes.json(), tblRes.json()])
      setReservations(resData.data ?? [])
      setTables(tblData.data ?? [])
    } catch {
      toast.error('Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [filterDate, filterStatus])

  useEffect(() => { fetchData() }, [fetchData])

  function openModal(res?: Reservation) {
    setEditingRes(res ?? null)
    if (res) {
      const d = new Date(res.date)
      setForm({
        guestName: res.guestName,
        phone: res.phone ?? '',
        guestCount: res.guestCount,
        date: d.toISOString().slice(0, 10),
        time: d.toTimeString().slice(0, 5),
        duration: res.duration ?? 90,
        tableId: res.tableId ?? '',
        notes: res.notes ?? '',
      })
    } else {
      const now = new Date()
      setForm({
        guestName: '',
        phone: '',
        guestCount: 2,
        date: now.toISOString().slice(0, 10),
        time: '19:00',
        duration: 90,
        tableId: '',
        notes: '',
      })
    }
    setShowModal(true)
  }

  async function saveReservation() {
    if (!form.guestName.trim()) { toast.error('Nom requis'); return }
    if (!form.date || !form.time) { toast.error('Date et heure requises'); return }
    setSaving(true)
    try {
      const dateTime = new Date(`${form.date}T${form.time}`).toISOString()
      const url = editingRes ? `/api/restaurant/reservations/${editingRes.id}` : '/api/restaurant/reservations'
      const method = editingRes ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestName: form.guestName,
          phone: form.phone || null,
          guestCount: Number(form.guestCount),
          date: dateTime,
          duration: Number(form.duration),
          tableId: form.tableId || null,
          notes: form.notes || null,
        }),
      })
      if (!res.ok) { toast.error('Erreur'); return }
      toast.success(editingRes ? 'Réservation modifiée' : 'Réservation créée')
      setShowModal(false)
      fetchData()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSaving(false)
    }
  }

  async function arrive(res: Reservation) {
    setActioning(res.id)
    try {
      const r = await fetch(`/api/restaurant/reservations/${res.id}/arrive`, { method: 'POST' })
      if (!r.ok) { toast.error('Erreur'); return }
      toast.success(`${res.guestName} est arrivé(e)`)
      fetchData()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setActioning(null)
    }
  }

  async function cancelReservation(res: Reservation) {
    setActioning(res.id)
    try {
      const r = await fetch(`/api/restaurant/reservations/${res.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      })
      if (!r.ok) { toast.error('Erreur'); return }
      toast.success('Réservation annulée')
      fetchData()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setActioning(null)
    }
  }

  // ── Calendar helpers ──
  function getWeekDays(): Date[] {
    const today = new Date()
    const start = new Date(today)
    start.setDate(today.getDate() - today.getDay() + 1)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }

  const weekDays = getWeekDays()

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Restaurant — Réservations</h2>
          <p className="text-muted-foreground mt-1">{reservations.length} réservation(s)</p>
        </div>
        <div className="flex gap-2">
          <Button variant={view === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setView('list')}>
            <List className="h-4 w-4 mr-1.5" />Liste
          </Button>
          <Button variant={view === 'calendar' ? 'default' : 'outline'} size="sm" onClick={() => setView('calendar')}>
            <Calendar className="h-4 w-4 mr-1.5" />Calendrier
          </Button>
          <Button size="sm" onClick={() => openModal()}>
            <Plus className="h-4 w-4 mr-1.5" />Réservation
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <Input
          type="date"
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          className="w-44"
        />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous les statuts</SelectItem>
            {(Object.entries(STATUS_LABELS) as [ReservationStatus, string][]).map(([s, l]) => (
              <SelectItem key={s} value={s}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filterDate || filterStatus !== 'ALL' ? (
          <Button variant="ghost" size="sm" onClick={() => { setFilterDate(''); setFilterStatus('ALL') }}>
            Réinitialiser
          </Button>
        ) : null}
      </div>

      {/* List view */}
      {view === 'list' && (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Date / Heure</TableHead>
                <TableHead>Couverts</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reservations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Aucune réservation
                  </TableCell>
                </TableRow>
              ) : reservations.map(res => (
                <TableRow key={res.id}>
                  <TableCell className="font-medium">{res.guestName}</TableCell>
                  <TableCell>
                    {res.phone ? (
                      <span className="flex items-center gap-1 text-sm">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        {res.phone}
                      </span>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{fmtDate(res.date)}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />{fmtTime(res.date)}
                        {res.duration && ` — ${res.duration} min`}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      {res.guestCount}
                    </span>
                  </TableCell>
                  <TableCell>{res.tableNumber ?? '—'}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[res.status]}`}>
                      {STATUS_LABELS[res.status]}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {res.status === 'CONFIRMED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => arrive(res)}
                          disabled={actioning === res.id}
                          className="text-green-600 hover:text-green-700 border-green-300"
                        >
                          {actioning === res.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <><CheckCircle2 className="h-3.5 w-3.5 mr-1" />Arrivée</>
                          }
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => openModal(res)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      {res.status === 'CONFIRMED' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => cancelReservation(res)}
                          disabled={actioning === res.id}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Calendar view — weekly grid */}
      {view === 'calendar' && (
        <div className="border rounded-xl overflow-hidden">
          <div className="grid grid-cols-7 divide-x">
            {weekDays.map(day => {
              const dayStr = day.toISOString().slice(0, 10)
              const dayRes = reservations.filter(r => r.date.slice(0, 10) === dayStr)
              const isToday = dayStr === new Date().toISOString().slice(0, 10)
              return (
                <div key={dayStr} className={`min-h-32 ${isToday ? 'bg-primary/5' : 'bg-card'}`}>
                  <div className={`px-2 py-1.5 border-b text-center ${isToday ? 'bg-primary text-primary-foreground' : 'bg-muted/50'}`}>
                    <p className="text-xs font-medium">
                      {day.toLocaleDateString('fr-DZ', { weekday: 'short' })}
                    </p>
                    <p className={`text-lg font-bold ${isToday ? '' : 'text-foreground'}`}>
                      {day.getDate()}
                    </p>
                  </div>
                  <div className="p-1 space-y-1">
                    {dayRes.map(res => (
                      <div
                        key={res.id}
                        onClick={() => openModal(res)}
                        className={`text-xs rounded px-1.5 py-1 cursor-pointer hover:opacity-80 transition-opacity ${STATUS_BADGE[res.status]}`}
                      >
                        <p className="font-semibold truncate">{fmtTime(res.date)} {res.guestName}</p>
                        <p className="text-[10px] opacity-80">{res.guestCount} pers.</p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Form Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRes ? 'Modifier la réservation' : 'Nouvelle réservation'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nom du client *</Label>
                <Input
                  value={form.guestName}
                  onChange={e => setForm(f => ({ ...f, guestName: e.target.value }))}
                  placeholder="Nom et prénom"
                />
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="0555 000 000"
                  type="tel"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Heure *</Label>
                <Input
                  type="time"
                  value={form.time}
                  onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Durée (min)</Label>
                <Input
                  type="number"
                  value={form.duration}
                  onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Couverts *</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.guestCount}
                  onChange={e => setForm(f => ({ ...f, guestCount: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Table</Label>
                <Select
                  value={form.tableId}
                  onValueChange={v => setForm(f => ({ ...f, tableId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Non assignée" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Non assignée</SelectItem>
                    {tables.map(t => (
                      <SelectItem key={t.id} value={t.id}>Table {t.number} ({t.capacity} pers.)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Allergies, occasion spéciale..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Annuler</Button>
            <Button onClick={saveReservation} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
