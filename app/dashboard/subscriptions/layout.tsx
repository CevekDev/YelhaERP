// La gate d'accès au module est désormais gérée au niveau du dashboard layout
// (modal "essai expiré" si YelhaSubscription EXPIRED/TRIAL expiré).
// Plus besoin de check par-app puisque YelhaSubs IS l'app.
export default function SubscriptionsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
