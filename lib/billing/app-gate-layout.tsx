import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { canAccessApp } from '@/lib/billing/check-app-access'
import type { AppId } from '@/lib/pricing/config'

interface Props {
  appId: AppId
  appName: string
  children: React.ReactNode
}

export async function AppGateLayout({ appId, appName, children }: Props) {
  const session = await auth()
  if (!session?.user?.companyId) redirect('/login')

  const hasAccess = await canAccessApp(session.user.companyId, appId)

  if (!hasAccess) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <div className="max-w-md text-center space-y-4">
          <div className="text-5xl">🔒</div>
          <h2 className="text-xl font-bold text-slate-900">Module non activé</h2>
          <p className="text-slate-500 text-sm">
            Le module <strong>{appName}</strong> n&apos;est pas inclus dans votre abonnement actuel.
            Passez à un plan supérieur pour y accéder.
          </p>
          <Link
            href="/dashboard/settings/billing"
            className="inline-block rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Voir mon abonnement →
          </Link>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
