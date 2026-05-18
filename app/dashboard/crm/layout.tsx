import { AppGateLayout } from '@/lib/billing/app-gate-layout'

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return <AppGateLayout appId="crm" appName="CRM pipeline">{children}</AppGateLayout>
}
