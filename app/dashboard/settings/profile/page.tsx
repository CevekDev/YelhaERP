'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useT } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n/translations'
import { signOut, useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Loader2, LogOut, Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'

interface UserProfile {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  createdAt: string
  hasPassword: boolean
}

const LANGS: { code: Locale; label: string; flag: string }[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ar', label: 'العربية', flag: '🇩🇿' },
]

export default function ProfilePage() {
  const { t, locale, setLocale } = useT()
  const { data: session } = useSession()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  // Password change
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    fetch('/api/settings/profile')
      .then(r => r.json())
      .then(d => {
        if (d.id) {
          setProfile(d)
          setName(d.name ?? '')
          setPhone(d.phone ?? '')
        }
      })
      .catch(() => toast.error(t('profile.loading_error')))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSaveProfile() {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || undefined, phone: phone.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? t('common.error')); return }
      setProfile(prev => prev ? { ...prev, ...data } : prev)
      toast.success(t('profile.saved'))
    } catch {
      toast.error(t('profile.network_error'))
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword() {
    if (!newPassword) { toast.error(t('profile.pwd_required')); return }
    if (newPassword.length < 8) { toast.error(t('profile.pwd_too_short')); return }
    if (newPassword !== confirmPassword) { toast.error(t('profile.pwd_mismatch')); return }
    setSavingPassword(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? t('common.error')); return }
      toast.success(t('profile.pwd_changed'))
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      toast.error(t('profile.network_error'))
    } finally {
      setSavingPassword(false)
    }
  }

  const initials = (profile?.name ?? session?.user?.name ?? 'U')
    .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const AVATAR_COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-rose-500', 'bg-amber-500']
  const avatarColor = AVATAR_COLORS[(initials.charCodeAt(0) ?? 0) % AVATAR_COLORS.length]

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )

  return (
    <div>
      <Header title={t('profile.title')} />
      <div className="p-4 md:p-6 max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t('profile.title')}</h1>
          <p className="text-muted-foreground text-sm mt-1">{t('profile.desc')}</p>
        </div>

        {/* Avatar + identity */}
        <Card>
          <CardContent className="p-4 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className={`w-16 h-16 rounded-full ${avatarColor} flex items-center justify-center text-white text-xl font-bold shrink-0`}>
                {initials}
              </div>
              <div>
                <p className="font-semibold text-lg">{profile?.name}</p>
                <p className="text-sm text-muted-foreground">{profile?.role}</p>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>{t('profile.full_name')}</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder={t('profile.name_placeholder')} />
              </div>
              <div className="space-y-2">
                <Label>{t('profile.email_label')}</Label>
                <Input value={profile?.email ?? ''} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">{t('profile.email_hint')}</p>
              </div>
              <div className="space-y-2">
                <Label>{t('profile.phone_label')}</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="05XXXXXXXX" />
              </div>
            </div>

            <Button onClick={handleSaveProfile} disabled={saving} className="w-full sm:w-auto">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t('profile.save_btn')}
            </Button>
          </CardContent>
        </Card>

        {/* Language preference */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <h2 className="font-semibold mb-1">{t('profile.lang_title')}</h2>
            <p className="text-xs text-muted-foreground mb-4">{t('profile.lang_desc')}</p>
            <div className="flex gap-2 flex-wrap">
              {LANGS.map(l => (
                <button
                  key={l.code}
                  onClick={() => setLocale(l.code)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                    locale === l.code
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-muted-foreground hover:bg-muted'
                  }`}
                >
                  <span className="text-base">{l.flag}</span>
                  <span>{l.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Theme preference */}
        <Card>
          <CardContent className="p-4 sm:p-6">
            <h2 className="font-semibold mb-1">{t('profile.theme_title')}</h2>
            <p className="text-xs text-muted-foreground mb-4">{t('profile.theme_desc')}</p>
            {mounted && (
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setTheme('light')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                    resolvedTheme === 'light'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Sun className="h-4 w-4" />
                  {t('profile.theme_light')}
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                    resolvedTheme === 'dark'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Moon className="h-4 w-4" />
                  {t('profile.theme_dark')}
                </button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Change password — only for non-OAuth users */}
        {profile?.hasPassword ? (
          <Card>
            <CardContent className="p-4 sm:p-6 space-y-4">
              <h2 className="font-semibold">{t('profile.pwd_title')}</h2>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>{t('profile.pwd_current')}</Label>
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('profile.pwd_new')}</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder={t('profile.pwd_new_placeholder')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('profile.pwd_confirm')}</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <Button onClick={handleChangePassword} disabled={savingPassword} variant="outline">
                {savingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t('profile.pwd_save_btn')}
              </Button>
            </CardContent>
          </Card>
        ) : profile && !profile.hasPassword ? (
          <Card>
            <CardContent className="p-4 sm:p-6">
              <h2 className="font-semibold mb-2">{t('profile.pwd_title')}</h2>
              <p className="text-sm text-muted-foreground">{t('profile.pwd_google_note')}</p>
            </CardContent>
          </Card>
        ) : null}

        {/* Sign out */}
        <Card className="border-red-200">
          <CardContent className="p-4 sm:p-6">
            <h2 className="font-semibold text-red-600 mb-3">{t('profile.logout_title')}</h2>
            <Button
              variant="destructive"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              {t('profile.logout_btn')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
