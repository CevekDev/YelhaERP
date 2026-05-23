'use client'

import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Loader2, TrendingUp, ArrowLeft, Users,
  CheckCircle, RefreshCw, Bell, BarChart3, CreditCard, Shield,
} from 'lucide-react'
import { useT } from '@/lib/i18n'
import { LanguageSwitcher } from '@/components/ui/language-switcher'

const schema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
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

type Mode = 'owner' | 'collaborateur'

function LoginForm() {
  const params = useSearchParams()
  const raw = params.get('callbackUrl') ?? '/dashboard'
  const AUTH_PAGES = ['/login', '/register', '/verify-email']
  const callbackUrl = AUTH_PAGES.some(p => raw.startsWith(p)) ? '/dashboard' : raw

  const [loading, setLoading]           = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [mode, setMode]                 = useState<Mode>('owner')
  const { t, dir } = useT()

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({ resolver: zodResolver(schema) })

  const switchMode = (m: Mode) => { setMode(m); reset() }

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    const res = await signIn('credentials', { email: data.email, password: data.password, redirect: false })
    setLoading(false)
    if (res?.error === 'EMAIL_NOT_VERIFIED') {
      toast.error(t('auth.err_email_not_verified'))
    } else if (res?.error) {
      toast.error(mode === 'collaborateur' ? 'Identifiants incorrects. Vérifiez avec votre responsable.' : t('auth.login_error'))
    } else {
      window.location.href = callbackUrl
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    await signIn('google', { callbackUrl })
  }

  const inputCls = "w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-yelha-500/30 focus:border-yelha-400 transition-colors"
  const labelCls = "block text-sm font-medium text-slate-700 mb-1.5"

  if (mode === 'collaborateur') {
    return (
      <div dir={dir} className="space-y-4">
        <div className="flex items-start gap-2.5 p-3.5 bg-blue-50 border border-blue-200 rounded-xl">
          <Users className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700 leading-relaxed">Connexion collaborateur — utilisez les identifiants fournis par votre responsable</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="col-email" className={labelCls}>Email</label>
            <input id="col-email" type="email" placeholder="votre@entreprise.dz" autoComplete="email" className={inputCls} {...register('email')} />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
          </div>
          <div>
            <label htmlFor="col-password" className={labelCls}>Mot de passe</label>
            <input id="col-password" type="password" autoComplete="current-password" className={inputCls} {...register('password')} />
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-yelha-500 hover:bg-yelha-600 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Se connecter
          </button>
        </form>

        <button
          onClick={() => switchMode('owner')}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors mx-auto"
        >
          <ArrowLeft className="w-3 h-3" />
          Retour à la connexion principale
        </button>
      </div>
    )
  }

  return (
    <div dir={dir} className="space-y-4">
      {/* Google button — explicit white, never dark */}
      <button
        type="button"
        onClick={handleGoogle}
        disabled={googleLoading}
        className="w-full h-11 flex items-center justify-center gap-2.5 bg-white hover:bg-slate-50 disabled:opacity-60 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 transition-colors shadow-sm"
      >
        {googleLoading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : <GoogleIcon />}
        {t('auth.login_google')}
      </button>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-xs text-slate-400">{t('auth.login_or')}</span>
        <div className="flex-1 h-px bg-slate-200" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label htmlFor="email" className={labelCls}>{t('auth.field_email')}</label>
          <input id="email" type="email" placeholder={t('auth.field_email_placeholder')} autoComplete="email" className={inputCls} {...register('email')} />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="text-sm font-medium text-slate-700">{t('auth.field_password')}</label>
            <Link href="/forgot-password" className="text-xs text-yelha-600 hover:text-yelha-700 hover:underline">
              Mot de passe oublié ?
            </Link>
          </div>
          <input id="password" type="password" autoComplete="current-password" className={inputCls} {...register('password')} />
          {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 bg-yelha-500 hover:bg-yelha-600 disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm shadow-yelha-500/20"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('auth.login_submit')}
        </button>
      </form>

      <p className="text-sm text-center text-slate-500 pt-1">
        {t('auth.login_no_account')}{' '}
        <Link href="/register" className="text-yelha-600 hover:text-yelha-700 font-semibold hover:underline">
          {t('auth.login_register')}
        </Link>
      </p>

      <div className="pt-2 border-t border-slate-100 text-center">
        <button
          onClick={() => switchMode('collaborateur')}
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors underline-offset-2 hover:underline"
        >
          Accès collaborateur →
        </button>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex bg-white">

      {/* ── Left panel — branding (desktop only) ────────────── */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-1/2 bg-slate-950 flex-col justify-between p-10 xl:p-14 relative overflow-hidden flex-shrink-0">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-yelha-500/15 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-yelha-600/10 rounded-full blur-[100px]" />
          <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-yelha-500 rounded-xl flex items-center justify-center shadow-lg shadow-yelha-500/40">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">YelhaSubs</span>
          </div>

          <h1 className="text-3xl xl:text-4xl font-extrabold text-white leading-tight mb-3">
            Gérez vos abonnements<br />
            <span className="bg-gradient-to-r from-yelha-400 to-yelha-300 bg-clip-text text-transparent">clients simplement</span>
          </h1>
          <p className="text-slate-400 text-base leading-relaxed mb-8">
            Créez vos plans, gérez vos abonnés et automatisez vos rappels de paiement — en dinars algériens.
          </p>

          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { value: '15j', label: 'Essai gratuit' },
              { value: '24h', label: 'Activation CCP' },
              { value: '99.9%', label: 'Uptime' },
            ].map(s => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                <div className="text-xl font-extrabold text-white">{s.value}</div>
                <div className="text-slate-500 text-xs mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="space-y-2.5">
            {[
              { icon: Users,     label: 'Gestion illimitée de clients et abonnés',          color: 'text-yelha-400 bg-yelha-500/10' },
              { icon: RefreshCw, label: 'Renouvellements automatiques & suivi des statuts',  color: 'text-blue-400 bg-blue-500/10' },
              { icon: Bell,      label: 'Rappels par email avant chaque expiration',          color: 'text-orange-400 bg-orange-500/10' },
              { icon: BarChart3, label: 'Tableau de bord MRR, churn et revenus',             color: 'text-purple-400 bg-purple-500/10' },
            ].map(f => {
              const Icon = f.icon
              return (
                <div key={f.label} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${f.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-slate-300 text-sm">{f.label}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap gap-2.5 mt-10">
          <div className="flex items-center gap-2 bg-yelha-500/10 border border-yelha-500/20 text-yelha-400 text-xs font-semibold px-3 py-2 rounded-lg">
            <CreditCard className="w-3.5 h-3.5" /> Edahabia · CIB · CCP
          </div>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 text-slate-300 text-xs font-semibold px-3 py-2 rounded-lg">
            <Shield className="w-3.5 h-3.5 text-yelha-400" /> Paiement sécurisé
          </div>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 text-slate-300 text-xs font-semibold px-3 py-2 rounded-lg">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Essai 15j gratuit
          </div>
        </div>
      </div>

      {/* ── Right panel — form ───────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">

        {/* Top bar (always visible) */}
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
        <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
          <div className="w-full max-w-sm">

            <div className="mb-7">
              <h2 className="text-2xl font-extrabold text-slate-900">Connexion</h2>
              <p className="text-slate-500 text-sm mt-1">Accédez à votre espace de gestion</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-7">
              <Suspense fallback={
                <div className="space-y-4">
                  <div className="h-11 rounded-xl bg-slate-100 animate-pulse" />
                  <div className="h-4 bg-slate-100 rounded animate-pulse w-1/2 mx-auto" />
                  <div className="h-11 rounded-xl bg-slate-100 animate-pulse" />
                  <div className="h-11 rounded-xl bg-slate-100 animate-pulse" />
                  <div className="h-11 rounded-xl bg-slate-100 animate-pulse" />
                </div>
              }>
                <LoginForm />
              </Suspense>
            </div>

            <p className="text-center text-xs text-slate-400 mt-6">
              © {new Date().getFullYear()} YelhaSubs — Alger, Algérie
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
