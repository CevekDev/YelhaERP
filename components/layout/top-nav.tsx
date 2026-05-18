'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import {
  TrendingUp, Search, Settings, LogOut, User,
  FileText, Users, Truck, Package, BarChart3, Calculator, Receipt,
  Bot, Bell, Factory, Briefcase, UserCheck, Layers,
  Building2, ShoppingCart, ShoppingBag, LayoutDashboard, ChevronDown, X, RefreshCw,
  UtensilsCrossed, CreditCard,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NotificationBell } from '@/components/layout/notification-bell'
import { MobileSidebarTrigger } from '@/components/layout/sidebar'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { useT } from '@/lib/i18n'
import { APPS } from '@/lib/pricing/config'


// ── Module definitions ──────────────────────────────────────
export const MODULES = [
  {
    id: 'dashboard',
    label: 'Tableau de bord',
    icon: LayoutDashboard,
    color: 'bg-slate-600',
    href: '/dashboard',
    prefixes: ['/dashboard'],
    subNav: [],
  },
  {
    id: 'ventes',
    label: 'Ventes',
    icon: FileText,
    color: 'bg-blue-600',
    href: '/dashboard/invoices',
    prefixes: ['/dashboard/invoices', '/dashboard/quotes', '/dashboard/clients'],
    subNav: [
      { label: 'Devis', href: '/dashboard/quotes' },
      { label: 'Factures', href: '/dashboard/invoices' },
      { label: 'Clients', href: '/dashboard/clients' },
    ],
  },
  {
    id: 'achats',
    label: 'Achats',
    icon: ShoppingCart,
    color: 'bg-orange-600',
    href: '/dashboard/purchases/orders',
    prefixes: ['/dashboard/purchases', '/dashboard/suppliers'],
    subNav: [
      { label: 'Bons de commande', href: '/dashboard/purchases/orders' },
      { label: 'Réceptions', href: '/dashboard/purchases/receipts' },
      { label: 'Factures fournisseurs', href: '/dashboard/purchases/invoices' },
      { label: 'Fournisseurs', href: '/dashboard/suppliers' },
    ],
  },
  {
    id: 'stocks',
    label: 'Stocks',
    icon: Package,
    color: 'bg-emerald-600',
    href: '/dashboard/products',
    prefixes: ['/dashboard/products', '/dashboard/stock'],
    subNav: [
      { label: 'Produits', href: '/dashboard/products' },
      { label: 'Mouvements', href: '/dashboard/stock' },
      { label: 'Transferts', href: '/dashboard/stock/transfers' },
      { label: 'Entrepôts', href: '/dashboard/stock/warehouses' },
    ],
  },
  {
    id: 'compta',
    label: 'Compta',
    icon: Calculator,
    color: 'bg-violet-600',
    href: '/dashboard/accounting',
    prefixes: ['/dashboard/accounting', '/dashboard/tax', '/dashboard/expenses', '/dashboard/accounting/g50'],
    subNav: [
      { label: 'Journal', href: '/dashboard/accounting/journal' },
      { label: 'Grand livre', href: '/dashboard/accounting/grand-livre' },
      { label: 'Balance', href: '/dashboard/accounting/balance' },
      { label: 'Bilan', href: '/dashboard/accounting/bilan' },
      { label: 'Résultat', href: '/dashboard/accounting/resultat' },
      { label: 'Plan comptable', href: '/dashboard/accounting/plan-comptable' },
      { label: 'Périodes', href: '/dashboard/accounting/periodes' },
      { label: 'Dépenses', href: '/dashboard/expenses' },
      { label: 'Fiscalité', href: '/dashboard/tax' },
      { label: 'G50 — Déclaration', href: '/dashboard/accounting/g50' },
    ],
  },
  {
    id: 'rh',
    label: 'RH',
    icon: UserCheck,
    color: 'bg-pink-600',
    href: '/dashboard/payroll',
    prefixes: ['/dashboard/payroll', '/dashboard/hr'],
    subNav: [
      { label: 'Employés', href: '/dashboard/payroll' },
      { label: 'Congés', href: '/dashboard/hr/leaves' },
      { label: 'Recrutement', href: '/dashboard/hr/recruitment' },
      { label: 'Évaluations', href: '/dashboard/hr/reviews' },
      { label: 'Organigramme', href: '/dashboard/hr/org-chart' },
    ],
  },
  {
    id: 'projets',
    label: 'Projets',
    icon: Briefcase,
    color: 'bg-cyan-600',
    href: '/dashboard/projects',
    prefixes: ['/dashboard/projects'],
    subNav: [
      { label: 'Projets', href: '/dashboard/projects' },
      { label: 'Feuilles de temps', href: '/dashboard/projects/timesheets' },
    ],
  },
  {
    id: 'production',
    label: 'Production',
    icon: Factory,
    color: 'bg-amber-600',
    href: '/dashboard/production/orders',
    prefixes: ['/dashboard/production'],
    subNav: [
      { label: 'Ordres de fab.', href: '/dashboard/production/orders' },
      { label: 'Nomenclatures', href: '/dashboard/production/bom' },
    ],
  },
  {
    id: 'crm',
    label: 'CRM',
    icon: Users,
    color: 'bg-rose-600',
    href: '/dashboard/crm/pipeline',
    prefixes: ['/dashboard/crm'],
    subNav: [
      { label: 'Pipeline', href: '/dashboard/crm/pipeline' },
      { label: 'Leads', href: '/dashboard/crm/leads' },
      { label: 'Statistiques', href: '/dashboard/crm/stats' },
    ],
  },
  {
    id: 'pos',
    label: 'Caisse',
    icon: CreditCard,
    color: 'bg-green-600',
    href: '/dashboard/pos',
    prefixes: ['/dashboard/pos'],
    subNav: [
      { label: 'Caisse', href: '/dashboard/pos' },
      { label: 'Sessions', href: '/dashboard/pos/sessions' },
      { label: 'Dettes', href: '/dashboard/pos/debts' },
    ],
  },
  {
    id: 'ecommerce',
    label: 'E-commerce',
    icon: ShoppingBag,
    color: 'bg-teal-600',
    href: '/dashboard/ecommerce',
    prefixes: ['/dashboard/ecommerce'],
    subNav: [
      { label: 'Commandes', href: '/dashboard/ecommerce' },
      { label: 'Livraison', href: '/dashboard/ecommerce/delivery' },
    ],
  },
  {
    id: 'abonnements',
    label: 'Abonnements',
    icon: RefreshCw,
    color: 'bg-indigo-600',
    href: '/dashboard/subscriptions',
    prefixes: ['/dashboard/subscriptions'],
    subNav: [
      { label: 'Abonnements', href: '/dashboard/subscriptions' },
      { label: 'Plans', href: '/dashboard/subscriptions/plans' },
    ],
  },
  {
    id: 'restaurant',
    label: 'Restaurant',
    icon: UtensilsCrossed,
    color: 'bg-orange-500',
    href: '/dashboard/restaurant',
    prefixes: ['/dashboard/restaurant'],
    subNav: [
      { label: 'Salle & tables',   href: '/dashboard/restaurant' },
      { label: 'Commandes',        href: '/dashboard/restaurant/orders' },
      { label: 'Cuisine (KDS)',    href: '/dashboard/restaurant/kds' },
      { label: 'Menu',             href: '/dashboard/restaurant/menu' },
      { label: 'Réservations',     href: '/dashboard/restaurant/reservations' },
      { label: 'Stocks cuisine',   href: '/dashboard/restaurant/ingredients' },
      { label: 'Fidélité',         href: '/dashboard/restaurant/loyalty' },
      { label: 'Statistiques',     href: '/dashboard/restaurant/stats' },
      { label: 'Configuration',    href: '/dashboard/restaurant/config' },
    ],
  },
] as const

