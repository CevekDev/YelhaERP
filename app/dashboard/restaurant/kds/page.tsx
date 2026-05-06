'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Loader2, Maximize2, CheckCircle2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

// ── Types ──────────────────────────────────────────────────────────────────────
type KdsStation = 'MAIN' | 'GRILL' | 'COLD' | 'DRINKS' | 'DESSERT'
type KdsTicketStatus = 'NEW' | 'ACCEPTED' | 'DONE'

type KdsLine = {
  id: string
  name: string
  nameAr?: string | null
  quantity: number
  notes?: string | null
}
type KdsTicket = {
  id: string
  orderNumber: string
  tableNumber?: string | null
  station: KdsStation
  status: KdsTicketStatus
  createdAt: string
  lines: KdsLine[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const STATIONS: { id: KdsStation; label: string }[] = [
  { id: 'MAIN',    label: 'Principal' },
  { id: 'GRILL',   label: 'Grill' },
  { id: 'COLD',    label: 'Froid' },
  { id: 'DRINKS',  label: 'Boissons' },
  { id: 'DESSERT', label: 'Desserts' },
]

function elapsedMin(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
}
function elapsedLabel(iso: string) {
  const m = elapsedMin(iso)
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`
}

function ticketBorderColor(iso: string) {
  const m = elapsedMin(iso)
  if (m < 5)  return 'border-green-500'
  if (m < 10) return 'border-orange-500'
  return 'border-red-500 animate-pulse'
}

// ── Component ──────────────────────────────────────────────────────────────────
export default function KdsPage() {
  const [station, setStation] = useState<KdsStation>('MAIN')
  const [tickets, setTickets] = useState<KdsTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [completing, setCompleting] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const fetchTickets = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true)
    try {
      const res = await fetch(`/api/restaurant/kds?station=${station}`)
      const data = await res.json()
      setTickets(data.data ?? [])
      setLastRefresh(new Date())
    } catch {
      if (!quiet) toast.error('Erreur de chargement')
    } finally {
      setLoading(false)
    }
  }, [station])

  useEffect(() => { fetchTickets() }, [fetchTickets])

  // Poll every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => fetchTickets(true), 5000)
    return () => clearInterval(interval)
  }, [fetchTickets])

  // Listen to fullscreen changes
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  function toggleFullscreen() {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {
        toast.error('Impossible de passer en plein écran')
      })
    } else {
      document.exitFullscreen()
    }
  }

  async function acceptTicket(ticketId: string, orderNumber: string) {
    setAccepting(ticketId)
    try {
      const res = await fetch(`/api/restaurant/kds/${ticketId}/accept`, { method: 'POST' })
      if (!res.ok) { toast.error('Erreur'); return }
      toast.success(`Ticket ${orderNumber} accepté`)
      fetchTickets(true)
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setAccepting(null)
    }
  }

  async function completeTicket(ticketId: string, orderNumber: string) {
    setCompleting(ticketId)
    try {
      const res = await fetch(`/api/restaurant/kds/${ticketId}/done`, { method: 'POST' })
      if (!res.ok) { toast.error('Erreur'); return }
      toast.success(`Ticket ${orderNumber} terminé ✓`)
      fetchTickets(true)
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setCompleting(null)
    }
  }

  const activeTickets = tickets.filter(t => t.status !== 'DONE')

  return (
    <div className="bg-gray-950 text-white min-h-screen flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-white">Cuisine — KDS</h1>
          {/* Pulsing refresh indicator */}
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            Mis à jour à {lastRefresh.toLocaleTimeString('fr-DZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>

        {/* Station selector */}
        <div className="flex gap-1 bg-gray-900 rounded-lg p-1">
          {STATIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setStation(s.id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                station === s.id
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">
            {activeTickets.length} ticket(s) en cours
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="border-gray-700 text-gray-300 hover:text-white hover:bg-gray-800 bg-transparent"
          >
            <Maximize2 className="h-4 w-4 mr-1.5" />
            {isFullscreen ? 'Quitter' : 'Plein écran'}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : activeTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <CheckCircle2 className="h-16 w-16 mb-4 text-green-600" />
            <p className="text-xl font-medium text-gray-300">Tout est prêt !</p>
            <p className="text-sm mt-1">Aucun ticket en attente pour cette station</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {activeTickets.map(ticket => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                onAccept={acceptTicket}
                onComplete={completeTicket}
                accepting={accepting === ticket.id}
                completing={completing === ticket.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Ticket Card ────────────────────────────────────────────────────────────────
function TicketCard({
  ticket, onAccept, onComplete, accepting, completing,
}: {
  ticket: KdsTicket
  onAccept: (id: string, num: string) => void
  onComplete: (id: string, num: string) => void
  accepting: boolean
  completing: boolean
}) {
  const borderColor = ticketBorderColor(ticket.createdAt)

  return (
    <div className={`border-2 rounded-xl p-4 bg-gray-900 flex flex-col gap-3 ${borderColor}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bold text-white text-lg font-mono">{ticket.orderNumber}</p>
          {ticket.tableNumber && (
            <p className="text-sm text-gray-400">Table {ticket.tableNumber}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-sm font-bold flex items-center gap-1 ${
            elapsedMin(ticket.createdAt) < 5
              ? 'text-green-400'
              : elapsedMin(ticket.createdAt) < 10
              ? 'text-orange-400'
              : 'text-red-400'
          }`}>
            <Clock className="h-4 w-4" />
            {elapsedLabel(ticket.createdAt)}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            ticket.status === 'NEW' ? 'bg-yellow-900 text-yellow-300' : 'bg-blue-900 text-blue-300'
          }`}>
            {ticket.status === 'NEW' ? 'Nouveau' : 'En cours'}
          </span>
        </div>
      </div>

      {/* Lines */}
      <div className="flex-1 space-y-2">
        {ticket.lines.map(line => (
          <div key={line.id} className="flex gap-3 items-start">
            <span className="text-2xl font-bold text-white leading-none w-8 text-right shrink-0">
              {line.quantity}×
            </span>
            <div>
              <p className="font-semibold text-white leading-tight">{line.name}</p>
              {line.nameAr && (
                <p className="text-sm text-gray-400 font-arabic">{line.nameAr}</p>
              )}
              {line.notes && (
                <p className="text-xs text-yellow-400 mt-0.5 italic">{line.notes}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-1">
        {ticket.status === 'NEW' && (
          <Button
            onClick={() => onAccept(ticket.id, ticket.orderNumber)}
            disabled={accepting}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white border-0"
          >
            {accepting
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : 'ACCEPTER'
            }
          </Button>
        )}
        {ticket.status === 'ACCEPTED' && (
          <Button
            onClick={() => onComplete(ticket.id, ticket.orderNumber)}
            disabled={completing}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white border-0"
          >
            {completing
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <>PRÊT <CheckCircle2 className="h-4 w-4 ml-1.5" /></>
            }
          </Button>
        )}
      </div>
    </div>
  )
}
