# YelhaERP — Documentation Claude Code

## Stack
- Next.js 14 App Router + TypeScript
- Tailwind CSS + shadcn/ui (composants dans `components/ui/`)
- Prisma ORM + PostgreSQL (Supabase)
- NextAuth v5 (JWT strategy)
- DeepSeek API (IA)

## Règles critiques

### Sécurité multi-tenant
- **JAMAIS** lire `companyId` depuis le body ou les query params côté serveur
- **TOUJOURS** utiliser `getTenantContext()` depuis `lib/security/tenant.ts`
- **TOUJOURS** filtrer par `companyId` dans chaque requête Prisma

### Validation
- Zod sur tous les inputs côté serveur (`lib/validations/`)
- `apiError()` et `apiSuccess()` depuis `lib/security/api-response.ts`
- Rate limiting sur chaque route API avec `rateLimit()`

### Monnaie
- Formatage DA : `formatDA()` ou `formatDACompact()` depuis `lib/algerian/format.ts`
- Classe CSS `.da-amount` sur tous les montants

## Structure
```
app/
  (auth)/         Pages non-authentifiées (login, register)
  (dashboard)/    Layout avec sidebar (auth requise)
  dashboard/      Pages du dashboard
  api/            Routes API (toutes protégées sauf /api/auth)
  onboarding/     Configuration initiale après inscription
  portal/[token]/ Portail client public (sans auth)
components/
  ui/             Composants shadcn/ui
  layout/         Sidebar, Header
  dashboard/      Composants KPIs, graphiques
  ai/             Widget chat IA
lib/
  algerian/       Calculs paie IRG/CNAS, TVA, formatage DA
  security/       Rate limit, réponses API, isolation tenant
  validations/    Schémas Zod
prisma/
  schema.prisma   Schéma complet
  seed.ts         Données de démo
design-system/
  MASTER.md       Design tokens et règles visuelles
```

## Commandes utiles
```bash
npm run dev        # Démarrer en développement
npm run db:push    # Appliquer le schéma (dev)
npm run db:migrate # Migration de production
npm run db:seed    # Données de démonstration
npm run db:studio  # Interface Prisma Studio
npm run build      # Build de production
```

## Variables d'environnement requises
Voir `.env.example` pour la liste complète.
Minimum pour démarrer :
- `DATABASE_URL`
- `DIRECT_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
