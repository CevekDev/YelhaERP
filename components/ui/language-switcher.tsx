'use client'

import { useT } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n/translations'

const LANGS: { code: Locale; label: string; flag: string }[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ar', label: 'العربية', flag: '🇩🇿' },
]

export function LanguageSwitcher({ variant = 'default' }: { variant?: 'default' | 'dark' }) {
  const { locale, setLocale } = useT()

  return (
    <div className="flex items-center gap-1">
      {LANGS.map(l => (
        <button
          key={l.code}
          onClick={() => setLocale(l.code)}
          title={l.label}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${
            locale === l.code
              ? variant === 'dark'
                ? 'bg-yelha-500/20 text-yelha-300 border border-yelha-500/30'
                : 'bg-yelha-100 text-yelha-700 border border-yelha-200'
              : variant === 'dark'
              ? 'text-slate-400 hover:text-white hover:bg-white/10'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
          }`}
        >
          <span>{l.flag}</span>
          <span className="hidden sm:inline">{l.code.toUpperCase()}</span>
        </button>
      ))}
    </div>
  )
}
