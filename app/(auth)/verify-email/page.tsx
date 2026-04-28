'use client'

import { Suspense, useRef, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { TrendingUp, CheckCircle, XCircle, Mail, Loader2 } from 'lucide-react'
import { useT } from '@/lib/i18n'
import { LanguageSwitcher } from '@/components/ui/language-switcher'

function VerifyContent() {
  const params = useSearchParams()
  const router = useRouter()
  const { t } = useT()

  const email = params.get('email') ?? ''
  const success = params.get('success') === '1'
  const error = params.get('error')

  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [resending, setResending] = useState(false)
  const [resent, setResent] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000)
      return () => clearTimeout(t)
    }
  }, [countdown])

  function handleChange(idx: number, val: string) {
    const digit = val.replace(/\D/g, '').slice(-1)
    const next = [...code]
    next[idx] = digit
    setCode(next)
    setErr('')
    if (digit && idx < 5) inputs.current[idx + 1]?.focus()
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !code[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length === 6) {
      setCode(text.split(''))
      inputs.current[5]?.focus()
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fullCode = code.join('')
    if (fullCode.length < 6) { setErr(t('auth.verify_code_incomplete')); return }
    setLoading(true)
    setErr('')
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: fullCode }),
      })
      if (res.ok) {
        router.push('/verify-email?success=1')
      } else {
        const data = await res.json()
        setErr(data.error ?? t('auth.verify_code_error'))
        setCode(['', '', '', '', '', ''])
        inputs.current[0]?.focus()
      }
    } catch {
      setErr(t('auth.verify_code_error'))
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setResending(true)
    try {
      await fetch('/api/auth/verify-email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setResent(true)
      setCountdown(60)
    } finally {
      setResending(false)
    }
  }

  if (success) return (
    <div className="text-center">
      <div className="w-16 h-16 bg-yelha-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <CheckCircle className="w-8 h-8 text-yelha-500" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">{t('auth.verify_success')}</h2>
      <p className="text-slate-500 text-sm mb-6">{t('auth.verify_welcome_sent')}</p>
      <Link href="/login" className="inline-flex items-center justify-center bg-yelha-500 hover:bg-yelha-600 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-all w-full">
        {t('auth.login_submit')}
      </Link>
    </div>
  )

  if (error) return (
    <div className="text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <XCircle className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">{t('auth.verify_invalid')}</h2>
      <Link href="/login" className="inline-flex items-center justify-center border border-slate-200 text-slate-700 font-medium px-6 py-3 rounded-xl text-sm hover:border-yelha-300 transition-all w-full">
        {t('auth.verify_login')}
      </Link>
    </div>
  )

  return (
    <form onSubmit={handleSubmit}>
      <div className="text-center mb-6">
        <div className="w-14 h-14 bg-yelha-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="w-7 h-7 text-yelha-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">{t('auth.verify_title')}</h2>
        <p className="text-slate-500 text-sm">{t('auth.verify_desc')}</p>
        {email && <p className="text-yelha-600 font-medium text-sm mt-1">{email}</p>}
      </div>

      <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
        {code.map((digit, idx) => (
          <input
            key={idx}
            ref={el => { inputs.current[idx] = el }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={e => handleChange(idx, e.target.value)}
            onKeyDown={e => handleKeyDown(idx, e)}
            className="w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl focus:outline-none focus:border-yelha-500 transition-colors"
            style={{ borderColor: digit ? '#1D9E75' : err ? '#ef4444' : '#e2e8f0' }}
          />
        ))}
      </div>

      {err && <p className="text-red-500 text-sm text-center mb-4">{err}</p>}

      <button type="submit" disabled={loading}
        className="w-full bg-yelha-500 hover:bg-yelha-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl text-sm transition-all flex items-center justify-center gap-2 mb-4">
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {t('auth.verify_submit')}
      </button>

      <div className="text-center">
        {resent && <p className="text-yelha-600 text-xs mb-2">{t('auth.verify_resent')}</p>}
        <button type="button" onClick={handleResend} disabled={resending || countdown > 0}
          className="text-sm text-slate-500 hover:text-yelha-600 disabled:opacity-50 transition-colors">
          {resending ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
          {countdown > 0 ? `${t('auth.verify_resend')} (${countdown}s)` : t('auth.verify_resend')}
        </button>
      </div>
    </form>
  )
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yelha-50 to-white p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-yelha-500 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-yelha-700">YelhaERP</span>
          </div>
          <LanguageSwitcher />
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
          <Suspense fallback={<div className="h-64 animate-pulse bg-slate-100 rounded-xl" />}>
            <VerifyContent />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
