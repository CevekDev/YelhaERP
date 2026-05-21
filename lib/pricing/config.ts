export const PLANS = {
  trial: {
    id: 'trial',
    name: 'Essai gratuit',
    price: 0,
    maxUsers: 1,
    description: 'Découvrez YelhaSubs sans engagement',
    durationDays: 15,
    limits: { emails: 50, apiRequests: 500 },
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 990,
    maxUsers: 1,
    description: 'Idéal pour démarrer',
    durationDays: null,
    limits: { emails: 200, apiRequests: 1000 },
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    price: 1990,
    maxUsers: 2,
    description: 'Pour les petites équipes',
    durationDays: null,
    limits: { emails: 500, apiRequests: 5000 },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 2990,
    maxUsers: 5,
    description: 'Pour les entreprises qui scalent',
    durationDays: null,
    limits: { emails: 2000, apiRequests: 20000 },
  },
  agency: {
    id: 'agency',
    name: 'Agency',
    price: 4990,
    maxUsers: 999,
    description: 'Pour les agences et grands volumes',
    durationDays: null,
    limits: { emails: -1, apiRequests: -1 },
  },
} as const

export type PlanId = keyof typeof PLANS

export const ANNUAL_DISCOUNT = 0.20

export function calcMonthlyTotal(planId: PlanId, annual: boolean): number {
  const base = PLANS[planId].price
  return annual ? Math.round(base * (1 - ANNUAL_DISCOUNT)) : base
}
