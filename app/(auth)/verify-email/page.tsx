'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { TrendingUp, CheckCircle, XCircle, Mail } from 'lucide-react'
import { useT } from '@/lib/i18n'
import { LanguageSwitcher } from '@/components/ui/language-switcher'

function VerifyContent() {
  const params = useSearchParams()
  const { t } = useT()
  const success = params.get('success') === '1'
  const error = params.get('error')

  return (
    <div className="text-center">
      {success ? (
        <>
          <div className="w-16 h-16 bg-yelha-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-yelha-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">{t('auth.verify_success')}</h2>
          <p className="text-slate-500 text-sm mb-6">{t('auth.login_desc')}</p>
          <Link href="/login" className="inline-flex items-center justify-center bg-yelha-500 hover:bg-yelha-600 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-all w-full">
            {t('auth.login_submit')}
          </Link>
        </>
      ) : error ? (
        <>
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">{t('auth.verify_invalid')}</h2>
          <p className="text-slate-500 text-sm mb-6">{t('auth.verify_check')}</p>
          <Link href="/login" className="inline-flex items-center justify-center border border-slate-200 text-slate-700 font-medium px-6 py-3 rounded-xl text-sm hover:border-yelha-300 transition-all w-full">
            {t('auth.verify_login')}
          </Link>
        </>
      ) : (
        <>
          <div className="w-16 h-16 bg-yelha-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-yelha-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">{t('auth.verify_title')}</h2>
          <p className="text-slate-500 text-sm mb-2">{t('auth.verify_desc')}</p>
          <p className="text-slate-400 text-xs mb-6">{t('auth.verify_check')}</p>
          <Link href="/login" className="text-sm text-yelha-600 hover:underline">
            {t('auth.verify_login')}
          </Link>
        </>
      )}
    </div>
  )
}

export default function VerifyEmailPage() {
  const { t } = useT()
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
          <Suspense fallback={<div className="h-48 animate-pulse bg-slate-100 rounded-xl" />}>
            <VerifyContent />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
