import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { TopNav } from '@/components/layout/top-nav'
import { KeyboardShortcuts } from '@/components/providers/keyboard-shortcuts'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const [sub, user] = session.user.id
    ? await Promise.all([
        prisma.yelhaSubscription.findUnique({
          where: { userId: session.user.id },
          select: { status: true, trialEndsAt: true },
        }),
        prisma.user.findUnique({
          where: { id: session.user.id },
          select: { isBanned: true },
        }),
      ])
    : [null, null]

  const isExpired = sub?.status === 'EXPIRED' ||
    (sub?.status === 'TRIAL' && sub?.trialEndsAt && sub.trialEndsAt < new Date())

  return (
    <div className="dark min-h-screen bg-[#0d0d0f]">
      {/* Compte banni — blocking modal */}
      {user?.isBanned && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '2.5rem', maxWidth: 460, textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,.3)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Compte suspendu</h2>
            <p style={{ color: '#64748b', fontSize: 15, marginBottom: 24 }}>Votre compte a été suspendu. Contactez le support pour plus d&apos;informations.</p>
            <a href="mailto:contact@yelha.net" style={{ display: 'inline-block', background: '#ef4444', color: '#fff', fontWeight: 600, padding: '12px 32px', borderRadius: 10, textDecoration: 'none', fontSize: 15 }}>
              Contacter le support →
            </a>
          </div>
        </div>
      )}

      {/* Trial expired — blocking modal */}
      {!user?.isBanned && isExpired && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '2.5rem', maxWidth: 460, textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,.25)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏰</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Votre essai gratuit est terminé</h2>
            <p style={{ color: '#64748b', fontSize: 15, marginBottom: 24 }}>Choisissez un plan pour continuer à utiliser YelhaSubs.</p>
            <Link href="/pricing" style={{ display: 'inline-block', background: '#1D9E75', color: '#fff', fontWeight: 600, padding: '12px 32px', borderRadius: 10, textDecoration: 'none', fontSize: 15 }}>
              Voir les plans →
            </Link>
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 16 }}>Vos données sont conservées 30 jours supplémentaires.</p>
          </div>
        </div>
      )}

      <TopNav hasBanner={false} />
      <KeyboardShortcuts />
      <main className="pt-14 min-h-screen">
        {children}
      </main>
    </div>
  )
}
