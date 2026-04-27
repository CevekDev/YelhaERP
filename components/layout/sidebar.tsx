'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, FileText, Users, Truck, Package, BarChart3,
  Calculator, Receipt, Bot, Settings, LogOut, TrendingUp, ShoppingBag,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const navItems = [
  { href: '/dashboard', label: 'Tableau de bord', labelAr: 'لوحة القيادة', icon: LayoutDashboard },
  { href: '/dashboard/invoices', label: 'Facturation', labelAr: 'الفوترة', icon: FileText },
  { href: '/dashboard/clients', label: 'Clients', labelAr: 'العملاء', icon: Users },
  { href: '/dashboard/suppliers', label: 'Fournisseurs', labelAr: 'الموردون', icon: Truck },
  { href: '/dashboard/products', label: 'Produits', labelAr: 'المنتجات', icon: Package },
  { href: '/dashboard/stock', label: 'Stock', labelAr: 'المخزون', icon: BarChart3 },
  { href: '/dashboard/payroll', label: 'Paie', labelAr: 'الرواتب', icon: Calculator },
  { href: '/dashboard/accounting', label: 'Comptabilité', labelAr: 'المحاسبة', icon: Receipt },
  { href: '/dashboard/tax', label: 'Fiscalité', labelAr: 'الضرائب', icon: TrendingUp },
  { href: '/dashboard/integrations', label: 'Intégrations', labelAr: 'التكاملات', icon: ShoppingBag },
  { href: '/dashboard/ai', label: 'Assistant IA', labelAr: 'مساعد الذكاء', icon: Bot, badge: 'IA' },
  { href: '/dashboard/settings', label: 'Paramètres', labelAr: 'الإعدادات', icon: Settings },
]

interface SidebarProps {
  companyName: string
  plan: string
  isRTL?: boolean
}

export function Sidebar({ companyName, plan, isRTL = false }: SidebarProps) {
  const pathname = usePathname()

  const planColors: Record<string, string> = {
    TRIAL: 'bg-amber-100 text-amber-800',
    STARTER: 'bg-blue-100 text-blue-800',
    PRO: 'bg-yelha-100 text-yelha-800',
    AGENCY: 'bg-purple-100 text-purple-800',
  }

  return (
    <aside className={cn(
      'fixed top-0 left-0 h-screen w-[240px] flex flex-col border-r bg-card z-40',
      isRTL && 'left-auto right-0 border-r-0 border-l'
    )}>
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 h-16 border-b shrink-0">
        <div className="w-8 h-8 bg-yelha-500 rounded-lg flex items-center justify-center shrink-0">
          <TrendingUp className="w-4 h-4 text-white" />
        </div>
        <div className="overflow-hidden">
          <p className="font-bold text-sm text-yelha-700 leading-none truncate">YelhaERP</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">{companyName}</p>
        </div>
      </div>

      {/* Plan badge */}
      <div className="px-4 py-2">
        <span className={cn(
          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
          planColors[plan] ?? planColors.TRIAL
        )}>
          Plan {plan}
        </span>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors mb-0.5',
                active
                  ? 'bg-yelha-500 text-white'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">{isRTL ? item.labelAr : item.label}</span>
              {item.badge && (
                <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4">
                  {item.badge}
                </Badge>
              )}
            </Link>
          )
        })}
      </nav>

      <Separator />

      {/* Logout */}
      <div className="p-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-destructive"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          <LogOut className="h-4 w-4 mr-3" />
          {isRTL ? 'تسجيل الخروج' : 'Se déconnecter'}
        </Button>
      </div>
    </aside>
  )
}
