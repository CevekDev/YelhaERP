'use client'
import { useEffect, useState } from 'react'
import { formatDA } from '@/lib/algerian/format'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Loader2, ArrowLeft, Phone, DollarSign, AlertCircle, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

type Debt = {
  id: string
  totalAmount: number
  paidAmount: number
  status: string
  dueDate: string | null
  notes: string | null
  createdAt: string
  client: { id: string; name: string; phone: string | null }
  payments: {
    id: string
    amount: number
    method: string
    paidAt: string
    note: string | null
  }[]
}

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)
  const [showAll, setShowAll] = useState(false)
  const [selected, setSelected] = useState<Debt | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [paying, setPaying] = useState(false)

  const fetchDebts = () => {
    setLoading(true)
    fetch(`/api/pos/debts${showAll ? '?status=all' : ''}`)
      .then(r => r.json())
      .then(d => setDebts(d.data ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchDebts() }, [showAll])

  const totalOutstanding = debts.reduce(
    (s, d) => s + Number(d.totalAmount) - Number(d.paidAmount),
    0,
  )

  async function recordPayment() {
    if (!selected || !payAmount) return
    setPaying(true)
    try {
      const res = await fetch(`/api/pos/debts/${selected.id}/payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: Number(payAmount), method: 'CASH' }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.message ?? 'Erreur'); return }
      toast.success('Paiement enregistré')
      setSelected(null)
      setPayAmount('')
      fetchDebts()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/pos"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Gestion des dettes</h1>
          <p className="text-muted-foreground text-sm">Clients avec soldes impayés</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowAll(v => !v)}>
          {showAll ? 'Masquer soldées' : 'Voir toutes'}
        </Button>
      </div>

      {/* Summary */}
      {debts.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
          <div>
            <p className="font-semibold text-amber-700 dark:text-amber-400">
              {debts.length} dette{debts.length > 1 ? 's' : ''} en attente
            </p>
            <p className="text-sm text-muted-foreground">
              Total impayé :{' '}
              <span className="font-bold text-amber-600 da-amount">{formatDA(totalOutstanding)}</span>
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : debts.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <p className="font-semibold text-lg">Aucune dette en attente</p>
          <p className="text-muted-foreground text-sm mt-1">Tous vos clients sont à jour !</p>
        </div>
      ) : (
        <div className="space-y-3">
          {debts.map(d => {
            const remaining = Number(d.totalAmount) - Number(d.paidAmount)
            const isPaid = d.status === 'PAID'
            return (
              <div key={d.id} className="border rounded-xl p-4 bg-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{d.client.name}</span>
                      <Badge
                        className={
                          isPaid
                            ? 'bg-green-500/10 text-green-600 border-green-500/20'
                            : d.status === 'PARTIAL'
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                            : 'bg-red-500/10 text-red-600 border-red-500/20'
                        }
                        variant="outline"
                      >
                        {isPaid ? 'Soldée' : d.status === 'PARTIAL' ? 'Partielle' : 'En attente'}
                      </Badge>
                    </div>
                    {d.client.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />{d.client.phone}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Créée le {new Date(d.createdAt).toLocaleDateString('fr-DZ')}
                      {d.dueDate && ` · Échéance: ${new Date(d.dueDate).toLocaleDateString('fr-DZ')}`}
                    </p>
                    {/* Payment history */}
                    {d.payments.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {d.payments.map(p => (
                          <div key={p.id} className="text-xs text-muted-foreground flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            Paiement de{' '}
                            <span className="font-medium da-amount">{formatDA(Number(p.amount))}</span>
                            {' '}le {new Date(p.paidAt).toLocaleDateString('fr-DZ')}
                            {p.note && ` — ${p.note}`}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-muted-foreground">Total</div>
                    <div className="font-semibold da-amount">{formatDA(Number(d.totalAmount))}</div>
                    {!isPaid && (
                      <>
                        <div className="text-xs text-muted-foreground mt-1">Reste à payer</div>
                        <div className="font-bold text-amber-500 text-lg da-amount">{formatDA(remaining)}</div>
                        <Button
                          size="sm"
                          className="mt-2"
                          onClick={() => { setSelected(d); setPayAmount(String(remaining)) }}
                        >
                          <DollarSign className="h-3.5 w-3.5 mr-1" />Encaisser
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Payment modal */}
      <Dialog open={!!selected} onOpenChange={o => { if (!o) { setSelected(null); setPayAmount('') } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Enregistrer un paiement</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 py-2">
              <div className="bg-muted rounded-xl p-3 text-sm space-y-1">
                <div className="font-semibold">{selected.client.name}</div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Reste à payer</span>
                  <span className="font-bold text-foreground da-amount">
                    {formatDA(Number(selected.totalAmount) - Number(selected.paidAmount))}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Montant reçu (DA)</label>
                <Input
                  type="number"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  className="h-12 text-lg text-center font-bold"
                  autoFocus
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSelected(null); setPayAmount('') }}>
              Annuler
            </Button>
            <Button onClick={recordPayment} disabled={paying || !payAmount}>
              {paying
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <><CheckCircle2 className="h-4 w-4 mr-2" />Confirmer</>
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
