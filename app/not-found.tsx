import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md text-center space-y-4">
        <div className="text-6xl font-black text-foreground/20">404</div>
        <h1 className="text-xl font-bold text-foreground">Page introuvable</h1>
        <p className="text-sm text-muted-foreground">
          La page que vous cherchez n&apos;existe pas ou a été déplacée.
        </p>
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-block rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Retour au tableau de bord
          </Link>
        </div>
      </div>
    </div>
  )
}
