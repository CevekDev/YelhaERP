export const PLANS = {
  trial: {
    id: 'trial',
    name: 'Essai gratuit',
    price: 0,
    maxUsers: 1,
    description: 'Découvrez YelhaERP sans engagement',
    durationDays: 30,
    freeApps: 3,
    limits: {
      emails: 50,
      apiRequests: 500,
      deliverers: 0,
      skus: 50,
      aiRequests: 15,
    },
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 990,
    maxUsers: 1,
    description: 'Auto-entrepreneur, artisan, commerçant',
    durationDays: null,
    freeApps: 0,
    includedApps: ['invoices', 'quotes', 'clients', 'stock', 'expenses'] as const,
    limits: {
      emails: 200,
      apiRequests: 2000,
      deliverers: 1,
      skus: 200,
      aiRequests: 30,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 2490,
    maxUsers: 5,
    description: 'PME, SARL, EURL',
    durationDays: null,
    freeApps: 0,
    includedApps: [
      'invoices', 'quotes', 'clients', 'stock', 'expenses',
      'crm', 'purchases', 'projects', 'subscriptions',
    ] as const,
    limits: {
      emails: 1000,
      apiRequests: 10000,
      deliverers: 3,
      skus: 1000,
      aiRequests: 200,
    },
  },
  business: {
    id: 'business',
    name: 'Business',
    price: 4900,
    maxUsers: 15,
    description: 'Entreprise complète',
    durationDays: null,
    freeApps: 0,
    includedApps: [
      'invoices', 'quotes', 'clients', 'stock', 'expenses',
      'crm', 'purchases', 'projects', 'subscriptions',
      'hr', 'payroll', 'accounting', 'tax', 'pos', 'production',
    ] as const,
    limits: {
      emails: 5000,
      apiRequests: 50000,
      deliverers: 10,
      skus: 5000,
      aiRequests: 500,
    },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 9800,
    maxUsers: 999,
    description: 'Groupe, multi-filiales',
    durationDays: null,
    freeApps: 0,
    includedApps: 'ALL' as const,
    limits: {
      emails: -1,
      apiRequests: -1,
      deliverers: -1,
      skus: -1,
      aiRequests: 2000,
    },
  },
} as const

export type PlanId = keyof typeof PLANS

export const APPS = {
  invoices:      { id: 'invoices',      name: 'Factures & devis',      icon: '🧾', price: 0,    core: true,  description: 'Illimitées, PDF professionnel, portail client' },
  quotes:        { id: 'quotes',        name: 'Devis',                  icon: '📄', price: 0,    core: true,  description: 'Inclus avec Factures' },
  clients:       { id: 'clients',       name: 'Clients & fournisseurs', icon: '👥', price: 0,    core: true,  description: 'Base de contacts illimitée' },
  stock:         { id: 'stock',         name: 'Stock',                  icon: '📦', price: 0,    core: true,  description: 'Mouvements, alertes de rupture' },
  expenses:      { id: 'expenses',      name: 'Dépenses',               icon: '💸', price: 0,    core: true,  description: 'Notes de frais, validation' },

  crm:           { id: 'crm',           name: 'CRM pipeline',           icon: '📊', price: 500,  core: false, description: 'Leads, opportunités, Kanban commercial' },
  purchases:     { id: 'purchases',     name: 'Achats',                 icon: '🛒', price: 400,  core: false, description: 'Bons de commande fournisseur, réceptions' },
  projects:      { id: 'projects',      name: 'Projets & timesheets',   icon: '📋', price: 600,  core: false, description: 'Tâches, temps passé, facturation projet' },
  subscriptions: { id: 'subscriptions', name: 'Abonnements clients',    icon: '🔄', price: 600,  core: false, description: 'Récurrent, Chargily Pay, virement CCP' },
  hr:            { id: 'hr',            name: 'RH',                     icon: '👤', price: 800,  core: false, description: 'Employés, congés, recrutement, évaluations' },
  payroll:       { id: 'payroll',       name: 'Paie (IRG/CNAS)',         icon: '💰', price: 800,  core: false, description: 'Bulletins de paie conformes législation DZ' },
  accounting:    { id: 'accounting',    name: 'Comptabilité PCN',        icon: '📒', price: 900,  core: false, description: 'Journal PCN algérien, bilan, grand livre' },
  tax:           { id: 'tax',           name: 'G50 automatique',         icon: '🧮', price: 500,  core: false, description: 'Déclaration fiscale mensuelle pré-remplie' },
  pos:           { id: 'pos',           name: 'POS caisse',              icon: '🖥️', price: 700,  core: false, description: 'Caisse tactile, impression thermique' },
  production:    { id: 'production',    name: 'Production (BOM/OF)',     icon: '⚙️', price: 900,  core: false, description: 'Nomenclatures, ordres de fabrication' },
  restaurant:    { id: 'restaurant',    name: 'Restaurant',              icon: '🍽️', price: 1500, core: false, description: 'Tables, KDS cuisine, menu QR, fidélité' },
  ecommerce:     { id: 'ecommerce',     name: 'E-commerce',              icon: '🛍️', price: 1000, core: false, description: 'Sync Shopify / WooCommerce' },
} as const

export type AppId = keyof typeof APPS

export const ANNUAL_DISCOUNT = 0.20

export const TRIAL_ELIGIBLE_APPS: AppId[] = [
  'crm', 'purchases', 'projects', 'subscriptions',
  'hr', 'payroll', 'accounting', 'tax', 'pos',
  'production', 'restaurant', 'ecommerce',
]

export function isAppIncluded(planId: PlanId, appId: AppId): boolean {
  const plan = PLANS[planId]
  if ('includedApps' in plan && plan.includedApps === 'ALL') return true
  if ('includedApps' in plan) return (plan.includedApps as readonly string[]).includes(appId)
  return false
}

export function getExtraAppPrice(appId: AppId): number {
  return APPS[appId].price
}

export function calcMonthlyTotal(planId: PlanId, extraApps: AppId[], annual: boolean): number {
  const base = PLANS[planId].price
  const extras = extraApps
    .filter(a => !isAppIncluded(planId, a))
    .reduce((s, a) => s + APPS[a].price, 0)
  const subtotal = base + extras
  return annual ? Math.round(subtotal * (1 - ANNUAL_DISCOUNT)) : subtotal
}
