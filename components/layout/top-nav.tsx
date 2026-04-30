'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'
import {
  TrendingUp, Grid3X3, Search, Sun, Moon, Settings, LogOut, User,
  FileText, Users, Truck, Package, BarChart3, Calculator, Receipt,
  Bot, Bell, Factory, Briefcase, UserCheck, Layers, Globe,
  Building2, ShoppingCart, LayoutDashboard, ChevronDown, X, Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NotificationBell } from '@/components/layout/notification-bell'
import { MobileSidebarTrigger } from '@/components/layout/sidebar'
import { useT } from '@/lib/i18n'
import type { Locale } from '@/lib/i18n/translations'

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
    prefixes: ['/dashboard/accounting', '/dashboard/tax', '/dashboard/expenses'],
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

// ── Apps Menu ────────────────────────────────────────────────
function AppsMenu() {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'p-2 rounded-lg transition-colors',
          open ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted',
        )}
      >
        <Grid3X3 className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-10 z-50 w-72 bg-background border border-border rounded-xl shadow-xl p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-2">Applications</p>
            <div className="grid grid-cols-3 gap-1.5">
              {MODULES.filter(m => m.id !== 'dashboard').map(module => (
                <Link
                  key={module.id}
                  href={module.href}
                  onClick={() => setOpen(false)}
                  className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg hover:bg-muted transition-colors text-center"
                >
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', module.color)}>
                    <module.icon className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs font-medium text-foreground leading-tight">{module.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Language Menu ────────────────────────────────────────────
const LANGS: { code: Locale; label: string; flag: string }[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ar', label: 'العربية', flag: '🇩🇿' },
]

function LangMenu() {
  const { locale, setLocale } = useT()
  const current = LANGS.find(l => l.code === locale) ?? LANGS[0]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-1 p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors h-8">
          <Globe className="h-4 w-4" />
          <span className="text-xs font-medium hidden lg:inline">{current.code.toUpperCase()}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {LANGS.map(l => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLocale(l.code)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <span>{l.flag}</span>
            <span className="flex-1">{l.label}</span>
            {locale === l.code && <Check className="h-3 w-3 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ── Top Navbar ───────────────────────────────────────────────
export function TopNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()

  const activeModule = getActiveModule(pathname)
  const initials = (session?.user?.name ?? 'U')
    .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const plan = session?.user?.plan ?? 'TRIAL'
  const planColors: Record<string, string> = {
    TRIAL: 'bg-amber-100 text-amber-800',
    STARTER: 'bg-blue-100 text-blue-800',
    PRO: 'bg-emerald-100 text-emerald-800',
    AGENCY: 'bg-purple-100 text-purple-800',
  }

  return (
    <>
      {/* Main top bar */}
      <header className="fixed top-0 w-full h-14 bg-background border-b border-border z-50 flex items-center px-4 gap-3">
        {/* Mobile hamburger (legacy sidebar on small screens) */}
        <div className="md:hidden">
          <MobileSidebarTrigger />
        </div>

        {/* Logo */}
        <Link href="/dashboard" className="hidden md:flex items-center gap-2 shrink-0 mr-1">
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
            <TrendingUp className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-bold text-sm text-foreground">YelhaERP</span>
        </Link>

        {/* Apps menu */}
        <div className="hidden md:block">
          <AppsMenu />
        </div>

        {/* Module tabs — scrollable so right icons always stay visible */}
        <nav className="hidden md:flex items-center gap-0.5 min-w-0 overflow-x-auto scrollbar-hide flex-1">
          {MODULES.map(module => {
            const isActive = activeModule?.id === module.id
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
                <span>{module.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Right side — always visible */}
        <div className="flex items-center gap-1 ml-2 shrink-0">
          <GlobalSearch />

          <LangMenu />

          <Button
            variant="ghost" size="icon"
            className="text-muted-foreground hover:text-foreground h-8 w-8"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

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
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-semibold mt-0.5 inline-block', planColors[plan] ?? planColors.TRIAL)}>
                    {plan}
                  </span>
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
                <Link href="/dashboard/settings" className="flex items-center gap-2 cursor-pointer">
                  <User className="h-4 w-4" />Profil
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

// ── Sub Navigation ───────────────────────────────────────────
function SubNav({ module, pathname }: { module: Module; pathname: string }) {
  return (
    <nav className="fixed top-14 w-full h-10 bg-background border-b border-border z-40 flex items-center px-4 gap-1 overflow-x-auto">
      {module.subNav.map((item: { label: string; href: string }) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
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
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
