'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { MessageSquare, Activity, Send, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Timeline, type TimelineItem } from '@/components/ui/timeline'

interface ChatterMessage {
  id: string
  author: string
  content: string
  createdAt: string
  isInternal?: boolean
}

interface ChatterPanelProps {
  activities?: TimelineItem[]
  messages?: ChatterMessage[]
  onSendNote?: (content: string) => Promise<void>
  className?: string
}

export function ChatterPanel({ activities = [], messages = [], onSendNote, className }: ChatterPanelProps) {
  const [tab, setTab] = useState<'messages' | 'activity'>('activity')
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!note.trim() || !onSendNote) return
    setSending(true)
    try {
      await onSendNote(note.trim())
      setNote('')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={cn('bg-background border border-border rounded-xl', className)}>
      {/* Tabs */}
      <div className="flex border-b border-border">
        {[
          { key: 'activity' as const, label: 'Activité', icon: Activity },
          { key: 'messages' as const, label: 'Notes', icon: MessageSquare },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        {tab === 'activity' ? (
          activities.length > 0 ? (
            <Timeline items={activities} />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">Aucune activité</p>
          )
        ) : (
          <div className="space-y-4">
            {messages.map(msg => (
              <div key={msg.id} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">
                    {msg.author.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-foreground">{msg.author}</span>
                    <span className="text-xs text-muted-foreground">{msg.createdAt}</span>
                    {msg.isInternal && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                        Interne
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}

            {onSendNote && (
              <div className="flex gap-2 mt-2">
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Ajouter une note interne…"
                  rows={2}
                  className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleSend() }}
                />
                <Button
                  size="icon"
                  onClick={handleSend}
                  disabled={sending || !note.trim()}
                  className="shrink-0 self-end"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
