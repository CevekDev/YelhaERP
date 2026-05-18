import { AppGateLayout } from '@/lib/billing/app-gate-layout'

export default function PayrollLayout({ children }: { children: React.ReactNode }) {
  return <AppGateLayout appId="payroll" appName="Paie (IRG/CNAS)">{children}</AppGateLayout>
}
