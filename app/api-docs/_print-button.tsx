'use client'
import { Printer } from 'lucide-react'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-2 px-4 py-2 bg-yelha-500 text-white rounded-lg text-sm font-medium hover:bg-yelha-600 transition-colors"
    >
      <Printer className="w-4 h-4" />
      Télécharger PDF
    </button>
  )
}
