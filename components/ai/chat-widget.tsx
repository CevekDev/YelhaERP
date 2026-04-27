'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bot, X, Send, Loader2, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg: Message = { role: 'user', content: input }
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

      if (!res.ok) {
        const err = await res.json()
        setMessages(m => {
          const updated = [...m]
          updated[updated.length - 1] = { role: 'assistant', content: err.error ?? 'Erreur' }
          return updated
        })
        return
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()

      while (reader) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n').filter(l => l.startsWith('data: '))
        for (const line of lines) {
          const json = line.slice(6).trim()
          if (json === '[DONE]') continue
          try {
            const data = JSON.parse(json)
            const delta = data.choices?.[0]?.delta?.content ?? ''
            if (delta) {
              setMessages(m => {
                const updated = [...m]
                updated[updated.length - 1] = {
                  role: 'assistant',
                  content: updated[updated.length - 1].content + delta,
                }
                return updated
              })
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {open && (
        <Card className="w-80 sm:w-96 shadow-2xl border">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-yelha-500 rounded-full flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <CardTitle className="text-sm">Assistant IA YelhaERP</CardTitle>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {/* Messages */}
            <div className="h-72 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <p className="text-sm text-muted-foreground text-center mt-8">
                  Posez une question sur votre gestion, fiscalité ou comptabilité...
                </p>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className={cn(
                    'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                    msg.role === 'user'
                      ? 'bg-yelha-500 text-white'
                      : 'bg-muted text-foreground'
                  )}>
                    {msg.content || (msg.role === 'assistant' && loading && (
                      <span className="flex gap-1">
                        <span className="animate-bounce">.</span>
                        <span className="animate-bounce delay-100">.</span>
                        <span className="animate-bounce delay-200">.</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            {/* Input */}
            <div className="p-3 border-t flex gap-2">
              <Input
                placeholder="Votre question..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                disabled={loading}
                className="h-9 text-sm"
              />
              <Button size="icon" className="h-9 w-9 shrink-0" onClick={send} disabled={loading || !input.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toggle button */}
      <Button
        size="icon"
        className="h-12 w-12 rounded-full shadow-lg bg-yelha-500 hover:bg-yelha-600"
        onClick={() => setOpen(o => !o)}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </Button>
    </div>
  )
}
