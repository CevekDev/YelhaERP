import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TopNav } from '@/components/layout/top-nav'
import { ChatWidget } from '@/components/ai/chat-widget'
import { KeyboardShortcuts } from '@/components/providers/keyboard-shortcuts'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')
  if (!session.user.businessType) redirect('/onboarding')

  const sub = session.user.companyId
    ? await prisma.yelhaSubscription.findUnique({
        where: { companyId: session.user.companyId },
        select: { status: true, trialEndsAt: true, trialApps: true },
      })
    : null

  const isTrial  = sub?.status === 'TRIAL'
  const isExpired = sub?.status === 'EXPIRED' ||
    (isTrial && sub?.trialEndsAt && sub.trialEndsAt < new Date())

  const daysLeft = sub?.trialEndsAt
    ? Math.max(0, Math.ceil((sub.trialEndsAt.getTime() - Date.now()) / 86400000))
    : 0

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Trial expired — blocking modal */}
      {isExpired && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '2.5rem', maxWidth: 460, textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,.25)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏰</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Votre essai gratuit est terminé</h2>
            <p style={{ color: '#64748b', fontSize: 15, marginBottom: 24 }}>Choisissez un plan pour continuer à utiliser YelhaERP.</p>
            <Link href="/pricing" style={{ display: 'inline-block', background: '#1D9E75', color: '#fff', fontWeight: 600, padding: '12px 32px', borderRadius: 10, textDecoration: 'none', fontSize: 15 }}>
              Voir les plans →
            </Link>
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 16 }}>Vos données sont conservées 30 jours supplémentaires.</p>
          </div>
        </div>
      )}

      {/* Trial active — info banner */}
      {isTrial && !isExpired && (
        <div style={{ background: '#E1F5EE', borderBottom: '0.5px solid #1D9E75', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 60 }}>
          <span style={{ fontSize: 13, color: '#0F6E56' }}>
            🎁 Essai gratuit — {daysLeft} jour{daysLeft !== 1 ? 's' : ''} restant{daysLeft !== 1 ? 's' : ''}
            {sub && sub.trialApps.length > 0
              ? ` · ${sub.trialApps.length} app${sub.trialApps.length > 1 ? 's' : ''} activée${sub.trialApps.length > 1 ? 's' : ''}`
              : ' · '}
            {sub && sub.trialApps.length === 0 && (
              <Link href="/onboarding/apps" style={{ color: '#0F6E56', fontWeight: 600 }}> Choisissez vos 3 apps →</Link>
            )}
          </span>
          <Link href="/pricing" style={{ fontSize: 12, fontWeight: 500, color: '#0F6E56', textDecoration: 'underline' }}>
            Passer à un plan payant
          </Link>
        </div>
      )}

      <TopNav />
      <KeyboardShortcuts />
      <main className={`pt-14 md:pt-24 min-h-screen${isTrial && !isExpired ? ' mt-9' : ''}`}>
        {children}
      </main>
      <ChatWidget />
    </div>
  )
}
