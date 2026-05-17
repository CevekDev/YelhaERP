'use client'

import { useT } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n/translations'
import { Globe } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const LANGS: { code: Locale; label: string; short: string }[] = [
  { code: 'fr', label: 'Français',  short: 'FR' },
  { code: 'en', label: 'English',   short: 'EN' },
  { code: 'ar', label: 'العربية',   short: 'AR' },
]

export function LanguageSwitcher({ variant = 'default' }: { variant?: 'default' | 'dark' }) {
  const { locale, setLocale } = useT()
  const current = LANGS.find(l => l.code === locale) ?? LANGS[0]

  const isDark = variant === 'dark'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-semibold transition-all ${
            isDark
              ? 'text-white/80 hover:bg-white/10 hover:text-white'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
          title={current.label}
        >
          <Globe className="h-3.5 w-3.5" />
          <span>{current.short}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px]">
        {LANGS.map(l => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLocale(l.code)}
            className={l.code === locale ? 'font-semibold text-primary' : ''}
          >
            {l.label}
            {l.code === locale && <span className="ml-auto text-primary">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
