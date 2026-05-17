export const APP_PLANS = {
  subscriptions: {
    appId: 'subscriptions',
    appName: 'Abonnements clients',
    plans: {
      trial: {
        id: 'trial',
        name: 'Essai gratuit',
        price: 0,
        durationDays: 15,
        maxSubscriptions: 5,
        aiRequestsPerMonth: 0,
        aiRequestsPerDay: 0,
        description: 'Découvrez l\'app pendant 15 jours',
        features: ['5 abonnements max', 'Facturation récurrente', 'Portail client'],
      },
      starter: {
        id: 'starter',
        name: 'Starter',
        price: 1500,
        durationDays: null,
        maxSubscriptions: 20,
        aiRequestsPerMonth: 0,
        aiRequestsPerDay: 0,
        description: 'Pour les petites activités',
        features: ['20 abonnements max', 'Facturation récurrente', 'Portail client', 'Chargily & CCP'],
      },
      premium: {
        id: 'premium',
        name: 'Premium',
        price: 2500,
        durationDays: null,
        maxSubscriptions: 50,
        aiRequestsPerMonth: 0,
        aiRequestsPerDay: 0,
        description: 'Pour les activités en croissance',
        features: ['50 abonnements max', 'Facturation récurrente', 'Portail client', 'Chargily & CCP'],
      },
      pro: {
        id: 'pro',
        name: 'Pro',
        price: 3500,
        durationDays: null,
        maxSubscriptions: 200,
        aiRequestsPerMonth: 30,
        aiRequestsPerDay: 0,
        description: 'Pour les entreprises établies',
        features: ['200 abonnements max', 'Facturation récurrente', 'Portail client', 'Chargily & CCP', 'Assistance IA – 30 req/mois'],
      },
      agency: {
        id: 'agency',
        name: 'Agency',
        price: 9500,
        durationDays: null,
        maxSubscriptions: -1,
        aiRequestsPerMonth: 0,
        aiRequestsPerDay: 30,
        description: 'Pour les agences et grandes structures',
        features: ['Abonnements illimités', 'Facturation récurrente', 'Portail client', 'Chargily & CCP', 'Assistance IA – 30 req/jour'],
      },
    },
  },
} as const

export type AppPlanAppId = keyof typeof APP_PLANS
export type SubscriptionPlanId = keyof typeof APP_PLANS['subscriptions']['plans']

export function getAppPlanConfig(appId: string) {
  if (appId in APP_PLANS) return APP_PLANS[appId as AppPlanAppId]
  return null
}

export function getAppPlan(appId: string, planId: string) {
  const config = getAppPlanConfig(appId)
  if (!config) return null
  const plans = config.plans as unknown as Record<string, { id: string; name: string; price: number; durationDays: number | null; maxSubscriptions: number; aiRequestsPerMonth: number; aiRequestsPerDay: number; description: string; features: readonly string[] }>
  return plans[planId] ?? null
}

export function hasIndependentPlans(appId: string): boolean {
  return appId in APP_PLANS
}
