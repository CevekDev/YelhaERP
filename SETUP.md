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

## 2. Configurer Sentry (15 min) — bloquant pour ouvrir

Sans Sentry, tu es aveugle si un client crash. C'est **non-négociable** pour
de la prod payante.

1. Va sur https://sentry.io/signup/ — créer un compte gratuit (plan Developer = 5k events/mois, suffisant pour démarrer).
2. Crée un projet **Next.js**.
3. Copie le DSN affiché (format `https://abc123@oXXX.ingest.sentry.io/YYY`).
4. Dans Vercel → Settings → Environment Variables, ajoute :
   - `SENTRY_DSN` = le DSN
   - `NEXT_PUBLIC_SENTRY_DSN` = même valeur (utilisé côté browser)
5. Optionnel mais conseillé pour les source maps (debug clair) :
   - Va sur sentry.io → Settings → Auth Tokens → créer un token avec scope `project:releases`
   - Ajoute en Vercel : `SENTRY_AUTH_TOKEN`, `SENTRY_ORG` (ton org slug), `SENTRY_PROJECT` (le slug du projet)
6. Redéploie.
7. Test : sur ton site déployé, déclenche une erreur volontaire (ex: appelle `/api/inexistant`) — l'erreur doit apparaître dans le dashboard Sentry sous 30s.

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
