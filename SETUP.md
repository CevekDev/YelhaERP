# SETUP — Checklist d'ouverture aux premiers clients

À faire **dans l'ordre**. Coche au fur et à mesure.

---

## 1. Vérifier les env vars en prod (5 min) ✅

Une fois Vercel redéployé, lance :

```bash
curl https://erp.yelha.net/api/health | jq
```

Tu dois voir `"status": "healthy"`. Si c'est `degraded` ou `unhealthy`, le JSON
liste exactement la variable qui manque. Va dans **Vercel → Project → Settings
→ Environment Variables** et ajoute la(es) manquante(s) :

| Variable | Critique ? | Où la trouver |
|---|---|---|
| `DATABASE_URL` | OUI | Supabase → Project Settings → Database → Connection string (Mode: Transaction) |
| `DIRECT_URL` | OUI | Supabase → idem (Mode: Session, port 5432) |
| `NEXTAUTH_SECRET` | OUI | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | OUI | `https://erp.yelha.net` |
| `CRON_SECRET` | OUI | `openssl rand -base64 32` |
| `CHARGILY_SECRET_KEY` | OUI | Dashboard Chargily → API keys → Secret key (live) |
| `CHARGILY_WEBHOOK_SECRET` | OUI | Dashboard Chargily → Webhooks → Signing secret (souvent = secret key) |
| `RESEND_API_KEY` | OUI | resend.com → API Keys |
| `UPSTASH_REDIS_REST_URL` | Important | upstash.com → Redis DB → REST API |
| `UPSTASH_REDIS_REST_TOKEN` | Important | idem |
| `GOOGLE_CLIENT_ID` + `_SECRET` | Optionnel | Google Cloud Console → OAuth credentials |
| `DEEPSEEK_API_KEY` | Optionnel (IA) | platform.deepseek.com |
| `NEXT_PUBLIC_APP_URL` | OUI | `https://erp.yelha.net` |

Après chaque ajout dans Vercel, **redéploie** (Vercel → Deployments → Redeploy)
puis ré-appelle `/api/health` pour confirmer.

---

## 2. Monitoring d'erreurs — optionnel

Le code marche sans Sentry. Les erreurs sont alors loggées dans **Vercel
Logs** (gratuit, inclus avec ton plan Vercel).

### Workflow Vercel Logs (zéro setup, ce qu'on utilise par défaut)

Quand un client signale un bug, ou quand un truc déconne :

1. Vercel → ton projet → **Logs** (onglet en haut).
2. Filtre par date / niveau (Error).
3. Tu vois les stack traces serveur **et** les `console.error` du navigateur
   (captés par Vercel via les logs runtime).

**Limites** :
- Pas de regroupement automatique (10 occurrences de la même erreur = 10 lignes)
- Logs purgés après 1-3 jours selon plan Vercel
- Pas d'alerte email "tel client a crash maintenant" — tu dois aller checker

C'est suffisant pour 1-20 clients. Au-delà, considère brancher Sentry plus tard.

### Si tu veux Sentry plus tard (5 min)

Le code est déjà branché — il suffit d'ajouter les env vars :
1. https://sentry.io/signup/ → projet Next.js → **plan Developer = gratuit à vie**, 5k erreurs/mois, **pas de carte requise**
   (attention : Sentry te met sur un trial Business 14j par défaut — switch manuellement au plan Developer dans Settings → Subscription)
2. Copie le DSN, ajoute dans Vercel : `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` (même valeur)
3. Redéploie → vérifie `/api/health` : `sentryDsn.ok = true`

---

## 3. Vérifier Resend (10 min) — bloquant pour ouvrir

Sans domaine vérifié, **les emails partent dans les spams** (ou pas du tout).

1. resend.com → **Domains** → Add Domain → `yelha.net` (ou ton domaine).
2. Resend te donne 3 enregistrements DNS (SPF, DKIM, MX/DMARC).
3. Ajoute-les chez ton registrar DNS (Cloudflare, OVH, etc.).
4. Attends propagation (5 min à 1h) puis click "Verify".
5. Status doit passer à `Verified` (vert).
6. Vérifie que l'expéditeur dans `lib/email/resend.ts` matche le domaine vérifié.
7. Test : envoie-toi un email via le formulaire `/login` (mot de passe oublié, par ex.) — vérifie qu'il arrive dans la boîte normale, pas en spam.

