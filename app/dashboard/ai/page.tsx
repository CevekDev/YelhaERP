'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Bot, Send, Loader2, User, Sparkles, Plus, Trash2, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Message { role: 'user' | 'assistant'; content: string }
interface Conversation { id: string; title: string; updatedAt: string }

const SUGGESTIONS = [
  'Comment calculer l\'IRG sur un salaire de 80 000 DA ?',
  'Quelle est la date limite du G50 ce mois-ci ?',
  'Quels sont les taux CNAS employeur et employé ?',
  'Comment enregistrer une facture dans le SCF ?',
  'C\'est quoi la TVA réduite à 9% en Algérie ?',
  'Calcule le salaire net pour 120 000 DA brut',
]

export default function AIPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingConvs, setLoadingConvs] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadConversations = useCallback(async () => {
    setLoadingConvs(true)
    try {
      const res = await fetch('/api/ai/conversations')
      if (res.ok) {
        const data = await res.json()
        setConversations(data.data ?? [])
      }
    } finally {
      setLoadingConvs(false)
    }
  }, [])

  useEffect(() => { loadConversations() }, [loadConversations])

  const loadConversation = async (id: string) => {
    const res = await fetch(`/api/ai/conversations/${id}`)
    if (res.ok) {
      const data = await res.json()
      setMessages(data.data.messages ?? [])
      setActiveId(id)
    }
  }

  const newConversation = () => {
    setActiveId(null)
    setMessages([])
    setInput('')
    inputRef.current?.focus()
  }

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await fetch(`/api/ai/conversations/${id}`, { method: 'DELETE' })
    setConversations(c => c.filter(x => x.id !== id))
    if (activeId === id) newConversation()
    toast.success('Conversation supprimée')
  }

  const send = async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || loading) return
    setInput('')

    // Create conversation in DB if new
    let convId = activeId
    const isFirstMessage = messages.length === 0
    if (!convId) {
      const res = await fetch('/api/ai/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: content.slice(0, 60) }),
      })
      if (res.ok) {
        const data = await res.json()
        convId = data.data.id
        setActiveId(convId)
        const newConv: Conversation = { id: convId!, title: content.slice(0, 60), updatedAt: new Date().toISOString() }
        setConversations(c => [newConv, ...c])
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
        body: JSON.stringify({ messages: newMessages, conversationId: convId }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? 'Erreur')
      }
      if (!res.body) throw new Error('No stream')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        full += chunk
        setMessages(m => {
          const updated = [...m]
          updated[updated.length - 1] = { role: 'assistant', content: full }
          return updated
        })
      }

      // Update conversation title in sidebar if first message
      if (isFirstMessage && convId) {
        setConversations(c => c.map(x => x.id === convId ? { ...x, updatedAt: new Date().toISOString() } : x))
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur'
      toast.error(msg)
      setMessages(m => {
        const updated = [...m]
        updated[updated.length - 1] = { role: 'assistant', content: `❌ ${msg}` }
        return updated
      })
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div className="flex flex-col h-screen">
      <Header title="Assistant IA" />

      <div className="flex flex-1 min-h-0">
        {/* Sidebar conversations */}
        <aside className="w-64 border-r bg-slate-50 flex flex-col shrink-0">
          <div className="p-3 border-b">
            <Button onClick={newConversation} className="w-full gap-2 bg-yelha-500 hover:bg-yelha-600" size="sm">
              <Plus className="w-4 h-4" /> Nouvelle conversation
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {loadingConvs ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
              </div>
            ) : conversations.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Aucune conversation</p>
            ) : conversations.map(conv => (
              <button key={conv.id} onClick={() => loadConversation(conv.id)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg text-sm group flex items-start gap-2 transition-colors',
                  activeId === conv.id ? 'bg-yelha-100 text-yelha-800' : 'hover:bg-slate-100 text-slate-700'
                )}>
                <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium leading-snug">{conv.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(conv.updatedAt).toLocaleDateString('fr-DZ')}
                  </p>
                </div>
                <button onClick={e => deleteConversation(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-red-500 transition-all shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </button>
            ))}
          </div>

          <div className="p-3 border-t">
            <div className="bg-yelha-50 rounded-lg px-3 py-2">
              <div className="flex items-center gap-1.5 mb-1">
                <Bot className="w-3.5 h-3.5 text-yelha-600" />
                <span className="text-xs font-semibold text-yelha-700">Assistant YelhaERP</span>
              </div>
              <p className="text-xs text-yelha-600">Spécialisé en fiscalité algérienne</p>
            </div>
          </div>
        </aside>

        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 overflow-y-auto p-6">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-6 max-w-2xl mx-auto">
                <div className="text-center">
                  <div className="w-16 h-16 bg-yelha-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="w-8 h-8 text-yelha-500" />
                  </div>
                  <h3 className="font-semibold text-slate-800 text-lg mb-1">Comment puis-je vous aider ?</h3>
                  <p className="text-slate-400 text-sm">Posez vos questions sur la fiscalité, la comptabilité et la paie algériennes.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => send(s)}
                      className="text-left px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-600 hover:border-yelha-300 hover:bg-yelha-50 hover:text-yelha-700 transition-all leading-snug">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-5">
                {messages.map((msg, i) => (
                  <div key={i} className={cn('flex gap-3', msg.role === 'user' && 'flex-row-reverse')}>
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1',
                      msg.role === 'user' ? 'bg-yelha-500' : 'bg-slate-100 border border-slate-200'
                    )}>
                      {msg.role === 'user'
                        ? <User className="w-4 h-4 text-white" />
                        : <Bot className="w-4 h-4 text-slate-600" />}
                    </div>
                    <div className={cn(
                      'max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-yelha-500 text-white rounded-tr-sm'
                        : 'bg-white border border-slate-100 text-slate-800 rounded-tl-sm shadow-sm'
                    )}>
                      {msg.content ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div className="flex gap-1 items-center py-1">
                          <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t p-4 bg-white">
            <div className="max-w-3xl mx-auto flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Posez votre question sur la fiscalité algérienne... (Entrée pour envoyer)"
                className="flex-1 h-12 rounded-xl"
                disabled={loading}
              />
              <Button onClick={() => send()} disabled={loading || !input.trim()}
                className="h-12 px-5 bg-yelha-500 hover:bg-yelha-600 rounded-xl shrink-0">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-slate-400 text-center mt-2">
              L'IA peut faire des erreurs. Vérifiez les informations importantes auprès d'un comptable.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
