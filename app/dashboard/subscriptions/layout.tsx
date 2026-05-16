import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { canAccessApp } from '@/lib/billing/check-app-access'

export default async function SubscriptionsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.companyId) redirect('/login')

  const hasAccess = await canAccessApp(session.user.companyId, 'subscriptions')

  if (!hasAccess) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <div className="max-w-md text-center space-y-4">
          <div className="text-5xl">🔒</div>
          <h2 className="text-xl font-bold text-slate-900">Application non activée</h2>
          <p className="text-slate-500 text-sm">
            Le module <strong>Abonnements clients</strong> nécessite un abonnement actif.
            Démarrez un essai gratuit de 15 jours ou choisissez un plan.
          </p>
          <Link
            href="/dashboard/settings/applications"
            className="inline-block rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Voir les plans →
          </Link>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
