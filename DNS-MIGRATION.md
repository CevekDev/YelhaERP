# Migration domaine : erp.yelha.net → subs.yelha.net

YelhaERP pivote vers **YelhaSubs**. Étapes pour migrer le domaine vers `subs.yelha.net`.

## 1. Vercel — ajouter le nouveau domaine (5 min)

1. Vercel → ton projet → **Settings → Domains**
2. Clique **Add Domain** → entre `subs.yelha.net` → Continue
3. Vercel te demande de configurer un DNS record. Note le `CNAME` cible qu'il affiche (souvent `cname.vercel-dns.com`).
4. Tu peux **garder erp.yelha.net** pendant la transition pour ne pas casser les anciens liens, ou le supprimer maintenant.

## 2. DNS chez ton registrar (Cloudflare / OVH / autre) — 10 min

Selon ton registrar, va dans la zone DNS de `yelha.net` et ajoute :

| Type | Name | Value | TTL |
|------|------|-------|-----|
| CNAME | `subs` | `cname.vercel-dns.com` *(ou ce que Vercel a affiché)* | 300 (5 min) |

**Attente propagation** : 5 à 60 minutes. Vérifie avec :

```bash
dig subs.yelha.net
# ou
nslookup subs.yelha.net
```

Une fois le DNS résolu, Vercel détectera automatiquement et provisionnera le certificat SSL Let's Encrypt (encore 2-3 min).

## 3. Vercel — env vars à mettre à jour (3 min)

Vercel → ton projet → **Settings → Environment Variables**. Modifie ces 2 vars :

| Variable | Nouvelle valeur |
|---|---|
| `NEXT_PUBLIC_APP_URL` | `https://subs.yelha.net` |
| `NEXTAUTH_URL` | `https://subs.yelha.net` |

Coche Production + Preview + Development. **Redeploy** la prod après.

## 4. Chargily — mettre à jour les webhooks (3 min)

1. Dashboard Chargily (le compte YelhaSubs lui-même)
2. **Settings → Webhooks** → Edit
3. URL : `https://subs.yelha.net/api/webhooks/chargily`
4. Save

Pour tes utilisateurs (qui ont **leur** propre compte Chargily pour gérer leurs abonnés clients), ils doivent mettre dans leur dashboard Chargily :
```
https://subs.yelha.net/api/webhooks/chargily-subscriptions
```

(Note : ils l'ont peut-être déjà avec `erp.yelha.net`. Tant que les 2 domaines pointent sur le même Vercel, les 2 URLs marchent. Mais à terme, ils devraient migrer.)

## 5. Google OAuth (si utilisé) — 5 min

1. https://console.cloud.google.com/ → ton projet → **APIs & Services → Credentials**
2. Clique sur le client OAuth utilisé par YelhaSubs
3. **Authorized JavaScript origins** : ajoute `https://subs.yelha.net`
4. **Authorized redirect URIs** : ajoute `https://subs.yelha.net/api/auth/callback/google`
5. Save

## 6. Resend — domaine email (déjà fait ?)

Le domaine email vérifié sur Resend doit couvrir `@yelha.net` (l'expéditeur).
Si tu envoies depuis `noreply@yelha.net` ou `contact@yelha.net`, **rien à changer** —
le domaine racine `yelha.net` est déjà vérifié.

Si tu envoies depuis un sous-domaine spécifique (ex: `noreply@subs.yelha.net`), il
faut ajouter le sous-domaine sur Resend et configurer les DNS DKIM/SPF.

## 7. Sitemap & robots.txt

Déjà mis à jour automatiquement (pointent sur `NEXT_PUBLIC_APP_URL`).
Soumets le nouveau sitemap dans Google Search Console :
```
https://subs.yelha.net/sitemap.xml
```

## 8. Smoke test après migration

```bash
BASE_URL=https://subs.yelha.net npx tsx scripts/smoke-test-prod.ts
```

Doit afficher `✓ N/N OK`.

## 9. Optionnel — redirection erp.yelha.net → subs.yelha.net

Si tu veux préserver les vieux liens, Vercel permet une **redirection
automatique** d'un domaine vers un autre :
1. Garde `erp.yelha.net` dans les Domains de Vercel
2. Coche "Redirect to primary domain"
3. Met `subs.yelha.net` comme primary

Tous les anciens liens `https://erp.yelha.net/...` redirigeront 308 → `https://subs.yelha.net/...`.

---

**Ordre conseillé** : 1 → 2 → 3 → Redeploy → 4, 5, 6 en parallèle → 8 (smoke test) → 9 (optionnel).