type Module = typeof MODULES[number]

function getActiveModule(pathname: string): Module | undefined {
  // Most specific match first (longest prefix)
  return MODULES
    .filter(m => m.prefixes.some(p => pathname === p || pathname.startsWith(p + '/')))
    .sort((a, b) => {
      const aLen = Math.max(...a.prefixes.map(p => p.length))
      const bLen = Math.max(...b.prefixes.map(p => p.length))
      return bLen - aLen
    })[0]
}

// ── Global Search ────────────────────────────────────────────
function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(true)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-muted/50 text-sm text-muted-foreground hover:border-primary/30 hover:bg-muted transition-all w-56"
    >
      <Search className="h-3.5 w-3.5" />
      <span>Rechercher…</span>
      <kbd className="ml-auto text-[10px] bg-background border border-border rounded px-1.5 py-0.5 font-mono">⌃K</kbd>
    </button>
  )

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-start justify-center pt-24" onClick={() => setOpen(false)}>
      <div className="w-full max-w-xl bg-background rounded-xl border border-border shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Rechercher clients, factures, produits…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-3">
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { label: 'Clients', icon: Users, href: '/dashboard/clients' },
              { label: 'Factures', icon: FileText, href: '/dashboard/invoices' },
              { label: 'Produits', icon: Package, href: '/dashboard/products' },
              { label: 'Leads CRM', icon: TrendingUp, href: '/dashboard/crm/leads' },
              { label: 'Projets', icon: Briefcase, href: '/dashboard/projects' },
              { label: 'Fournisseurs', icon: Truck, href: '/dashboard/suppliers' },
            ].map(item => (
              <button
                key={item.href}
                onClick={() => { router.push(item.href); setOpen(false) }}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted text-sm text-left transition-colors"
              >
                <item.icon className="h-4 w-4 text-muted-foreground" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}


// ── Module → App IDs mapping ─────────────────────────────────
const MODULE_APPS: Record<string, string[]> = {
  ventes:      ['invoices', 'quotes', 'clients'],
  achats:      ['purchases'],
  stocks:      ['stock'],
  compta:      ['accounting', 'expenses', 'tax'],
  rh:          ['hr', 'payroll'],
  projets:     ['projects'],
  production:  ['production'],
  crm:         ['crm'],
  pos:         ['pos'],
  ecommerce:   ['ecommerce'],
  abonnements: ['subscriptions'],
  restaurant:  ['restaurant'],
}


// ── Top Navbar ───────────────────────────────────────────────
export function TopNav({ hasBanner: _h }: { hasBanner?: boolean }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { t } = useT()
  const [activeApps, setActiveApps] = useState<string[] | null>(null)

  useEffect(() => {
    if (session?.user) {
      fetch('/api/billing/subscription')
        .then(r => r.json())
        .then(d => { if (d.activeApps) setActiveApps(d.activeApps) })
        .catch(() => {})
    }
  }, [session?.user])

  const visibleModules = MODULES.filter(m => {
    if (m.id === 'dashboard') return true
    const appIds = MODULE_APPS[m.id]
    if (!appIds) return true
    // While loading → only show modules whose apps are all core (always free)
    if (!activeApps) return appIds.every(id => (APPS as Record<string, { core: boolean }>)[id]?.core)
    return appIds.some(appId => activeApps.includes(appId))
  })

  const activeModule = getActiveModule(pathname)
  const initials = (session?.user?.name ?? 'U')
    .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <>
      {/* Main top bar */}
      <header className={cn("fixed w-full h-14 bg-background border-b border-border z-50 flex items-center px-4 gap-3", "top-0")}>
        {/* Mobile hamburger (legacy sidebar on small screens) */}
        <div className="md:hidden">
          <MobileSidebarTrigger />
        </div>

        {/* Module tabs — scrollable so right icons always stay visible */}
        <nav className="hidden md:flex items-center gap-0.5 min-w-0 overflow-x-auto scrollbar-hide flex-1">
          {visibleModules.map(module => {
            const isActive = activeModule?.id === module.id
            const appIds = MODULE_APPS[module.id]
            const isComingSoon = !!appIds?.length &&
              appIds.every(id => (APPS as Record<string, { comingSoon: boolean }>)[id]?.comingSoon)

            if (isComingSoon) {
              return (
                <span
                  key={module.id}
                  title="Bientôt disponible"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap shrink-0 text-muted-foreground/40 cursor-not-allowed select-none"
                >
                  <module.icon className="h-3.5 w-3.5" />
                  <span>{t('modules.' + module.id)}</span>
                  <span className="text-[9px] font-bold bg-slate-100 text-slate-400 px-1 py-0.5 rounded-full leading-none">
                    Bientôt
                  </span>
                </span>
              )
            }

            return (
              <Link
                key={module.id}
                href={module.href}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap shrink-0',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                )}
              >
                <module.icon className="h-3.5 w-3.5" />
                <span>{t('modules.' + module.id)}</span>
              </Link>
            )
          })}
        </nav>

        {/* Right side — always visible */}
        <div className="flex items-center gap-1 ml-auto shrink-0">

          <LanguageSwitcher />
          <NotificationBell />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 p-1 rounded-lg hover:bg-muted transition-colors ml-0.5">
                <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                  {initials}
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-xs font-medium text-foreground leading-none max-w-[120px] truncate">{session?.user?.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{session?.user?.companyName}</p>
                </div>
                <ChevronDown className="hidden lg:block h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>
                <p className="font-medium truncate">{session?.user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings/profile" className="flex items-center gap-2 cursor-pointer">
                  <User className="h-4 w-4" />Profil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings/billing" className="flex items-center gap-2 cursor-pointer">
                  <CreditCard className="h-4 w-4" />Mon abonnement
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings" className="flex items-center gap-2 cursor-pointer">
                  <Settings className="h-4 w-4" />Paramètres
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600 cursor-pointer"
                onClick={() => signOut({ callbackUrl: '/login' })}
              >
                <LogOut className="h-4 w-4 mr-2" />Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Contextual sub-nav */}
      {activeModule && activeModule.subNav.length > 0 && (
        <SubNav module={activeModule} pathname={pathname} />
      )}
    </>
  )
}

