'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { StatusBar } from '@/components/ui/status-bar'
import { formatDA } from '@/lib/algerian/format'
import { User, Building2, Mail, Phone, Calendar, TrendingUp, MessageSquare, Plus, ArrowRight } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'

interface Lead {
  id: string
  firstName?: string
  lastName: string
  company?: string
  email?: string
  phone?: string
  source: string
  stage: string
  score: number
  expectedValue?: number | string
  expectedClose?: string
  notes?: string
  convertedAt?: string
  clientId?: string
}

interface Activity {
  id: string
  type: string
  subject: string
  notes?: string
  doneAt: string
}

const STAGES = ['NEW', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST']
const STAGE_LABELS: Record<string, string> = {
  NEW: 'Nouveau', QUALIFIED: 'Qualifié', PROPOSAL: 'Proposition',
  NEGOTIATION: 'Négociation', WON: 'Gagné', LOST: 'Perdu',
}
const ACTIVITY_ICONS: Record<string, string> = {
  CALL: '📞', EMAIL: '✉️', MEETING: '🤝', NOTE: '📝', TASK: '✅',
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [lead, setLead] = useState<Lead | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [actType, setActType] = useState('NOTE')
  const [converting, setConverting] = useState(false)

  const fetchLead = async () => {
    const [lr, ar] = await Promise.all([
      fetch(`/api/crm/leads/${id}`),
      fetch(`/api/crm/leads/${id}/activities`),
    ])
    const ld = await lr.json()
    const ad = await ar.json()
    setLead(ld.data)
    setActivities(ad.data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchLead() }, [id])

  const changeStage = async (stage: string) => {
    await fetch(`/api/crm/leads/${id}/stage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stage }),
    })
    fetchLead()
  }

  const addActivity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!note.trim()) return
    await fetch(`/api/crm/leads/${id}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: actType, subject: note }),
    })
    setNote('')
    fetchLead()
  }

  const convertToClient = async () => {
    if (!confirm('Convertir ce lead en client ?')) return
    setConverting(true)
    const res = await fetch(`/api/crm/leads/${id}/convert`, { method: 'POST' })
    if (res.ok) { router.push('/dashboard/clients') }
    else { setConverting(false) }
  }

  if (loading) return <div className="p-6 text-muted-foreground">Chargement...</div>
  if (!lead) return <div className="p-6 text-muted-foreground">Lead introuvable</div>

  const currentStepIndex = STAGES.indexOf(lead.stage)

  return (
    <div className="p-4 md:p-6 space-y-6">
      <Breadcrumb items={[
        { label: 'CRM', href: '/dashboard/crm/pipeline' },
        { label: 'Leads', href: '/dashboard/crm/leads' },
        { label: [lead.firstName, lead.lastName].filter(Boolean).join(' ') },
      ]} />

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{[lead.firstName, lead.lastName].filter(Boolean).join(' ')}</h1>
          {lead.company && <p className="text-muted-foreground">{lead.company}</p>}
        </div>
        {!lead.clientId && lead.stage !== 'LOST' && (
          <Button onClick={convertToClient} disabled={converting} className="gap-2">
            <ArrowRight className="w-4 h-4" />
            {converting ? 'Conversion...' : 'Convertir en client'}
          </Button>
        )}
        {lead.clientId && <Badge className="bg-green-100 text-green-700">Converti en client</Badge>}
      </div>

      <StatusBar
        steps={STAGES.filter(s => s !== 'LOST')}
        current={lead.stage === 'LOST' ? 'NEW' : lead.stage}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-card border rounded-lg p-4 space-y-3">
            <h2 className="font-semibold">Informations</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {lead.email && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" /><span>{lead.email}</span>
                </div>
              )}
              {lead.phone && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" /><span>{lead.phone}</span>
                </div>
              )}
              {lead.expectedValue && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="w-4 h-4" />
                  <span className="da-amount">{formatDA(Number(lead.expectedValue))}</span>
                </div>
              )}
              {lead.expectedClose && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(lead.expectedClose).toLocaleDateString('fr-DZ')}</span>
                </div>
              )}
            </div>
            {lead.notes && (
              <div className="text-sm text-muted-foreground border-t pt-3">{lead.notes}</div>
            )}
          </div>

          <div className="bg-card border rounded-lg p-4 space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />Activités
            </h2>
            <form onSubmit={addActivity} className="flex gap-2">
              <Select value={actType} onValueChange={setActType}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOTE">📝 Note</SelectItem>
                  <SelectItem value="CALL">📞 Appel</SelectItem>
                  <SelectItem value="EMAIL">✉️ Email</SelectItem>
                  <SelectItem value="MEETING">🤝 RDV</SelectItem>
                  <SelectItem value="TASK">✅ Tâche</SelectItem>
                </SelectContent>
              </Select>
              <Input
                className="flex-1"
                placeholder="Ajouter une activité..."
                value={note}
                onChange={e => setNote(e.target.value)}
              />
              <Button type="submit" size="sm"><Plus className="w-4 h-4" /></Button>
            </form>
            <div className="space-y-3">
              {activities.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Aucune activité</p>
              )}
              {activities.map(act => (
                <div key={act.id} className="flex gap-3 text-sm">
                  <span className="text-lg">{ACTIVITY_ICONS[act.type] ?? '•'}</span>
                  <div>
                    <p>{act.subject}</p>
                    {act.notes && <p className="text-xs text-muted-foreground">{act.notes}</p>}
                    <p className="text-xs text-muted-foreground">{new Date(act.doneAt).toLocaleString('fr-DZ')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-card border rounded-lg p-4 space-y-3">
            <h2 className="font-semibold">Changer le stade</h2>
            <div className="space-y-2">
              {STAGES.map(s => (
                <button
                  key={s}
                  onClick={() => changeStage(s)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                    lead.stage === s
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'hover:bg-muted border'
                  }`}
                >
                  {STAGE_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-card border rounded-lg p-4 space-y-2 text-sm">
            <h2 className="font-semibold mb-3">Score</h2>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: `${lead.score}%` }} />
              </div>
              <span className="font-medium">{lead.score}/100</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
