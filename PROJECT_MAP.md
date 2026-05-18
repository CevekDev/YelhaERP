# 🗺️ PROJECT_MAP.md — YelhaERP

> Dernière mise à jour : 2026-05-19
> Lire ce fichier EN PREMIER à chaque session (voir CLAUDE.md).

---

## 🎯 Présentation du projet

**YelhaERP** est un ERP SaaS multi-tenant cloud, conçu spécifiquement pour le marché algérien.
Déployé sur **Vercel** + **Supabase (PostgreSQL)**.
Repo GitHub : `CevekDev/YelhaERP`

---

## 🧱 Stack technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| Framework | Next.js App Router | 14.2.5 |
| Language | TypeScript | 5.5.3 |
| Styles | Tailwind CSS + shadcn/ui | 3.4.6 |
| ORM | Prisma | 5.22.0 |
| Base de données | PostgreSQL via Supabase | — |
| Auth | NextAuth v5 (JWT, 7j) | 5.0.0-beta.19 |
| Auth adapter | @auth/prisma-adapter | 2.4.1 |
| Validation | Zod | 3.23.8 |
| Formulaires | react-hook-form + @hookform/resolvers | 7.52.1 |
| Graphiques | Recharts | 2.12.7 |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable | 6.3.1 / 10.0.0 |
| PDF | jspdf + jspdf-autotable | 2.5.1 |
| Email | Resend + Nodemailer | 4.8.0 / 7.0.0 |
| IA | DeepSeek API (via openai SDK) | — |
| Paiement | Chargily (Edahabia/CIB algérien) | — |
| Rate limiting | Upstash Redis + @upstash/ratelimit | — |
| Thèmes | next-themes | 0.3.0 |
| Icônes | lucide-react | 0.408.0 |
| Toasts | Sonner | 1.5.0 |
| Tests | Vitest | 4.1.5 |
| Déploiement | Vercel (auto deploy sur push main) | — |

---

## 🔐 Règles critiques (ne jamais oublier)

### Sécurité multi-tenant
```typescript
// ✅ TOUJOURS
const { companyId } = await getTenantContext()  // lib/security/tenant.ts

// ❌ JAMAIS
const companyId = body.companyId        // injection possible
const companyId = req.query.companyId   // non fiable
```

### Réponses API
```typescript
import { apiSuccess, apiError } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

// Toutes les routes API commencent par :
const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
if (!success) return rateLimitResponse(reset)
```

### Monnaie algérienne
```typescript
import { formatDA, formatDACompact } from '@/lib/algerian/format'
// Classe CSS : .da-amount sur tous les montants affichés
```

### Super Admin
```typescript
import { requireSuperAdmin } from '@/lib/security/tenant'
// Protège les routes /api/admin/*
// Champ isSuperAdmin sur le modèle User (mis à true manuellement en DB)
```

---

## 📁 Structure des fichiers importants

```
YelhaERP/
├── CLAUDE.md                    ← Protocole de travail Claude
├── PROJECT_MAP.md               ← Ce fichier (mémoire du projet)
├── app/
│   ├── (auth)/                  ← Login, Register, Verify-email
│   ├── admin/page.tsx           ← Panel super admin (4 onglets)
│   ├── api/
│   │   ├── admin/               ← stats, companies, grant, app-grant, app-pricing, app-payments
│   │   ├── app-billing/[appId]/ ← plans, subscription, checkout (tarification par app)
│   │   ├── auth/                ← register, verify-email, [...nextauth]
│   │   ├── billing/             ← plans, checkout, subscription, cancel, usage, app-trial
│   │   ├── webhooks/            ← chargily, chargily-yelha, delivery, v1
│   │   ├── cron/                ← billing, notifications, quotes-followup, subscriptions-reminders
│   │   └── v1/                  ← API publique RESTful (clients, invoices, products, quotes, stock, orders)
│   ├── dashboard/               ← Toutes les pages métier (auth requise)
│   │   ├── settings/
│   │   │   ├── applications/page.tsx  ← REÉCRIT: sélection app → plans indépendants
│   │   │   └── billing/page.tsx       ← Abonnement ERP global
│   │   └── ...
│   ├── onboarding/              ← Config post-inscription
│   ├── portal/[token]/          ← Portail client public (sans auth)
│   └── pricing/page.tsx         ← Page publique des prix
├── components/
│   ├── ui/                      ← 35 composants shadcn/ui
│   ├── layout/                  ← Sidebar, Header, TopNav, NotificationBell
│   ├── dashboard/               ← KPIs, graphiques, alertes
│   ├── ai/chat-widget.tsx       ← Widget IA
│   └── tutorial/                ← Overlay tutoriel
├── lib/
│   ├── algerian/                ← PCN, TVA, IRG/CNAS, format DA
│   ├── security/                ← tenant.ts, api-response.ts, ratelimit.ts, api-key-auth.ts
│   ├── billing/                 ← check-app-access.ts, check-limit.ts
│   ├── pricing/
│   │   ├── config.ts            ← Plans ERP globaux (TRIAL/STARTER/PRO/BUSINESS/ENTERPRISE)
│   │   └── app-plans.ts         ← Plans indépendants par app (subscriptions: trial/starter/premium/pro/agency)
│   ├── validations/             ← Schémas Zod (auth, client, invoice, quote, product, purchase, expense, crm, hr)
│   ├── email/resend.ts          ← Service email
│   ├── notifications/           ← Génération notifications
│   ├── i18n/                    ← FR/EN/AR
│   ├── webhooks/dispatch.ts     ← Webhooks custom
│   ├── auth.ts                  ← Config NextAuth (Google OAuth + Credentials, refresh 5min)
│   └── prisma.ts                ← Instance Prisma singleton
├── prisma/
│   ├── schema.prisma            ← 75 modèles, 2400+ lignes
│   └── seed.ts                  ← Données démo
├── __tests__/                   ← Tests Vitest
├── design-system/MASTER.md      ← Design tokens et règles visuelles
├── middleware.ts                 ← Redirection auth
└── .env.example                 ← Variables d'environnement
```

