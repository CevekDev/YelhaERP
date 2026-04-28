'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { translations, type Locale } from './translations'

interface I18nContextType {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string) => string
  dir: 'ltr' | 'rtl'
}

const I18nContext = createContext<I18nContextType>({
  locale: 'fr',
  setLocale: () => {},
  t: (k) => k,
  dir: 'ltr',
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('fr')

  useEffect(() => {
    const saved = localStorage.getItem('yelha-locale') as Locale | null
    if (saved && ['fr', 'en', 'ar'].includes(saved)) setLocaleState(saved)
  }, [])

  useEffect(() => {
    const dir = locale === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.dir = dir
    document.documentElement.lang = locale
  }, [locale])

  const setLocale = (l: Locale) => {
    setLocaleState(l)
    localStorage.setItem('yelha-locale', l)
  }

  const t = (key: string): string => {
    const parts = key.split('.')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let val: any = translations[locale]
    for (const p of parts) {
      val = val?.[p]
      if (val === undefined) break
    }
    if (typeof val === 'string') return val
    // Fallback to French
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let fallback: any = translations.fr
    for (const p of parts) {
      fallback = fallback?.[p]
      if (fallback === undefined) break
    }
    return typeof fallback === 'string' ? fallback : key
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, dir: locale === 'ar' ? 'rtl' : 'ltr' }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useT() {
  return useContext(I18nContext)
}
