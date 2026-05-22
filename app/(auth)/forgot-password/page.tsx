'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, TrendingUp, ArrowLeft, Mail, CheckCircle } from 'lucide-react'

const schema = z.object({ email: z.string().email('Email invalide') })
type FormData = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      })
      if (res.ok) {
        setSent(true)
      } else {
        const json = await res.json().catch(() => ({}))
        setError((json as { error?: string }).error ?? 'Une erreur est survenue')
      }
    } catch {
      setError('Erreur réseau — réessayez')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = "w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-yelha-500/30 focus:border-yelha-400 transition-colors"

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100">
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
            <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4">
              <ArrowLeft className="w-3.5 h-3.5" />
              Retour à la connexion
            </Link>
            <h2 className="text-2xl font-extrabold text-slate-900">Mot de passe oublié ?</h2>
            <p className="text-slate-500 text-sm mt-1">Entrez votre email pour recevoir un lien de réinitialisation</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7">
            {sent ? (
              <div className="text-center space-y-4">
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto">
                  <CheckCircle className="w-7 h-7 text-emerald-500" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Email envoyé !</p>
                  <p className="text-sm text-slate-500 mt-1">
                    Si ce compte existe, vous recevrez un lien valide pendant 1 heure.
                    Vérifiez vos spams si vous ne voyez rien.
                  </p>
                </div>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-sm text-yelha-600 hover:text-yelha-700 font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Retour à la connexion
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                    <span className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-400" /> Adresse email</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="vous@exemple.dz"
                    autoComplete="email"
                    autoFocus
                    className={inputCls}
                    {...register('email')}
                  />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
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
                  Envoyer le lien de réinitialisation
                </button>
              </form>
            )}
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            © {new Date().getFullYear()} YelhaSubs — Alger, Algérie
          </p>
        </div>
      </div>
    </div>
  )
}