---

## 4. Backups Supabase (5 min)

1. supabase.com → ton projet → **Database → Backups**.
2. Vérifie que les backups quotidiens sont actifs (plan Free = 7j de rétention, plan Pro = 14j).
3. Si tu veux plus, upgrade au plan Pro (~25$/mois).
4. **Note** : un point-in-time recovery (PITR) nécessite Pro+. Sans PITR, tu ne peux restaurer qu'à un point de backup quotidien — pas à la seconde près.

---

## 5. Smoke test prod (3 min)

Une fois tout configuré, lance le smoke test depuis ta machine :

```bash
npx tsx scripts/smoke-test-prod.ts
```

Tu dois voir `✓ N/N OK — prod looks good`. Sinon, le script te dit exactement
quel endpoint est cassé.

---

## 6. Test E2E manuel (15 min) — bloquant pour ouvrir

Le seul moyen vraiment fiable de savoir que le flow paiement complet marche.

1. Crée un compte de test (`yelhatest+1@gmail.com`) sur `/register`.
2. Vérifie que l'email de vérification arrive (sinon → revoir étape 3 Resend).
3. Entre le code → tu dois atterrir sur `/onboarding`.
4. Remplis l'onboarding (nom entreprise, etc.).
5. Va dans `/dashboard/settings/billing` → choisis le plan Starter → CCP.
6. Tu dois recevoir les instructions CCP avec une référence.
7. *(Optionnel si tu as un compte Chargily test)* : retry avec Chargily Pay. Le webhook doit te repasser à ACTIVE.
8. Va dans `/dashboard/settings/applications` → essai "Abonnements clients" 15j.
9. Vérifie que le compteur 15j s'affiche correctement.
10. Vérifie que tu peux accéder à `/dashboard/subscriptions`.

Si chaque étape marche, **tu peux ouvrir aux clients**.

---

## 7. Ouvrir aux clients (0 min)

- Annonce ton lancement (réseaux, email).
- Garde un œil sur `Sentry` (canal Slack/Discord pour les alertes ?).
- Garde `/api/health` en bookmark — premier réflexe en cas de doute.

---

## Ce qui reste bloquant pour ouvrir

- ✅ Toutes les env vars critiques en place (cf. étape 1, `/api/health` → healthy)
- ✅ Resend domaine vérifié (étape 3) — sinon les emails partent en spam
- ✅ Au moins **un** test E2E manuel réussi en prod (étape 6)

Tout le reste (Sentry, i18n, withAuth, migrations versionnées) = sprints futurs.

## En cas de problème en prod

| Symptôme | Réflexe |
|---|---|
| Site down | `curl /api/health` → identifie quelle env var ou DB est cassée |
| Erreurs JS chez un client | Sentry → filtre par user.email |
| Paiement Chargily qui s'active pas | Vercel logs → cherche `chargily` → vérifie HMAC, idempotence |
| Email pas reçu | Resend dashboard → Logs → cherche par destinataire |
| Rate limit "Trop de tentatives" injuste | Upstash console → vide la clé `verify_email:xxx` ou `pwd_change:xxx` |

---

**Quand tout est ✅** : tu peux commercialiser. 🚀

---

## Bonus : alertes minimales sans Sentry

Si tu veux **être notifié** quand un truc casse en prod, sans Sentry :

### Option A — UptimeRobot (gratuit, 2 min)
1. https://uptimerobot.com/ → free account (50 monitors gratuits)
2. Add Monitor → HTTP(s) → URL : `https://erp.yelha.net/api/health`
3. Interval : 5 min
4. Add alert contact (ton email / SMS / Discord webhook)
5. Si `/api/health` retourne 503 → tu es alerté en ~5 min

### Option B — Vercel Integrations
Vercel a une intégration native vers Slack/Discord pour les "Deployment Failed".
Settings → Integrations → Slack/Discord → install. Te notifie sur les build
errors mais pas les runtime errors.

### Option C — Discord webhook DIY
Tu me dis et je te branche un capture-erreur léger qui post vers Discord
(~10 min de code). Gratuit, illimité, zéro signup tiers.