---

## 🗄️ Modèles Prisma (75 modèles)

### Core
- `Company` — Tenant racine (toutes les données y sont rattachées)
- `User` + `isSuperAdmin: Boolean` — Utilisateurs (OWNER/ADMIN/ACCOUNTANT/EMPLOYEE/READONLY)
- `Account`, `Session`, `VerificationToken` — NextAuth

### Ventes
- `Client`, `Invoice`, `InvoiceLine`, `InvoicePayment`, `InvoiceSequence`
- `Quote`, `QuoteLine`, `ClientMessage`

### Achats
- `Supplier`, `PurchaseOrder`, `PurchaseOrderLine`, `POApproval`
- `GoodsReceipt`, `GoodsReceiptLine`
- `SupplierInvoice`, `SupplierInvoiceLine`

### Stock
- `Product`, `ProductVariant`, `StockMovement`, `StockPosition`, `StockTransfer`, `StockTransferLine`
- `Warehouse`, `WarehouseLocation`

### Comptabilité
- `AccountPCN`, `AccountEntry`, `AccountLine`, `JournalEntry`, `FiscalPeriod`, `TaxDeclaration`

### RH
- `Employee`, `PayrollEntry`, `LeaveType`, `LeaveRequest`
- `JobPosting`, `Application`, `PerformanceReview`

### CRM
- `Lead`, `LeadActivity`, `LeadTask`, `Pipeline`

### Projets
- `Project`, `ProjectTask`, `TimeLog`

### Production
- `BOM`, `BOMComponent`, `ProductionOrder`, `ProductionConsumption`

### Restaurant (45+ routes)
- `RestaurantConfig`, `RestaurantRoom`, `RestaurantTable`, `Reservation`
- `MenuCategory`, `MenuItem`, `MenuIngredient`, `Ingredient`, `IngredientMovement`
- `RestaurantOrder`, `RestaurantOrderLine`, `KdsTicket`, `RestaurantOrderSequence`
- `LoyaltyClient`, `LoyaltyTransaction`

### E-Commerce
- `EcomOrder`, `EcomStatusHistory`, `DeliveryCompany`, `DeliveryOption`, `DeliveryDriver`

### POS
- `PosRegister`, `PosSession`, `PosSale`, `PosDebt`, `PosDebtPayment`

### Abonnements clients
- `SubscriptionPlan`, `Subscription`
- `SubscriptionSettings` — Paramètres centralisés par company (paiement + templates email)
- `SubApiKey` — Clés API pour intégration externe (max 5 actives, hash SHA256)

### Facturation SaaS YelhaERP
- `YelhaSubscription` — Abonnement ERP global (TRIAL/ACTIVE/PAST_DUE/CANCELLED/PAUSED/EXPIRED)
- `YelhaPayment` — Paiements ERP (CHARGILY/CCP/ADMIN_FREE/ADMIN_ACTIVATE)
- `AppSubscription` — Abonnements par app (**NOUVEAU** — companyId + appId unique)
- `AppPayment` — Paiements par app (**NOUVEAU** — CCP/ADMIN_FREE/ADMIN_ACTIVATE)

### Système
- `SystemConfig` — Clé/valeur pour overrides de prix (pricing, app_pricing_subscriptions)
- `ApiKey`, `Webhook`, `Notification`, `AiConversation`
- `Currency`, `ExchangeRate`, `Expense`, `Integration`, `InvoiceSequence`

---

## 💰 Architecture de tarification

### Plans ERP globaux (`lib/pricing/config.ts`)
| Plan | Prix | Utilisateurs |
|------|------|--------------|
| Trial | 0 DA / 30j | 1 |
| Starter | 990 DA/mois | 2 |
| Pro | 2 490 DA/mois | 5 |
| Business | 4 900 DA/mois | 15 |
| Enterprise | 9 800 DA/mois | 999 |

### Plans App Abonnements (`lib/pricing/app-plans.ts`) ✅ NOUVEAU
| Plan | Prix | Limite abonnements | IA |
|------|------|-------------------|-----|
| Trial | 0 DA / 15j | 5 | — |
| Starter | 1 500 DA/mois | 20 | — |
| Premium | 2 500 DA/mois | 50 | — |
| Pro | 3 500 DA/mois | 200 | 30 req/mois |
| Agency | 9 500 DA/mois | Illimité | 30 req/jour |

> Les prix sont modifiables depuis l'admin (stockés dans `SystemConfig` avec clé `app_pricing_subscriptions`).

---

## 🌐 Routes API principales

### Admin (protégées par `requireSuperAdmin()`)
```
GET    /api/admin/stats          → KPIs globaux (entreprises, MRR, paiements)
GET    /api/admin/companies      → Liste entreprises avec abonnements (search, status, pagination)
PATCH  /api/admin/companies      → Changer plan entreprise
POST   /api/admin/grant          → Offrir/activer abonnement ERP (free | activate | confirm_ccp)
GET    /api/admin/pricing        → Prix ERP (defaults + overrides)
PUT    /api/admin/pricing        → Sauvegarder overrides prix ERP
GET    /api/admin/app-pricing    → Prix par app (defaults + overrides)    [NOUVEAU]
PUT    /api/admin/app-pricing    → Sauvegarder prix d'une app             [NOUVEAU]
POST   /api/admin/app-grant      → Offrir/activer/confirmer plan app      [NOUVEAU]
GET    /api/admin/app-payments   → Paiements CCP apps en attente          [NOUVEAU]
```

### Facturation SaaS par app (utilisateur connecté)
```
GET    /api/app-billing/[appId]/plans        → Plans de l'app avec overrides admin  [NOUVEAU]
GET    /api/app-billing/[appId]/subscription → Abonnement actuel de l'entreprise    [NOUVEAU]
POST   /api/app-billing/[appId]/checkout     → Démarrer essai ou paiement CCP       [NOUVEAU]
```

