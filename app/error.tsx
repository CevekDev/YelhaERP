'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('App error boundary:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md text-center space-y-4">
        <div className="text-5xl">⚠️</div>
        <h1 className="text-xl font-bold text-foreground">Une erreur est survenue</h1>
        <p className="text-sm text-muted-foreground">
          Désolé, quelque chose s&apos;est mal passé. Vous pouvez réessayer ou retourner au tableau de bord.
        </p>
        {error.digest && (
          <p className="text-[11px] text-muted-foreground/60 font-mono">Réf : {error.digest}</p>
        )}
        <div className="flex gap-2 justify-center pt-2">
          <button
            onClick={reset}
            className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            Réessayer
          </button>
          <Link
            href="/dashboard"
            className="rounded-xl border border-border px-5 py-2 text-sm font-semibold hover:bg-muted"
          >
            Accueil
          </Link>
        </div>
      </div>
    </div>
  )
}
