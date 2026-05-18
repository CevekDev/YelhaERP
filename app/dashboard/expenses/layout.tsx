import { AppGateLayout } from '@/lib/billing/app-gate-layout'

export default function ExpensesLayout({ children }: { children: React.ReactNode }) {
  return <AppGateLayout appId="expenses" appName="Dépenses">{children}</AppGateLayout>
}