### Billing ERP global
```
GET    /api/billing/plans                    → Plans tarifaires ERP
POST   /api/billing/checkout                 → Checkout Chargily ou CCP
GET    /api/billing/subscription             → Abonnement ERP de l'entreprise
PATCH  /api/billing/subscription             → Modifier apps extras
POST   /api/billing/cancel                   → Annuler abonnement
GET    /api/billing/usage                    → Usage vs quotas
POST   /api/billing/app-trial/[appId]        → Démarrer essai 15j d'une app
DELETE /api/billing/app-trial/[appId]        → Annuler essai
```

### API publique v1 (auth par clé API)
```
GET/POST         /api/v1/clients
GET/PUT/DELETE   /api/v1/clients/[id]
GET/POST         /api/v1/invoices
GET/PUT/DELETE   /api/v1/invoices/[id]
GET/POST         /api/v1/products
GET/PUT/DELETE   /api/v1/products/[id]
GET/POST         /api/v1/quotes
GET/PUT/DELETE   /api/v1/quotes/[id]
POST             /api/v1/quotes/[id]/convert
GET              /api/v1/stock
GET              /api/v1/stock/[productId]
POST             /api/v1/orders
GET/PUT/DELETE   /api/v1/webhooks/[id]
```

---

## ✅ Features Terminées

### Authentification & Accès
- ✅ Login email/password
- ✅ Login Google OAuth
- ✅ Vérification email
- ✅ NextAuth v5 JWT (7j) avec refresh 5min (rôle + isSuperAdmin)
- ✅ Inscription → création Company → onboarding
- ✅ Rôles : OWNER / ADMIN / ACCOUNTANT / EMPLOYEE / READONLY
- ✅ Super Admin (`isSuperAdmin` en DB) → panel `/admin`

### Panel Super Admin (`/admin`)
- ✅ Onglet Aperçu (KPIs globaux : entreprises, MRR, paiements, statuts)
- ✅ Onglet Entreprises (recherche, filtre statut, changement plan, grant)
- ✅ Onglet Tarification ERP (éditeur prix plans + apps extras)
- ✅ Onglet Applications (prix par app, paiements CCP apps en attente, grant app)
- ✅ Onglet Paiements (historique avec confirmation CCP)
- ✅ Dialog Offrir abonnement gratuit
- ✅ Dialog Activer abonnement (confirmé manuellement)
- ✅ Dialog Confirmer paiement CCP ERP
- ✅ Dialog Confirmer paiement CCP App
- ✅ Dialog Grant App (offrir/activer pack app par entreprise)

### Abonnements par Application (`/settings/applications`) ✅ NOUVEAU
- ✅ Grille d'apps (disponibles/bientôt)
- ✅ Clic → modale avec les plans de l'app
- ✅ Démarrer essai gratuit 15j
- ✅ Paiement CCP avec référence à copier
- ✅ Instructions CCP dans la modale
- ✅ Statut abonnement affiché sur chaque app card

### Ventes
- ✅ Gestion clients (CRUD)
- ✅ Factures (standard, simplifiée, proforma, note de crédit)
- ✅ Devis avec conversion en facture
- ✅ Portail client public (consultation, acceptation devis, messages)
- ✅ Paiements (CCP, Chargily, cash, virement)
- ✅ Export PDF factures/devis
- ✅ Suivi statuts (DRAFT → SENT → PAID/OVERDUE/CANCELLED)
- ✅ Séquences de numérotation

### Achats
- ✅ Gestion fournisseurs
- ✅ Commandes d'achat avec approbation
- ✅ Réceptions marchandises
- ✅ Factures fournisseurs + rapprochement

### Stock / Inventaire
- ✅ Produits et variantes
- ✅ Mouvements stock (entrée, sortie, ajustement)
- ✅ Alertes stock bas
- ✅ Transferts inter-entrepôts
- ✅ Multi-entrepôts

### Comptabilité (PCN Algérien)
- ✅ Plan comptable national algérien (2000+ comptes)
- ✅ Écritures comptables (débit/crédit)
- ✅ Grand livre
- ✅ Balance générale
- ✅ Bilan
- ✅ Compte de résultat
- ✅ G50 (état financier)
- ✅ Périodes fiscales avec clôture

### Fiscalité Algérienne
- ✅ TVA 19%
- ✅ IRG salaires
- ✅ CNAS cotisations
- ✅ Formatage DA (dinars algériens)
- ✅ CCP (paiements sociaux)

### Ressources Humaines
- ✅ Employés
- ✅ Offres d'emploi + candidatures (multi-étapes)
- ✅ Demandes congés (avec approbation)
- ✅ Types de congés
- ✅ Paies + bulletins (IRG/CNAS)
- ✅ Évaluations de performance
- ✅ Organigramme
- ✅ Timesheets

### CRM
- ✅ Gestion leads
- ✅ Pipeline Kanban
- ✅ Activités et tâches par lead
- ✅ Conversion lead → client

### Production
- ✅ Nomenclatures (BOM)
- ✅ Ordres de production
- ✅ Consommation matériaux
- ✅ Statuts (draft → started → completed)

### Projets
- ✅ Gestion projets + tâches
- ✅ Timesheets (logs de temps)
- ✅ Facturation par projet

### Restaurant
- ✅ Configuration (salles, tables)
- ✅ Menu avec catégories et articles
- ✅ Gestion ingrédients
- ✅ Commandes restaurant
- ✅ Kitchen Display System (KDS)
- ✅ Réservations
- ✅ Programme fidélité
- ✅ QR code tables (menu/commande public)
- ✅ Stats ventes

### E-Commerce
- ✅ Commandes e-com
- ✅ Sync Shopify + WooCommerce
- ✅ Gestion livraisons + chauffeurs
- ✅ Suivi statuts

### POS (Point of Vente)
- ✅ Caisses multiples
- ✅ Sessions de caisse
- ✅ Ventes rapides
- ✅ Dettes clients
- ✅ Rapprochement caisse

