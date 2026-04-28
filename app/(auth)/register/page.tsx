'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, TrendingUp } from 'lucide-react'
import { useT } from '@/lib/i18n'
import { LanguageSwitcher } from '@/components/ui/language-switcher'

const schema = z.object({
  name:        z.string().min(2),
  email:       z.string().email(),
  password:    z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/),
  companyName: z.string().min(2),
  phone:       z.string().min(9).regex(/^0[5-7]\d{8}$/),
  birthDate:   z.string().min(1),
})
type FormData = z.infer<typeof schema>

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const { t, dir } = useT()

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({ resolver: zodResolver(schema) })

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yelha-50 to-white p-4">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-yelha-500 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-yelha-700">YelhaERP</span>
          </div>
          <LanguageSwitcher />
        </div>

        <Card dir={dir}>
          <CardHeader className="text-center">
            <CardTitle>{t('auth.register_title')}</CardTitle>
            <CardDescription>{t('auth.register_desc')}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full gap-2" onClick={handleGoogle} disabled={googleLoading}>
              {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
              {t('auth.register_google')}
            </Button>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex-1 h-px bg-border" />
              {t('auth.register_or')}
              <div className="flex-1 h-px bg-border" />
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('auth.field_name')}</Label>
                  <Input id="name" placeholder="Ahmed Benali" {...register('name')} />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyName">{t('auth.field_company')}</Label>
                  <Input id="companyName" placeholder={t('auth.field_company_placeholder')} {...register('companyName')} />
                  {errors.companyName && <p className="text-xs text-destructive">{errors.companyName.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.field_email')}</Label>
                <Input id="email" type="email" placeholder={t('auth.field_email_placeholder')} autoComplete="email" {...register('email')} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.field_password')}</Label>
                <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
                <p className="text-xs text-muted-foreground">{t('auth.pw_hint')}</p>
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('auth.field_phone')}</Label>
                  <Input id="phone" type="tel" placeholder={t('auth.field_phone_placeholder')} {...register('phone')} />
                  {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birthDate">{t('auth.field_birthdate')}</Label>
                  <Input id="birthDate" type="date" max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]} {...register('birthDate')} />
                  {errors.birthDate && <p className="text-xs text-destructive">{errors.birthDate.message}</p>}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {t('auth.register_submit')}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex-col gap-3">
            <p className="text-sm text-muted-foreground text-center">
              {t('auth.register_have_account')}{' '}
              <Link href="/login" className="text-yelha-600 hover:underline font-medium">
                {t('auth.register_login')}
              </Link>
            </p>
            <p className="text-xs text-muted-foreground text-center">
              {t('auth.legal_accept')}{' '}
              <Link href="/conditions" className="text-yelha-600 hover:underline">{t('auth.legal_terms')}</Link>
              {' '}{t('auth.legal_and')}{' '}
              <Link href="/confidentialite" className="text-yelha-600 hover:underline">{t('auth.legal_privacy')}</Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