// href → translation key (when sidebar key matches semantically)
const SUBNAV_KEYS: Record<string, string> = {
  '/dashboard/quotes':              'sidebar.quotes',
  '/dashboard/invoices':            'sidebar.invoices',
  '/dashboard/clients':             'sidebar.clients',
  '/dashboard/suppliers':           'sidebar.suppliers',
  '/dashboard/products':            'sidebar.products',
  '/dashboard/stock':               'sidebar.stock',
  '/dashboard/expenses':            'sidebar.expenses',
  '/dashboard/tax':                 'sidebar.tax',
  '/dashboard/settings':            'sidebar.settings',
  '/dashboard/notifications':       'sidebar.notifications',
  '/dashboard/subscriptions':       'modules.abonnements',
  '/dashboard/subscriptions/plans': 'pricing.badge',
}

// ── Sub Navigation ───────────────────────────────────────────
function SubNav({ module, pathname }: { module: Module; pathname: string }) {
  const { t } = useT()
  return (
    <nav className="fixed w-full h-10 bg-background border-b border-border z-40 flex items-center px-4 gap-1 overflow-x-auto top-14">
      {module.subNav.map((item: { label: string; href: string }) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
        const key = SUBNAV_KEYS[item.href]
        const label = key ? t(key) : item.label
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center px-3 py-1 rounded-md text-sm font-medium whitespace-nowrap transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted',
            )}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
