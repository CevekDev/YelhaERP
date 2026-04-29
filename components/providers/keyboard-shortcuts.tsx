'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const SHORTCUTS: Record<string, string> = {
  'gd': '/dashboard',
  'gf': '/dashboard/invoices',
  'gc': '/dashboard/clients',
  'gp': '/dashboard/products',
  'gs': '/dashboard/stock',
  'ga': '/dashboard/accounting',
  'gi': '/dashboard/ai',
}

export function KeyboardShortcuts() {
  const router = useRouter()

  useEffect(() => {
    let buffer = ''
    let timer: ReturnType<typeof setTimeout>

    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return
      if ((e.target as HTMLElement).isContentEditable) return

      buffer += e.key
      clearTimeout(timer)
      timer = setTimeout(() => { buffer = '' }, 500)

      if (SHORTCUTS[buffer]) {
        router.push(SHORTCUTS[buffer])
        buffer = ''
      }
    }

    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
      clearTimeout(timer)
    }
  }, [router])

  return null
}
