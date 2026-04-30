'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Building2, CreditCard, Plug, Users, ChevronRight, CheckCircle } from 'lucide-react'

const SECTIONS = [
  {
    href: '/dashboard/settings/entreprise',
    icon: Building2,
    label: 'Profil de l\'entreprise',
    description: 'Nom, forme juridique, NIF, adresse, coordonnées',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    href: '/dashboard/settings/billing',
    icon: CreditCard,
    label: 'Abonnement & facturation',
    description: 'Gérer votre plan, payer par EDAHABIA/CIB ou virement CCP',
    color: 'bg-yelha-50 text-yelha-600',
  },
  {
    href: '/dashboard/settings/integrations',
    icon: Plug,
    label: 'Intégrations',
    description: 'Connecter Shopify, WooCommerce et autres services',
    color: 'bg-green-50 text-green-600',
  },
  {
    href: '/dashboard/settings/admins',
    icon: Users,
    label: 'Collaborateurs & accès',
    description: 'Ajouter des administrateurs, comptables ou employés à votre espace',
    color: 'bg-purple-50 text-purple-600',
  },
]

function SettingsContent() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const upgraded = searchParams.get('upgraded') === '1'
  const plan = session?.user?.plan ?? 'TRIAL'

  return (
    <div className="p-4 md:p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground text-sm mt-1">{session?.user?.companyName}</p>
      </div>

      {upgraded && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-200 text-green-800 text-sm">
          <CheckCircle className="w-5 h-5 shrink-0" />
          Paiement reçu ! Votre plan sera mis à jour sous peu. Merci !
        </div>
      )}

      <div className="grid gap-3">
        {SECTIONS.map(s => (
          <Link key={s.href} href={s.href}
            className="flex items-center gap-4 p-4 border rounded-xl bg-card hover:shadow-sm hover:border-foreground/20 transition-all group">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.color}`}>
              <s.icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm">{s.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
          </Link>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">Plan actuel : <strong>{plan}</strong> · contact@yelhaerp.dz</p>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-muted-foreground">Chargement...</div>}>
      <SettingsContent />
    </Suspense>
  )
}
