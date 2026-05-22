'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, TrendingUp, CheckCircle, Package, FileText, Users, BarChart3, Zap, Shield, Truck, Calendar } from 'lucide-react'
import { useT } from '@/lib/i18n'
import { LanguageSwitcher } from '@/components/ui/language-switcher'

const schema = z.object({
  name:      z.string().min(2),
  email:     z.string().email(),
  password:  z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  phone:     z.string().min(9).regex(/^0[5-7]\d{8}$/),
  birthDate: z.string().min(1),
})
type FormData = z.infer<typeof schema>

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading]             = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const { t, dir } = useT()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    const res = await fetch('/api/auth/register', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(data),
    })
    setLoading(false)
    if (res.ok) {
      router.push(`/verify-email?email=${encodeURIComponent(data.email)}`)
    } else {
      const e = await res.json()
      toast.error(e.error ?? t('auth.err_server'))
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    await signIn('google', { callbackUrl: '/onboarding' })
  }

  const inputCls = "w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-yelha-500/30 focus:border-yelha-400 transition-colors"
  const labelCls = "block text-sm font-medium text-slate-700 mb-1.5"

  const freeFeatures = [
    { icon: FileText, label: 'Facturation & devis illimités',       color: 'text-blue-400 bg-blue-500/10' },
    { icon: Truck,    label: 'Achats & bons de commande',            color: 'text-orange-400 bg-orange-500/10' },
    { icon: Package,  label: 'Gestion des stocks en temps réel',     color: 'text-yelha-400 bg-yelha-500/10' },
    { icon: Users,    label: 'Clients & fournisseurs illimités',      color: 'text-purple-400 bg-purple-500/10' },
    { icon: BarChart3, label: 'Tableau de bord & rapports',          color: 'text-pink-400 bg-pink-500/10' },
  ]

  return (
    <div className="min-h-screen flex bg-white">

      {/* ── Left panel — branding ──────────────────────────── */}
      <div className="hidden lg:flex lg:w-[48%] xl:w-[45%] bg-slate-950 flex-col justify-between p-10 xl:p-12 relative overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-yelha-500/15 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-yelha-600/10 rounded-full blur-[100px]" />
          <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-yelha-500 rounded-xl flex items-center justify-center shadow-lg shadow-yelha-500/40">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">YelhaSubs</span>
          </div>

          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-full mb-5">
            <CheckCircle className="w-3.5 h-3.5" /> GRATUIT À VIE — aucune carte requise
          </div>

          <h1 className="text-3xl xl:text-4xl font-extrabold text-white leading-tight mb-3">
            Votre Core ERP<br />
            <span className="bg-gradient-to-r from-yelha-400 to-yelha-300 bg-clip-text text-transparent">inclus gratuitement</span>
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-7">
            Créez votre compte en 30 secondes et accédez immédiatement à toutes les fonctionnalités Core, sans limite de durée.
          </p>

          <div className="space-y-2.5 mb-8">
            {freeFeatures.map(f => {
              const Icon = f.icon
              return (
                <div key={f.label} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${f.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <span className="text-slate-300 text-sm">{f.label}</span>
                  </div>
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                </div>
              )
            })}
          </div>

          {/* Trial timeline */}
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-3.5 h-3.5 text-yelha-400" />
              <p className="text-xs font-semibold text-yelha-300">Comment ça marche</p>
            </div>

            {/* Step 1 */}
            <div className="flex gap-3">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                  <CheckCircle className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="w-px flex-1 min-h-[20px] bg-gradient-to-b from-emerald-500/50 to-yelha-500/40 my-1" />
              </div>
              <div className="pb-3">
                <p className="text-xs font-semibold text-white">Aujourd&apos;hui — Accès immédiat</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Core ERP complet inclus, sans limite de durée</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-3">
              <div className="flex flex-col items-center flex-shrink-0">
                <div className="w-6 h-6 rounded-full bg-yelha-500 flex items-center justify-center">
                  <Zap className="w-3 h-3 text-white" />
                </div>
                <div className="w-px flex-1 min-h-[20px] bg-gradient-to-b from-yelha-500/50 to-amber-500/40 my-1" />
              </div>
              <div className="pb-3">
                <p className="text-xs font-semibold text-white">15 jours d&apos;essai gratuit</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Modules avancés (Abonnements, CRM…) sans engagement</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                  <span className="text-amber-400 text-[10px] font-bold">J15</span>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-white/70">Après 15 jours — Choisissez un plan</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  À partir de <span className="text-yelha-400 font-semibold">1 500 DA/mois</span> — aucune carte requise avant
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mt-3 space-y-1">
              <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full w-0 bg-gradient-to-r from-emerald-500 via-yelha-400 to-amber-400 rounded-full" />
              </div>
              <div className="flex justify-between text-[10px] text-white/20">
                <span>Inscription</span>
                <span className="text-amber-400/50 font-medium">Jour 15 — Paiement</span>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap gap-2.5 mt-8">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 text-slate-300 text-xs font-semibold px-3 py-2 rounded-lg">
            <Shield className="w-3.5 h-3.5 text-yelha-400" /> Conforme droit algérien
          </div>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 text-slate-300 text-xs font-semibold px-3 py-2 rounded-lg">
            <Zap className="w-3.5 h-3.5 text-yelha-400" /> IRG & TVA automatiques
          </div>
        </div>
      </div>

      {/* ── Right panel — form ─────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">

        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-yelha-500 rounded-lg flex items-center justify-center shadow-sm">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 lg:hidden">YelhaSubs</span>
          </Link>
          <LanguageSwitcher />
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-start justify-center p-6 sm:p-8 py-10">
          <div className="w-full max-w-md" dir={dir}>

            <div className="mb-6">
              <h2 className="text-2xl font-extrabold text-slate-900">{t('auth.register_title')}</h2>
              <p className="text-slate-500 text-sm mt-1">{t('auth.register_desc')}</p>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                  <CheckCircle className="w-3 h-3" /> Core ERP gratuit à vie
                </span>
                <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                  <Calendar className="w-3 h-3" /> 15j d&apos;essai modules avancés
                </span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-4">

              {/* Google */}
              <button
                type="button"
                onClick={handleGoogle}
                disabled={googleLoading}
                className="w-full h-11 flex items-center justify-center gap-2.5 bg-white hover:bg-slate-50 disabled:opacity-60 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 transition-colors shadow-sm"
              >
                {googleLoading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : <GoogleIcon />}
                {t('auth.register_google')}
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400">{t('auth.register_or')}</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">

                {/* Name */}
                <div>
                  <label htmlFor="name" className={labelCls}>{t('auth.field_name')}</label>
                  <input id="name" type="text" placeholder="Ahmed Benali" autoComplete="name" className={inputCls} {...register('name')} />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className={labelCls}>{t('auth.field_email')}</label>
                  <input id="email" type="email" placeholder={t('auth.field_email_placeholder')} autoComplete="email" className={inputCls} {...register('email')} />
                  {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className={labelCls}>{t('auth.field_password')}</label>
                  <input id="password" type="password" autoComplete="new-password" className={inputCls} {...register('password')} />
                  <p className="text-xs text-slate-400 mt-1">{t('auth.pw_hint')}</p>
                  {errors.password && <p className="text-xs text-red-500 mt-0.5">{errors.password.message}</p>}
                </div>

                {/* Phone + Birthdate */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="phone" className={labelCls}>{t('auth.field_phone')}</label>
                    <input id="phone" type="tel" placeholder={t('auth.field_phone_placeholder')} autoComplete="tel" className={inputCls} {...register('phone')} />
                    {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
                  </div>
                  <div>
                    <label htmlFor="birthDate" className={labelCls}>{t('auth.field_birthdate')}</label>
                    <input
                      id="birthDate"
                      type="date"
                      max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                      className={inputCls}
                      {...register('birthDate')}
                    />
                    {errors.birthDate && <p className="text-xs text-red-500 mt-1">{errors.birthDate.message}</p>}
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-yelha-500 hover:bg-yelha-600 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm shadow-yelha-500/20 mt-1"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t('auth.register_submit')}
                </button>
              </form>

              {/* Legal */}
              <p className="text-xs text-slate-400 text-center leading-relaxed pt-1">
                {t('auth.legal_accept')}{' '}
                <Link href="/conditions" className="text-yelha-600 hover:underline">{t('auth.legal_terms')}</Link>
                {' '}{t('auth.legal_and')}{' '}
                <Link href="/confidentialite" className="text-yelha-600 hover:underline">{t('auth.legal_privacy')}</Link>
              </p>
            </div>

            <p className="text-sm text-slate-500 text-center mt-5">
              {t('auth.register_have_account')}{' '}
              <Link href="/login" className="text-yelha-600 hover:text-yelha-700 font-semibold hover:underline">
                {t('auth.register_login')}
              </Link>
            </p>

            <p className="text-center text-xs text-slate-400 mt-4">
              © {new Date().getFullYear()} YelhaSubs — Alger, Algérie
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
