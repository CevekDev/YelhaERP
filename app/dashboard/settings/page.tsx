'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { CreditCard, ChevronRight, CheckCircle, User } from 'lucide-react'

const SECTIONS = [
  {
    href: '/dashboard/settings/billing',
    icon: CreditCard,
    label: 'Abonnement',
    description: 'Plan actuel, renouvellement, factures',
  },
  {
    href: '/dashboard/settings/profile',
    icon: User,
    label: 'Mon profil',
    description: 'Nom, téléphone, mot de passe, langue',
  },
]

function SettingsContent() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const upgraded = searchParams.get('upgraded') === '1'

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground text-sm mt-1">{session?.user?.email}</p>
      </div>

      {upgraded && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          <CheckCircle className="w-5 h-5 shrink-0" />
          Paiement reçu. Votre plan sera mis à jour sous peu.
        </div>
      )}

      <div className="rounded-2xl border border-border bg-card divide-y divide-border">
        {SECTIONS.map(s => (
          <Link
            key={s.href}
            href={s.href}
            className="flex items-center gap-4 p-5 hover:bg-accent/50 transition-colors first:rounded-t-2xl last:rounded-b-2xl group"
          >
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <s.icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{s.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Chargement…</div>}>
      <SettingsContent />
    </Suspense>
  )
}