### Abonnements Clients (module interne)
- ✅ Plans d'abonnement personnalisables
- ✅ Suivi abonnements clients
- ✅ Paiements récurrents
- ✅ Relances automatiques
- ✅ **Paramètres centralisés** (`/dashboard/subscriptions/settings`) — WhatsApp, CCP, clé Chargily (un seul endroit pour toute la company)
- ✅ **Email templates personnalisables** par type (renouvellement + fin d'essai) × 3 langues (FR/EN/AR) avec aperçu live et réinitialisation
- ✅ **Email rappel J-1** automatique pour abonnements ACTIVE (renouvellement) et TRIAL (fin d'essai)
- ✅ Boutons paiement dans l'email : virement CCP, Chargily ePay (si clé configurée), WhatsApp
- ✅ Anti-spam (un seul rappel par 24h grâce à `lastRenewalReminderAt` / `lastTrialEndReminderAt`)
- ✅ Email client modifiable par abonnement depuis la liste
- ✅ **Webhook Chargily dédié** (`/api/webhooks/chargily-subscriptions`) : activation auto à J→ACTIVE + extension `nextBilling` (paiements pending JAMAIS enregistrés)
- ✅ **API publique d'intégration** (`/api/sub-api/`) : CRUD plans/clients/abonnements + génération Chargily checkout
- ✅ **Page Intégration** (`/dashboard/subscriptions/integration`) : gestion clés API (5 max), config webhook, doc téléchargeable .md
- ✅ Rate limit 60 req/min par clé API
- ✅ Sécurité : clés hashées SHA256, jamais visibles après création
- ✅ Suppression complète : page Integrations (Shopify/WooCommerce) + model Integration

### IA
- ✅ Chat IA contextuel (DeepSeek API)
- ✅ Conversations persistantes
- ✅ Aide contextuelle par module
- ✅ Quotas IA par plan

### Communication
- ✅ Notifications système
- ✅ Emails transactionnels (Resend)
- ✅ Webhooks custom (outbound)
- ✅ Messages portail client

### API Publique v1
- ✅ Clients, factures, devis, produits, stock, commandes
- ✅ Auth par clé API
- ✅ Webhooks custom (CRUD)

### Infrastructure
- ✅ Multi-tenant (isolation stricte par companyId)
- ✅ Rate limiting (Upstash Redis)
- ✅ Cron jobs (facturation, notifications, relances)
- ✅ Webhook Chargily (paiement en ligne)
- ✅ Health check endpoint
- ✅ Dockerfile
- ✅ i18n (FR/EN/AR)
- ✅ Dark/Light mode
- ✅ Tutoriels interactifs
- ✅ Raccourcis clavier

---

## 🔄 Changements session 2026-05-17 (suite) — i18n, profil, responsive

### Traductions & i18n
- ✅ `lib/i18n/translations.ts` : ajout section `profile` en FR/EN/AR (34 clés)
- ✅ `app/dashboard/invoices/page.tsx` : STATUS_LABELS + colonnes + headers via `useT()`
- ✅ `app/dashboard/clients/page.tsx` : colonnes, labels, boutons via `useT()`
- ✅ `app/dashboard/suppliers/page.tsx` : entête, colonnes, formulaire via `useT()`
- ✅ `app/dashboard/products/page.tsx` : entête, colonnes via `useT()`
- ✅ `app/dashboard/stock/page.tsx` : TYPE_LABELS + colonnes + entête via `useT()`

### Profil & Sécurité Auth
- ✅ `app/api/auth/change-password/route.ts` : CRÉÉ — bcrypt.compare + validation Zod + bcrypt.hash (12 rounds)
- ✅ `app/api/settings/profile/route.ts` : GET expose `hasPassword: !!user.password` (hash jamais renvoyé)
- ✅ `app/dashboard/settings/profile/page.tsx` : traduit entièrement + cache section mot de passe pour comptes Google OAuth

### Responsive Mobile
- ✅ `components/ui/data-table.tsx` : `<Table>` wrappé dans `<div className="overflow-x-auto">` → corrige dépassement horizontal sur toutes les pages liste (factures, clients, produits, fournisseurs, stock…)
- ✅ `app/dashboard/settings/profile/page.tsx` : `flex-col sm:flex-row` sur section avatar, `p-4 sm:p-6` sur toutes les Cards

---

## 🔄 Changements session 2026-05-17 — Audit sécurité & corrections

### Sécurité critique corrigée
- ✅ `middleware.ts` : ajout `/api/webhooks/chargily-subscriptions` et `/api/webhooks/chargily` dans PUBLIC_PATHS + fix `isPublicPath()` (condition trop laxiste supprimée)
- ✅ `lib/billing/check-app-access.ts` : CORE_APPS toujours accessibles en premier ; ajout vérification `AppSubscription` avant `YelhaSubscription` — `canAccessApp()` fonctionne maintenant correctement
- ✅ `app/api/webhooks/chargily-yelha/route.ts` : fix crash `timingSafeEqual` (vérification longueur avant comparaison)
- ✅ `app/api/webhooks/chargily-app/route.ts` : idem
- ✅ `app/api/webhooks/chargily/route.ts` : idem + suppression de la mise à jour `Company.plan` (système legacy qui ne mettait pas à jour `YelhaSubscription`)
- ✅ `app/api/webhooks/chargily-subscriptions/route.ts` : idempotence Redis (clé `webhook_sub:{chargilyId}`, TTL 7j)
- ✅ `lib/auth.ts` : trial OAuth Google 10j → 30j + création `YelhaSubscription` sur signup Google (cohérence avec le flow email/password)

### Sécurité haute corrigée
- ✅ `app/api/subscriptions/route.ts` : `rateLimit` + `hasRole(ADMIN)` sur POST + try/catch complet
- ✅ `app/api/subscriptions/[id]/route.ts` : `rateLimit` + `hasRole(ADMIN)` sur PATCH/DELETE + recalcul `nextBilling` si `planId` change
- ✅ `app/api/subscriptions/settings/route.ts` : `rateLimit` + `chargilyKey` masquée (`••••key`) dans GET + champ `hasChargilyKey` booléen
- ✅ `app/api/subscriptions/api-key/route.ts` : `rateLimit` + `hasRole(ADMIN)` sur GET et POST (création clés réservée OWNER/ADMIN)
- ✅ `app/api/app-billing/[appId]/checkout/route.ts` : blocage essai si abonnement existant (même EXPIRED) ; doublon ACTIVE+même plan bloqué ; renouvellement/upgrade autorisés
- ✅ `app/api/cron/subscriptions-reminders/route.ts` : expiration auto des abonnements TRIAL dont `nextBilling < now`
- ✅ `lib/security/ratelimit.ts` : préfixe `ip:` pour les clés IP et `key:` pour les clés API (plus de collision `memoryStore`)
- ✅ `app/api/sub-api/subscriptions/route.ts` : vérification `canAccessApp(companyId, 'subscriptions')` avant GET et POST
- ✅ `app/dashboard/subscriptions/layout.tsx` : créé — bloque l'accès à tout le module Abonnements si pas d'AppSubscription active

---

## 🔄 Changements session 2026-05-15 (suite)

### Abonnements Clients — Rappels de renouvellement
- ✅ `prisma/schema.prisma` : 6 nouveaux champs sur `Subscription` (clientEmail, whatsapp, ccpNumber, chargilyKey, emailLanguage, emailMessage)
- ✅ `app/api/subscriptions/route.ts` : createSchema étendu avec les 6 nouveaux champs
- ✅ `app/api/subscriptions/[id]/route.ts` : patchSchema étendu pour édition post-création
- ✅ `app/dashboard/subscriptions/new/page.tsx` : nouvelle section "Paiement & Notifications" dans le formulaire (email, WhatsApp, CCP, Chargily, langue, message perso) avec auto-fill email depuis client
- ✅ `app/dashboard/subscriptions/page.tsx` : bouton Mail par ligne + Dialog pour éditer les paramètres email après création
- ✅ `app/api/cron/subscriptions-reminders/route.ts` : refonte complète — rappel J-1 (36h), email multilingue FR/EN/AR, génération lien Chargily checkout via API, section CCP, section WhatsApp, message personnalisé

## 🔄 Changements session 2026-05-15 (original)

### Billing & Admin
- ✅ `force-dynamic` ajouté sur `/api/app-billing/subscriptions/route.ts` (cache stale TRIAL corrigé)
- ✅ Page `/settings/billing` : prix réel de l'abonnement (monthlyAmount depuis AppSubRecord), historique PAID seulement
- ✅ Page `/settings/modules` : statut ACTIVE prioritaire depuis AppSubscription
- ✅ Panel admin `/admin` : stats et colonne statut utilisent AppSubscription (plus YelhaSubscription seul)
- ✅ Suppression des PENDING payments depuis la DB + cron daily `/api/cron/cleanup-payments` (3h AM)
- ✅ `vercel.json` : cron cleanup-payments corrigé en `"0 3 * * *"` (Hobby plan n'accepte que daily)
- ✅ Menu "APPLICATIONS" (grid icônes) supprimé de `components/layout/top-nav.tsx`

### Dashboard
- ✅ `components/dashboard/kpis.tsx` : CA semaine / CA mois / CA année (toujours affichés) + alertes seulement si > 0, Rappels fiscaux supprimé
- ✅ `components/dashboard/subscriptions-kpis.tsx` : 6 stats (actifs, nouveaux, résiliés, net new, MRR, churn %)
- ✅ `components/dashboard/enterprise-kpis.tsx` : tuiles filtrées strictement par `activeApps` (supprimé `|| t.value > 0`)
- ✅ `app/dashboard/page.tsx` : weekRevenue ajouté, TaxReminders supprimé, layout épuré
- ✅ `/api/app-billing/payments/route.ts` créé (GET paiements AppPayment par entreprise)

---

## 🔄 Changements session 2026-05-17 (billing & webhooks)

### Corrections critiques
- ✅ `app/api/billing/checkout/route.ts` : suppression `×100` sur amount Chargily (ERP billing)
- ✅ `app/api/sub-api/subscriptions/[id]/checkout/route.ts` : suppression `×100` sur amount Chargily (sub-api)
- ✅ Test webhook simulé avec `scripts/simulate-chargily-webhook.ts` → PAID + ACTIVE confirmés

### Renouvellement anticipé & rappels ERP
- ✅ `prisma/schema.prisma` : 2 nouveaux champs sur `YelhaSubscription` (`lastRenewalReminder3At`, `lastRenewalReminder1At`)
- ✅ `lib/email/resend.ts` : `sendYelhaRenewalReminder()` — email J-3 et J-1 avec boutons Chargily + instructions CCP
- ✅ `app/api/cron/billing/route.ts` : rappels J-3 et J-1 pour abonnements ACTIVE (1 envoi par période)
- ✅ `app/api/billing/checkout/route.ts` : `periodStart = currentPeriodEnd` si renouvellement dans les 3 derniers jours
- ✅ `app/api/webhooks/chargily-yelha/route.ts` : utilise `payment.periodStart` (calculé au checkout) au lieu de `now`

---

## 🚧 En cours / À faire

- ⏳ `prisma db push` requis pour les 6 nouveaux champs sur `Subscription`
- ⏳ Plans indépendants pour CRM, RH, Comptabilité, Paie (architecture prête, contenu en pause)
- ⏳ Chargily Pay pour les paiements d'apps (actuellement CCP uniquement)
- ⏳ Webhooks entrants Chargily pour apps
- ⏳ Ajouter layout.tsx d'access gate pour les autres modules extra (CRM, RH, Comptabilité, Paie, etc.) — pattern identique à `/dashboard/subscriptions/layout.tsx`

---

## 🔑 Variables d'environnement requises

```env
DATABASE_URL          # PostgreSQL Supabase (pooled)
DIRECT_URL            # PostgreSQL Supabase (direct)
NEXTAUTH_URL          # URL de l'app (ex: https://yelhaerp.vercel.app)
NEXTAUTH_SECRET       # Secret JWT (openssl rand -base64 32)
GOOGLE_CLIENT_ID      # OAuth Google
GOOGLE_CLIENT_SECRET  # OAuth Google
RESEND_API_KEY        # Service email
DEEPSEEK_API_KEY      # IA
UPSTASH_REDIS_REST_URL    # Rate limiting
UPSTASH_REDIS_REST_TOKEN  # Rate limiting
CHARGILY_SECRET_KEY   # Paiement algérien
CRON_SECRET           # Sécurisation cron jobs
NEXT_PUBLIC_APP_URL   # URL publique
```

---

## 🛠️ Commandes utiles

```bash
npm run dev                  # Dev local
npm run build                # Build production

# DB (depuis le répertoire racine avec .env.local)
npx prisma db push           # Appliquer schema (dev/prod)
npx prisma generate          # Régénérer client Prisma
npx prisma studio            # Interface graphique DB
npm run db:seed              # Données de démo
```

> **Important** : Pour `prisma db push` en prod, utiliser `.env.local` qui contient les vraies URLs Supabase.
> Depuis le worktree, utiliser les env vars en ligne : `DATABASE_URL='...' DIRECT_URL='...' npx prisma db push`

---

## 📐 Conventions de code

### Fichiers de route API
```typescript
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getTenantContext } from '@/lib/security/tenant'
import { apiError, apiSuccess, rateLimitResponse } from '@/lib/security/api-response'
import { rateLimit, AUTHENTICATED_RATE_LIMIT } from '@/lib/security/ratelimit'

export async function GET(req: NextRequest) {
  const { success, reset } = await rateLimit(req, AUTHENTICATED_RATE_LIMIT)
  if (!success) return rateLimitResponse(reset)
  try {
    const { companyId } = await getTenantContext()
    // ...
    return apiSuccess(data)
  } catch (e: unknown) {
    if (e instanceof Error && e.message === 'UNAUTHORIZED') return apiError('Non authentifié', 401)
    return apiError('Erreur serveur', 500)
  }
}
```

### Pages client
```typescript
'use client'
import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { toast } from 'sonner'
// Pas de console.log, pas de TODO
```

---

## 🏗️ Décisions d'architecture importantes

| Décision | Raison |
|----------|--------|
| `isSuperAdmin` booléen séparé du `role` | Le rôle OWNER est assigné automatiquement à tout créateur de compte ; le super admin de plateforme doit être distinct |
| JWT refresh toutes les 5 min pour `isSuperAdmin` | Évite de devoir déconnecter l'utilisateur après une promotion DB |
| `AppSubscription` modèle séparé de `YelhaSubscription` | Tarification indépendante par app, indépendante du plan ERP global |
| `SystemConfig` clé `app_pricing_subscriptions` | Permet l'override admin des prix sans toucher au code |
| Prisma `db push` (pas migrate) | Environnement dev/prod unique sur Supabase, migrations formelles non utilisées |
| Upstash Redis pour rate limiting | Serverless compatible, pas besoin d'infra Redis permanente |
| CCP uniquement pour apps (pas Chargily) | Première itération ; Chargily viendra dans une prochaine version |

---

## 🔄 Changements session 2026-05-18 — Simulation complète ERP + fixes production

### Bugs critiques corrigés
- ✅ `middleware.ts` : ajout `/api/v1` dans PUBLIC_PATHS — toutes les requêtes API v1 externes retournaient 401 "Non authentifié" en production (la middleware interceptait avant `authenticateApiKey()`)
- ✅ `middleware.ts` : `/api/sub-api` et `/api/cron` également whitelistés (session précédente)
- ✅ `app/api/cron/subscriptions-reminders/route.ts` : fix Vercel build — spread Set non supporté en ES5 (`[...allCompanyIds]` → `Array.from()`), et `async function` dans bloc strict → arrow function

### Tests et simulation
- ✅ `scripts/simulate-full-erp.ts` : simulation complète 6 phases, 35/35 ✅
  - Phase 1 : Achat → Stock → Vente via API v1 (ApiKey auth)
  - Phase 2 : Expiration trial ERP → v1 core toujours OK, sub-api bloquée (403)
  - Phase 3 : Webhook Chargily ERP → YelhaPayment PAID, YelhaSubscription ACTIVE
  - Phase 4 : App Abonnements via sub-api (plan starter inclut subscriptions)
  - Phase 5 : Expiration totale → sub-api 403, v1 API toujours accessible
  - Phase 6 : Paiement AppSubscription seul → sub-api restaurée indépendamment
- ✅ `scripts/simulate-dev-integration.ts` : 48/48 tests intégration dev
- ✅ `scripts/test-subscriptions-e2e.ts` : test E2E module Abonnements

### Logique d'accès clarifiée
- `canAccessApp(companyId, 'subscriptions')` → CORE_APPS toujours free, puis AppSub (ACTIVE/TRIAL), puis YelhaSubscription plan + extraApps + trialApps
- `starter` plan inclut `'subscriptions'` dans `includedApps` → sub-api accessible sans AppSubscription séparée
- v1 API `/api/v1/*` n'a AUCUNE vérification subscription → accès API key uniquement (core ERP toujours accessible)
- sub-api `/api/sub-api/*` vérifie `canAccessApp` sur chaque requête

### Scripts utilitaires
- `scripts/check-db.ts` : diagnostic DB (companies, YelhaSubscription, AppSubscriptions) — lecture seule, OK sur prod
- `scripts/diagnose-last-account.ts` : diagnostic complet du dernier compte inscrit (Company, YelhaSubscription, YelhaPayment, AppSubscription). Flag `--cleanup` remet le compte à TRIAL propre (supprime paiements + app subs). Utilisé 2026-05-18 pour nettoyer le compte `merahlwos@gmail.com` (XXI) qui était passé STARTER ACTIVE 990 DA suite à un webhook Chargily **simulé** (chargilyId `sim_…`) exécuté contre la prod via `scripts/simulate-chargily-webhook.ts`.
- `scripts/lib/prod-guard.ts` : garde-fou partagé. `assertNotProd(name)` refuse de tourner si `DATABASE_URL` contient `supabase.co/com`, sauf flag `--allow-prod` ou env `YELHA_ALLOW_PROD=1` (qui ajoute alors 5s de warning bloquant). Branché sur `simulate-full-erp`, `simulate-dev-integration`, `test-subscriptions-e2e`, et sur `diagnose-last-account --cleanup`.

---

## 🔄 Changements session 2026-05-18 — Audit pré-production (suite)

### P0 #1 : Guards simulation scripts (pushé)
- ✅ `scripts/lib/prod-guard.ts` : CRÉÉ — bloque toute exécution de script write contre la prod
- ✅ Branché sur 4 scripts : simulate-full-erp, simulate-dev-integration, test-subscriptions-e2e, diagnose-last-account --cleanup

### P0 #2 : Audit flux de paiement (pushé)
- ✅ `app/api/webhooks/chargily-yelha/route.ts` : ajout company.update({ plan: planEnum }) dans la transaction — était ABSENT, donc Company.plan restait TRIAL après paiement Chargily ERP (impactait quotas IA)
- ✅ `app/api/admin/grant/route.ts` : branche confirm_ccp complétée — ajout billingCycle, extraApps, limites plan (emails/API/AI/deliverers/skus) et Company.plan dans la transaction (manquait tout)
- ✅ `app/api/webhooks/chargily/route.ts` : env var corrigée CHARGILY_SECRET_KEY -> CHARGILY_WEBHOOK_SECRET pour HMAC (cohérence avec tous les autres webhooks)

### P0 #3 / P1 : canAccessApp + navigation active
- ✅ `app/api/billing/subscription/route.ts` : activeApps inclut maintenant les AppSubscription (ACTIVE ou TRIAL non expirée) — ignoré avant, donc module invisible dans la sidebar si souscription indépendante. Logique YelhaSubscription affinée (accordée seulement si ACTIVE ou TRIAL encore valide)
- ℹ️ Crons ERP (billing + app-billing) verifies — solides, proteges par CRON_SECRET, configures dans vercel.json
- ℹ️ canAccessApp() pour subscriptions fonctionne correctement — le bug initial etait uniquement le webhook simule

### P1 #6 : Prix admin overrides (pushé)
- ✅ `app/api/billing/plans/route.ts` : lit SystemConfig cle 'pricing' et applique overrides avant de retourner (etait 100% statique)
- ✅ `app/api/billing/checkout/route.ts` : remplace calcMonthlyTotal() par calcul avec overrides — Chargily et CCP utilisent desormais le prix effectif admin


---

## 🔄 Changements session 2026-05-19 — Audit pré-prod massif (sécurité + billing + pré-prod)

### 🔴 Sécurité critique
- ✅ `middleware.ts` : PUBLIC_PATHS complétés (`/api/webhooks/delivery`, `/api/portal`, `/api/restaurant/qr`, `/api/restaurant/menu/public`, `/robots.txt`, `/sitemap.xml`). Suppression des paths legacy `chargily-yelha` et `chargily-app`.
- ✅ `app/api/auth/verify-email/route.ts` : `crypto.randomInt` au lieu de `Math.random` ; rate limit IP (`AUTH_RATE_LIMIT`) + `rateLimitByKey` par email (5/15min sur POST, 3/h sur PUT) → coupe brute-force + email-bombing. `timingSafeEqual` sur comparaison du code.
- ✅ `app/api/auth/change-password/route.ts` : `AUTH_RATE_LIMIT` + bruteforce par-user (10/15min) — protège contre exploitation de session volée.
- ✅ `app/api/admins/route.ts` : politique mot de passe alignée sur `register` (`min(8)` + 1 majuscule + 1 chiffre).
- ✅ `app/api/webhooks/delivery/[companyId]/route.ts` : check de longueur avant `timingSafeEqual` → plus de 500 sur signature de mauvaise longueur.
- ✅ `lib/security/cron-auth.ts` (NEW) : `verifyCronSecret(req)` constant-time. Branché sur les 6 routes `app/api/cron/**` (billing, app-billing, cleanup-payments, notifications, quotes-followup, subscriptions-reminders).
- ✅ `lib/auth.ts` : `allowDangerousEmailAccountLinking` retiré du provider Google.

### 🟠 Billing
- ✅ `app/api/billing/checkout/route.ts` : URLs Chargily passées par `NEXT_PUBLIC_APP_URL` ; `success_url`/`failure_url` enrichies de `?plan=…&cycle=…&apps=…` pour que la page de retour ne perde plus le contexte.
- ✅ `app/api/app-billing/[appId]/checkout/route.ts` : idem (`app=…&plan=…&method=…`). Dédup `AppPayment PENDING < 1h` : si même (sub, planId, method), on retourne la ref existante au lieu de créer un doublon.
- ✅ `app/api/billing/cancel/route.ts` : transaction qui annule en cascade les `AppSubscription` ACTIVE/TRIAL → fin du bug où on annule l'ERP mais continue d'accéder aux apps payantes.
- ✅ `app/api/billing/app-trial/[appId]/route.ts` (DELETE) : annule aussi la `AppSubscription` correspondante → `canAccessApp` ne grant plus l'accès via la nouvelle table après résiliation.

### 🔴 Webhooks
- ✅ `lib/webhooks/idempotence.ts` (NEW) : `isAlreadyProcessed(namespace, eventId)` backed par Upstash Redis (TTL 7j).
- ✅ `app/api/webhooks/chargily/route.ts` : idempotence appliquée en tête de POST → un rejeu Chargily (même `data.id` + `event.type`) court-circuite proprement. Plus de doublons `InvoicePayment` sur rejeu. **Filtre TRIAL retiré de `validPlanEnums`** → un paiement confirmé ne peut plus downgrade `Company.plan` à TRIAL.
- ✅ Suppression définitive des webhooks legacy : `app/api/webhooks/chargily-yelha/route.ts` et `app/api/webhooks/chargily-app/route.ts` (déjà remplacés par le webhook unifié `chargily/route.ts`). Référence corrigée dans `scripts/simulate-full-erp.ts`.

### 🧹 Code mort supprimé
- `components/dashboard/tax-reminders.tsx`
- `components/ui/{chatter,progress-ring,enterprise-table,filter-chip,view-toggle,kanban-board,timeline}.tsx`
- (vérifié `grep` : aucun import orphelin)

### 🚀 Pré-prod infrastructure
- ✅ `public/robots.txt` + `public/favicon.svg` créés.
- ✅ `app/sitemap.ts` : sitemap dynamique (`/`, `/pricing`, `/login`, `/register`, pages légales).
- ✅ `app/layout.tsx` : `robots.index = true` (site désormais indexable). `metadataBase`, `openGraph`, `twitter` complets. Référence du favicon.
- ✅ `app/loading.tsx`, `app/error.tsx`, `app/not-found.tsx` (fallbacks Next.js).
- ✅ `.env.example` : ajout `CHARGILY_WEBHOOK_SECRET`.

### 🔜 Reporté à Sprint 2/3 (volontairement non touché ici)
- Sentry / structured logger : nécessite npm install + config — à faire avec un compte Sentry.
- Wrapper `withAuth(handler)` pour dédupliquer les 150 routes : refacto touche beaucoup de code, à faire avec des tests d'intégration.
- Split fichiers > 500 lignes (`prisma/schema.prisma`, `lib/i18n/translations.ts`, `lib/sub-api/docs.ts`, `app/admin/page.tsx`, etc.) : pur refacto sans gain fonctionnel immédiat.
- i18n EN/AR complète (RTL pour AR).
- Migration `prisma db push` → migrations versionnées : nécessite snapshot DB prod.
- Compteur `trialUsedAt` persistant pour bloquer le re-trial à vie (actuellement re-trial autorisé une fois EXPIRED).
- Bloquer le boot si Upstash absent en prod (fallback mémoire non partagé entre instances Vercel).
- `AppSubscription.status` → enum Prisma strict (actuellement string libre).

---

## 🔄 Changements session 2026-05-19 (suite) — Sprint 2 partiel

### Monitoring (Sentry)
- ✅ `npm install @sentry/nextjs` (déjà ajouté à package.json + lock)
- ✅ `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` — no-op si `SENTRY_DSN` absent → safe en dev/preview
- ✅ `instrumentation.ts` (Next.js hook) : init Sentry par runtime + **warn en prod si `UPSTASH_REDIS_REST_URL/TOKEN`, `CHARGILY_WEBHOOK_SECRET` ou `CRON_SECRET` manquent**
- ✅ `next.config.js` : wrap conditionnel via `withSentryConfig` (uniquement si `SENTRY_DSN` ou `NEXT_PUBLIC_SENTRY_DSN` défini → pas de slowdown du build en local)
- ✅ `app/error.tsx` : `Sentry.captureException(error)` dans `useEffect`
- ✅ `.env.example` : `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` ajoutés
- ✅ `types/sentry-nextjs.d.ts` — shim minimal de types (le champ `exports` multi-condition du package ne résolvait pas correctement les .d.ts en moduleResolution `bundler`)

### Logs propres
- ✅ `lib/subscriptions/send-welcome.ts` : `console.log`/`console.error` supprimés (non-blocking try/catch silencieux)
- ✅ `app/api/cron/billing/route.ts` : `console.log` retiré (le count `stale` est déjà retourné dans la réponse cron)

### Schema — enum strict + compteur de trial
- ✅ `prisma/schema.prisma` : `enum AppSubStatus { TRIAL ACTIVE CANCELLED EXPIRED PAST_DUE PAUSED }`. `AppSubscription.status` passe de `String` → `AppSubStatus`. Plus de string libre.
- ✅ `prisma/schema.prisma` : nouveau champ `AppSubscription.trialUsedAt: DateTime?` — positionné la 1re fois qu'un essai démarre, jamais remis à null → bloque le re-trial à vie.
- ✅ `app/api/app-billing/[appId]/checkout/route.ts` : refus du re-trial si `existing.trialUsedAt != null` ; positionne `trialUsedAt: now` à la création du trial.
- ✅ `app/api/billing/app-trial/route.ts` (ancien système) : idem — refuse si trialUsedAt existe, sinon le pose à l'upsert.

⚠ **Migration prod requise** : `npx prisma db push` avec les vars `.env.local` de prod pour appliquer la conversion `status: String → AppSubStatus` + l'ajout de la colonne `trialUsedAt`. Postgres convertit text → enum automatiquement si toutes les valeurs existantes matchent les valeurs de l'enum (`TRIAL`, `ACTIVE`, etc. — ce qui devrait être le cas). En cas d'échec, run `npx prisma migrate diff` pour générer le SQL et l'appliquer à la main.

### Non touché — décision motivée
- ❌ `withAuth(handler)` wrapper sur 150 routes : refacto à très large surface, à faire avec tests d'intégration. Risk/reward défavorable en une passe.
- ❌ Split fichiers > 500 lignes : pur refacto, aucun gain fonctionnel, risque de régression sur composants déjà fonctionnels.
- ❌ Compléter i18n EN/AR sur restaurant/pos/hr/crm/accounting : ~500 chaînes à traduire — out of scope d'une session.
- ❌ Migrations Prisma versionnées : nécessite un snapshot complet de la prod et un test de roll-forward/back, à planifier hors session.
- ❌ Standardiser webhooks/portal sur `apiSuccess/apiError` : purement cosmétique, format de réponse différent (`{ received: true }` est attendu par les providers externes).

