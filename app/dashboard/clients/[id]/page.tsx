'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDA } from '@/lib/algerian/format'
import { toast } from 'sonner'
import { ArrowLeft, Send, FileText, MessageCircle } from 'lucide-react'
import Link from 'next/link'

interface Client {
  id: string; name: string; email?: string; phone?: string; address?: string
  nif?: string; wilaya?: string; portalToken?: string
}
interface Invoice { id: string; number: string; status: string; total: number; issueDate: string }
interface Quote { id: string; number: string; status: string; total: number; issueDate: string }
interface Message { id: string; content: string; fromClient: boolean; createdAt: string; token: string }

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [client, setClient] = useState<Client | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [reply, setReply] = useState('')
  const [activeToken, setActiveToken] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchData = useCallback(async () => {
    const [clientRes, invRes, quoteRes] = await Promise.all([
      fetch(`/api/clients/${id}`),
      fetch(`/api/invoices?clientId=${id}&limit=10`),
      fetch(`/api/quotes?clientId=${id}&limit=10`),
    ])
    if (clientRes.ok) setClient(await clientRes.json())
    if (invRes.ok) { const d = await invRes.json(); setInvoices(d.invoices ?? []) }
    if (quoteRes.ok) { const d = await quoteRes.json(); setQuotes(d.quotes ?? []) }
    setLoading(false)
  }, [id])

  const fetchMessages = useCallback(async (token: string) => {
    const res = await fetch(`/api/portal/${token}/messages`)
    if (res.ok) setMessages(await res.json())
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (activeToken) fetchMessages(activeToken)
  }, [activeToken, fetchMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reply.trim() || !activeToken || !client) return
    setSending(true)
    const res = await fetch('/api/portal/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: activeToken, content: reply, clientId: id }),
    })
    setSending(false)
    if (!res.ok) { toast.error('Erreur envoi'); return }
    const msg = await res.json()
    setMessages(prev => [...prev, msg])
    setReply('')
  }

  if (loading) return <div className="p-6 text-muted-foreground">Chargement...</div>
  if (!client) return <div className="p-6">Client introuvable</div>

  const STATUS_INV: Record<string, 'default'|'success'|'warning'|'destructive'|'secondary'> = {
    PAID: 'success', SENT: 'info' as never, OVERDUE: 'destructive', DRAFT: 'secondary', CANCELLED: 'secondary', PARTIAL: 'warning',
  }
  const STATUS_QUOTE: Record<string, 'default'|'success'|'warning'|'destructive'|'secondary'|'info'> = {
    ACCEPTED: 'success', SENT: 'info' as never, REJECTED: 'destructive', DRAFT: 'secondary', EXPIRED: 'warning', CONVERTED: 'default',
  }

  // Collect all tokens (from quotes with portalToken)
  const allTokens = quotes.filter(q => q.status !== 'DRAFT').map(q => q as Quote & { portalToken?: string })

  return (
    <div>
      <Header title={client.name} />
      <div className="p-6 max-w-5xl space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/clients"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
          <h2 className="text-2xl font-bold flex-1">{client.name}</h2>
          {client.portalToken && (
            <a href={`/portal/${client.portalToken}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-2">
                <FileText className="h-4 w-4" />Portail client
              </Button>
            </a>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Client info */}
          <Card>
            <CardHeader><CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">Informations</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {client.email && <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{client.email}</span></div>}
              {client.phone && <div className="flex justify-between"><span className="text-muted-foreground">Téléphone</span><span>{client.phone}</span></div>}
              {client.wilaya && <div className="flex justify-between"><span className="text-muted-foreground">Wilaya</span><span>{client.wilaya}</span></div>}
              {client.nif && <div className="flex justify-between"><span className="text-muted-foreground">NIF</span><span>{client.nif}</span></div>}
              {client.address && <div className="pt-2 border-t"><p className="text-muted-foreground">Adresse</p><p>{client.address}</p></div>}
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader><CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">Statistiques</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Factures</span>
                <span className="font-medium">{invoices.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Devis</span>
                <span className="font-medium">{quotes.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">CA total (facturé)</span>
                <span className="font-medium da-amount">{formatDA(invoices.reduce((s, i) => s + Number(i.total), 0))}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoices */}
        {invoices.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Dernières factures</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-slate-50">
                  <th className="text-left p-3 font-medium">N°</th>
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-right p-3 font-medium">Montant</th>
                  <th className="p-3 font-medium">Statut</th>
                </tr></thead>
                <tbody>
                  {invoices.map(inv => (
                    <tr key={inv.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="p-3"><Link href={`/dashboard/invoices/${inv.id}`} className="font-mono text-yelha-600 hover:underline">{inv.number}</Link></td>
                      <td className="p-3">{new Date(inv.issueDate).toLocaleDateString('fr-DZ')}</td>
                      <td className="p-3 text-right da-amount">{formatDA(Number(inv.total))}</td>
                      <td className="p-3"><Badge variant={STATUS_INV[inv.status] ?? 'secondary'} className="text-xs">{inv.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Quotes */}
        {quotes.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Devis</CardTitle></CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-slate-50">
                  <th className="text-left p-3 font-medium">N°</th>
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-right p-3 font-medium">Montant</th>
                  <th className="p-3 font-medium">Statut</th>
                  <th className="p-3 font-medium">Messages</th>
                </tr></thead>
                <tbody>
                  {quotes.map((q: Quote & { portalToken?: string }) => (
                    <tr key={q.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="p-3"><Link href={`/dashboard/quotes/${q.id}`} className="font-mono text-yelha-600 hover:underline">{q.number}</Link></td>
                      <td className="p-3">{new Date(q.issueDate).toLocaleDateString('fr-DZ')}</td>
                      <td className="p-3 text-right da-amount">{formatDA(Number(q.total))}</td>
                      <td className="p-3"><Badge variant={STATUS_QUOTE[q.status] ?? 'secondary'} className="text-xs">{q.status}</Badge></td>
                      <td className="p-3">
                        {q.portalToken && (
                          <Button size="sm" variant="ghost" className="gap-1 h-7 text-xs"
                            onClick={() => setActiveToken(activeToken === q.portalToken ? null : q.portalToken ?? null)}>
                            <MessageCircle className="h-3 w-3" />Messages
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Messages panel */}
        {activeToken && (
          <Card>
            <CardHeader className="flex flex-row items-center gap-2">
              <MessageCircle className="h-4 w-4 text-yelha-600" />
              <CardTitle className="text-base">Messagerie portail</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-4 space-y-3 max-h-72 overflow-y-auto border-b">
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun message.</p>
                ) : (
                  messages.map(m => (
                    <div key={m.id} className={`flex ${m.fromClient ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[75%] rounded-xl px-4 py-3 text-sm ${
                        m.fromClient ? 'bg-slate-100 text-slate-800' : 'bg-yelha-500 text-white'
                      }`}>
                        <p className="font-medium text-xs opacity-70 mb-1">{m.fromClient ? client.name : 'Vous'}</p>
                        <p>{m.content}</p>
                        <p className="text-[10px] opacity-60 mt-1">{new Date(m.createdAt).toLocaleDateString('fr-DZ')}</p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={handleReply} className="flex gap-2 p-4">
                <input
                  value={reply}
                  onChange={e => setReply(e.target.value)}
                  placeholder="Votre réponse..."
                  className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-yelha-500/30"
                />
                <Button type="submit" size="sm" disabled={sending || !reply.trim()} className="gap-2">
                  <Send className="h-3.5 w-3.5" />{sending ? 'Envoi...' : 'Répondre'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* No data */}
        {invoices.length === 0 && quotes.length === 0 && allTokens.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>Aucune facture ou devis pour ce client.</p>
            <div className="flex gap-3 justify-center mt-4">
              <Link href={`/dashboard/invoices/new?clientId=${id}`}>
                <Button variant="outline" size="sm">Nouvelle facture</Button>
              </Link>
              <Link href={`/dashboard/quotes/new?clientId=${id}`}>
                <Button variant="outline" size="sm">Nouveau devis</Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
