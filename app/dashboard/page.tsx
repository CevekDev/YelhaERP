import { redirect } from 'next/navigation'

/**
 * Dashboard home : YelhaSubs ne sert qu'à la gestion d'abonnements, donc
 * on redirige directement vers le module subscriptions.
 */
export default function DashboardHome() {
  redirect('/dashboard/subscriptions')
}
