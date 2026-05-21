'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldAlert, Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function AdminLoginPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [shown, setShown] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      router.push('/admin')
    } else {
      const d = await res.json()
      setError(d.error ?? 'Erreur')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0d0d0f] flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center font-black text-[#0d0d0f] text-xl mx-auto">
            Y
          </div>
          <h1 className="text-xl font-bold text-white">Admin YelhaSubs</h1>
          <p className="text-sm text-white/40">Accès réservé à l&apos;administrateur</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs uppercase tracking-wider">Mot de passe</Label>
            <div className="relative">
              <Input
                type={shown ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoFocus
                className="bg-white/[0.04] border-white/[0.1] text-white placeholder:text-white/25 pr-10"
              />
              <button
                type="button"
                onClick={() => setShown(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
              >
                {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-400 flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          <Button
            type="submit"
            disabled={loading || !password}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-medium"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Se connecter'}
          </Button>

          <p className="text-[11px] text-white/20 text-center">
            Mot de passe par défaut : <code className="text-white/40">Yelha@2024</code>
          </p>
        </form>
      </div>
    </div>
  )
}
