import { AppGateLayout } from '@/lib/billing/app-gate-layout'

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return <AppGateLayout appId="projects" appName="Projets & timesheets">{children}</AppGateLayout>
}
