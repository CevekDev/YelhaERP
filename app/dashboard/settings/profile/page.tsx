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
import { Loader2, LogOut } from 'lucide-react'

interface UserProfile {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  createdAt: string
}

const LANGS: { code: Locale; label: string; flag: string }[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ar', label: 'العربية', flag: '🇩🇿' },
]

export default function ProfilePage() {
  const { locale, setLocale } = useT()
  const { data: session } = useSession()
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
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSaveProfile() {
    setSaving(true)
    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() || undefined, phone: phone.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Erreur'); return }
      setProfile(prev => prev ? { ...prev, ...data } : prev)
      toast.success('Profil mis à jour')
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword() {
    if (!newPassword) { toast.error('Nouveau mot de passe requis'); return }
    if (newPassword.length < 8) { toast.error('Le mot de passe doit faire au moins 8 caractères'); return }
    if (newPassword !== confirmPassword) { toast.error('Les mots de passe ne correspondent pas'); return }
    setSavingPassword(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Erreur'); return }
      toast.success('Mot de passe modifié')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch {
      toast.error('Erreur réseau')
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
      <Header title="Mon profil" />
      <div className="p-4 md:p-6 max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Mon profil</h1>
          <p className="text-muted-foreground text-sm mt-1">Gérez vos informations personnelles et préférences.</p>
        </div>

        {/* Avatar + identity */}
        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-4">
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
                <Label>Nom complet</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Votre nom" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={profile?.email ?? ''} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">Pour modifier votre adresse email, contactez le support.</p>
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="05XXXXXXXX" />
              </div>
            </div>

            <Button onClick={handleSaveProfile} disabled={saving} className="w-full sm:w-auto">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enregistrer les modifications
            </Button>
          </CardContent>
        </Card>

        {/* Language preference */}
        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold mb-4">Langue d&apos;interface</h2>
            <div className="flex gap-2 flex-wrap">
              {LANGS.map(l => (
                <button
                  key={l.code}
                  onClick={() => setLocale(l.code)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                    locale === l.code
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <span>{l.flag}</span>
                  <span>{l.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Change password */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h2 className="font-semibold">Changer le mot de passe</h2>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Mot de passe actuel</Label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label>Nouveau mot de passe</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min. 8 caractères"
                />
              </div>
              <div className="space-y-2">
                <Label>Confirmer le nouveau mot de passe</Label>
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
              Modifier le mot de passe
            </Button>
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="border-red-200">
          <CardContent className="p-6">
            <h2 className="font-semibold text-red-600 mb-3">Zone de déconnexion</h2>
            <Button
              variant="destructive"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Se déconnecter
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
