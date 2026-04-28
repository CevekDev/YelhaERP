'use client'

import { useState, useRef, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Bot, X, Send, Loader2, MessageCircle, Maximize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface Message { role: 'user' | 'assistant'; content: string }

export function ChatWidget() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [convId, setConvId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Hide on full AI page
  const isAIPage = pathname === '/dashboard/ai'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load last conversation on first open
  useEffect(() => {
    if (!open || messages.length > 0) return
    fetch('/api/ai/conversations')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const last = d?.data?.[0]
        if (!last) return
        return fetch(`/api/ai/conversations/${last.id}`)
          .then(r => r.ok ? r.json() : null)
          .then(conv => {
            if (conv?.data?.messages?.length) {
              setMessages(conv.data.messages)
              setConvId(last.id)
            }
          })
      })
      .catch(() => {})
  }, [open, messages.length])

  const send = async () => {
    if (!input.trim() || loading) return
    const content = input.trim()
    setInput('')

    let currentConvId = convId
    if (!currentConvId) {
      const res = await fetch('/api/ai/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: content.slice(0, 60) }),
      })
      if (res.ok) {
        const d = await res.json()
        currentConvId = d.data.id
        setConvId(currentConvId)
      }
    }

    const userMsg: Message = { role: 'user', content }
    const newMessages = [...messages, userMsg]
    setMessages([...newMessages, { role: 'assistant', content: '' }])
    setLoading(true)

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, conversationId: currentConvId }),
      })

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}))
        setMessages(m => {
          const updated = [...m]
          updated[updated.length - 1] = { role: 'assistant', content: `❌ ${err.error ?? 'Erreur'}` }
          return updated
        })
        return
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value)
        setMessages(m => {
          const updated = [...m]
          updated[updated.length - 1] = { role: 'assistant', content: full }
          return updated
        })
      }
    } finally {
      setLoading(false)
    }
  }

  if (isAIPage) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col" style={{ height: 440 }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-yelha-700 to-yelha-500 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-white">Assistant YelhaERP</span>
            </div>
            <div className="flex items-center gap-1">
              <Link href="/dashboard/ai" title="Ouvrir en plein écran">
                <button className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white">
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </Link>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3">
                <div className="w-12 h-12 bg-yelha-100 rounded-full flex items-center justify-center">
                  <Bot className="h-6 w-6 text-yelha-500" />
                </div>
                <p className="text-sm text-slate-500">Posez une question sur votre gestion, fiscalité ou comptabilité algérienne</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-yelha-500 text-white rounded-tr-sm'
                    : 'bg-white border border-slate-100 text-slate-800 rounded-tl-sm shadow-sm'
                )}>
                  {msg.content ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div className="flex gap-1 items-center py-1">
                      <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t bg-white flex gap-2 shrink-0">
            <Input
              placeholder="Votre question..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              disabled={loading}
              className="h-9 text-sm rounded-xl"
            />
            <Button size="icon" className="h-9 w-9 shrink-0 bg-yelha-500 hover:bg-yelha-600 rounded-xl" onClick={send} disabled={loading || !input.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}

      <Button
        size="icon"
        className="h-14 w-14 rounded-full shadow-xl bg-yelha-500 hover:bg-yelha-600 hover:scale-110 transition-all"
        onClick={() => setOpen(o => !o)}
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>
    </div>
  )
}
