'use client'

import { useState, useRef, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Bot, Send, Loader2, User, Sparkles, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'Comment calculer l\'IRG sur un salaire de 80 000 DA ?',
  'Quelle est la date limite de dépôt du G50 ?',
  'Comment enregistrer une facture dans le SCF ?',
  'Quels sont les taux de cotisation CNAS ?',
  'Comment calculer la TVA sur une prestation de service ?',
  'Qu\'est-ce que le régime de l\'auto-entrepreneur en Algérie ?',
]

export default function AIPage() {
  const { t } = useT()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text?: string) => {
    const content = text ?? input
    if (!content.trim() || loading) return
    const userMsg: Message = { role: 'user', content }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    const assistantMsg: Message = { role: 'assistant', content: '' }
    setMessages(m => [...m, assistantMsg])

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })

      if (!res.body) throw new Error('No stream')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        setMessages(m => {
          const updated = [...m]
          updated[updated.length - 1] = {
            role: 'assistant',
            content: updated[updated.length - 1].content + chunk,
          }
          return updated
        })
      }
    } catch {
      setMessages(m => {
        const updated = [...m]
        updated[updated.length - 1] = { role: 'assistant', content: 'Une erreur est survenue. Réessayez.' }
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
      <Header title={t('sidebar.ai')} />

      <div className="flex-1 flex flex-col min-h-0 p-6 gap-4">
        {/* Header card */}
        <div className="bg-gradient-to-r from-yelha-500 to-yelha-600 rounded-2xl p-5 text-white flex items-center gap-4 shrink-0">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-lg">Assistant IA YelhaERP</h2>
              <Badge className="bg-white/20 text-white text-xs border-0">Beta</Badge>
            </div>
            <p className="text-yelha-100 text-sm">Formé sur la réglementation fiscale et comptable algérienne</p>
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" className="ml-auto text-white hover:bg-white/20"
              onClick={() => setMessages([])}>
              <RotateCcw className="w-4 h-4 mr-1" /> Nouvelle conversation
            </Button>
          )}
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-slate-100 p-4 min-h-0">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-yelha-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-8 h-8 text-yelha-500" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-1">Comment puis-je vous aider ?</h3>
                <p className="text-slate-400 text-sm">Posez vos questions sur la fiscalité, la comptabilité et la paie algériennes.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => send(s)}
                    className="text-left px-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-600 hover:border-yelha-300 hover:bg-yelha-50 hover:text-yelha-700 transition-all">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={cn('flex gap-3', msg.role === 'user' && 'flex-row-reverse')}>
                  <div className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                    msg.role === 'user' ? 'bg-yelha-500' : 'bg-slate-100'
                  )}>
                    {msg.role === 'user'
                      ? <User className="w-4 h-4 text-white" />
                      : <Bot className="w-4 h-4 text-slate-600" />}
                  </div>
                  <div className={cn(
                    'max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
                    msg.role === 'user'
                      ? 'bg-yelha-500 text-white rounded-tr-sm'
                      : 'bg-slate-50 text-slate-800 rounded-tl-sm'
                  )}>
                    {msg.content || (loading && i === messages.length - 1
                      ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                      : null)}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex gap-2 shrink-0">
          <Input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Posez votre question sur la fiscalité algérienne..."
            className="flex-1 h-12 rounded-xl"
            disabled={loading}
          />
          <Button onClick={() => send()} disabled={loading || !input.trim()}
            className="h-12 px-5 bg-yelha-500 hover:bg-yelha-600 rounded-xl">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
