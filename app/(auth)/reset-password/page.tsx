'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, TrendingUp, CheckCircle, Eye, EyeOff } from 'lucide-react'

const schema = z.object({
  password: z.string()
    .min(8, 'Min. 8 caractères')
    .regex(/[A-Z]/, '1 majuscule requise')
    .regex(/[0-9]/, '1 chiffre requis'),
  confirm: z.string(),
}).refine(d => d.password === d.confirm, { message: 'Les mots de passe ne correspondent pas', path: ['confirm'] })
type FormData = z.infer<typeof schema>

function ResetForm() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token') ?? ''

  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPwd, setShowPwd] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  const inputCls = "w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-yelha-500/30 focus:border-yelha-400 transition-colors"

  if (!token) {
    return (
      <div className="text-center space-y-3">
        <p className="text-red-600 font-medium">Lien invalide ou manquant</p>
        <Link href="/forgot-password" className="text-sm text-yelha-600 hover:underline">
          Demander un nouveau lien
        </Link>
      </div>
    )
  }

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: data.password }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok) {
        setDone(true)
        setTimeout(() => router.push('/login'), 3000)
      } else {
        setError((json as { error?: string }).error ?? 'Une erreur est survenue')
      }
    } catch {
      setError('Erreur réseau — réessayez')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="text-center space-y-4">
        <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto">
          <CheckCircle className="w-7 h-7 text-emerald-500" />
        </div>
        <div>
          <p className="font-semibold text-slate-900">Mot de passe réinitialisé !</p>
          <p className="text-sm text-slate-500 mt-1">Redirection vers la connexion dans 3 secondes…</p>
        </div>
        <Link href="/login" className="text-sm text-yelha-600 hover:underline font-medium">
          Se connecter maintenant →
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">Nouveau mot de passe</label>
        <div className="relative">
          <input
            id="password"
            type={showPwd ? 'text' : 'password'}
            autoComplete="new-password"
            autoFocus
            className={inputCls + ' pr-10'}
            {...register('password')}
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPwd(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
        <p className="text-[11px] text-slate-400 mt-1">Min. 8 caractères, 1 majuscule, 1 chiffre</p>
      </div>

      <div>
        <label htmlFor="confirm" className="block text-sm font-medium text-slate-700 mb-1.5">Confirmer le mot de passe</label>
        <input
          id="confirm"
          type={showPwd ? 'text' : 'password'}
          autoComplete="new-password"
          className={inputCls}
          {...register('confirm')}
        />
        {errors.confirm && <p className="text-xs text-red-500 mt-1">{errors.confirm.message}</p>}
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full h-11 bg-yelha-500 hover:bg-yelha-600 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm shadow-yelha-500/20"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Réinitialiser mon mot de passe
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <div className="flex items-center px-6 py-4 bg-white border-b border-slate-100">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-yelha-500 rounded-lg flex items-center justify-center shadow-sm">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-900">YelhaSubs</span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-6">
            <h2 className="text-2xl font-extrabold text-slate-900">Nouveau mot de passe</h2>
            <p className="text-slate-500 text-sm mt-1">Choisissez un mot de passe sécurisé</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7">
            <Suspense fallback={<div className="h-32 flex items-center justify-center"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>}>
              <ResetForm />
            </Suspense>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            © {new Date().getFullYear()} YelhaSubs — Alger, Algérie
          </p>
        </div>
      </div>
    </div>
  )
}
