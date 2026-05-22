'use client'

import { useState } from 'react'
import { MessageCircle, Mail, X, HelpCircle } from 'lucide-react'

export function SupportButton() {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="flex flex-col gap-2 mb-1 animate-in slide-in-from-bottom-2 duration-150">
          <a
            href="https://wa.me/33761179379?text=Bonjour%2C%20j%27ai%20besoin%20d%27aide%20avec%20YelhaSubs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg transition-colors whitespace-nowrap"
          >
            <MessageCircle className="w-4 h-4 flex-shrink-0" />
            WhatsApp
          </a>
          <a
            href="mailto:cvkdev@outlook.fr?subject=Support%20YelhaSubs"
            className="flex items-center gap-2.5 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2.5 rounded-full shadow-lg border border-slate-200 transition-colors whitespace-nowrap"
          >
            <Mail className="w-4 h-4 flex-shrink-0" />
            cvkdev@outlook.fr
          </a>
        </div>
      )}

      <button
        onClick={() => setOpen(v => !v)}
        aria-label={open ? 'Fermer le support' : 'Contacter le support'}
        className="w-12 h-12 bg-yelha-500 hover:bg-yelha-600 text-white rounded-full shadow-lg shadow-yelha-500/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
      >
        {open ? <X className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />}
      </button>
    </div>
  )
}
