export const SUB_API_DOCS_VERSION = '1.1.0'

export const SUB_API_DOCS_MARKDOWN = `# YelhaSubs — API Abonnements

Documentation complète de l'API publique permettant de piloter votre module d'abonnements clients depuis votre propre site, application ou SaaS.

---

## 🏠 Introduction

L'API YelhaSubs Abonnements vous permet de gérer programmatiquement vos **plans tarifaires**, vos **clients** et leurs **abonnements** sans passer par le dashboard.

**Cas d'usage typiques :**
- Créer automatiquement un abonnement quand un client s'inscrit sur votre site
- Synchroniser vos clients avec votre CRM
- Générer un lien de paiement Chargily à la volée
- Consulter le statut d'un abonnement depuis votre application

**Périmètre de l'API :**

| ✅ Possible via API | ❌ Réservé au dashboard |
|---|---|
| CRUD plans, clients, abonnements | Modifier CCP / WhatsApp / clé Chargily |
| Générer un lien Chargily | Modifier les templates d'email |
| Changer le statut d'un abonnement | Changer la langue des emails |
| Étendre une période de facturation | Gérer les clés API (créer / révoquer) |

---

## 🔖 Versionnage

**Version actuelle : \`1.1.0\`**

L'URL de base n'inclut pas de numéro de version (\`/api/sub-api/\`). En cas de changement incompatible, un préfixe de version sera ajouté et l'ancienne version sera maintenue **6 mois** avant d'être dépréciée.

---

## 🌍 Environnements

| Environnement | URL de base |
|---|---|
| Production | \`https://subs.yelha.net/api/sub-api\` |
| Local (dev) | \`http://localhost:3000/api/sub-api\` |

Il n'existe pas d'environnement sandbox distinct. Pour tester, utilisez des données de test dans votre compte de production (plans avec \`isActive: false\`, clients fictifs, etc.).

---

## 🔑 Authentification

Toutes les requêtes nécessitent une **clé API** dans le header :

\`\`\`
Authorization: Bearer yelha_sub_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
\`\`\`

**Générer une clé :** Dashboard > Abonnements > Intégration > Générer une clé.

### Règles des clés

| Règle | Valeur |
|---|---|
| Nombre max de clés actives | **5** |
| Expiration automatique | ❌ Non — les clés n'expirent jamais |
| Révocation via API | ❌ Non — uniquement depuis le dashboard |
| Format | \`yelha_sub_\` suivi de 64 caractères hexadécimaux |
| Stockage côté YelhaSubs | Hash SHA256 — la clé brute n'est jamais conservée |

> ⚠️ La clé brute n'est affichée **qu'une seule fois** à sa création. Si vous la perdez, révoquez-la et générez-en une nouvelle.

### Clé compromise

1. Révoquez-la immédiatement depuis Dashboard > Abonnements > Intégration
2. Générez une nouvelle clé
3. Mettez à jour vos variables d'environnement

---

## 🌐 URL de base

\`\`\`
https://subs.yelha.net/api/sub-api
\`\`\`

---

## ⏱️ Limite de requêtes

| Limite | Fenêtre |
|---|---|
| **60 requêtes** | par minute, par clé |

Les headers de réponse incluent toujours :

\`\`\`
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1747312800000
\`\`\`

En cas de dépassement, le statut est \`429\` avec :

\`\`\`
Retry-After: 14
\`\`\`

La valeur \`Retry-After\` est en **secondes**.

---

## 📋 Format des réponses

**Succès (ressource unique) :**

\`\`\`json
{ "data": { "id": "clx123...", "name": "Premium" } }
\`\`\`

**Succès (liste) :**

\`\`\`json
{
  "data": [ ... ],
  "meta": { "total": 42, "page": 1, "limit": 50 }
}
\`\`\`

**Erreur :**

\`\`\`json
{ "error": "Description lisible", "code": "CODE_MACHINE" }
\`\`\`

### Codes HTTP

| Statut | Signification |
|---|---|
| \`200\` | OK |
| \`201\` | Créé avec succès |
| \`400\` | Corps JSON invalide ou absent |
| \`401\` | Clé API manquante, invalide ou révoquée |
| \`403\` | Abonnement expiré, accès refusé ou limite d'abonnements atteinte |
| \`404\` | Ressource introuvable |
| \`409\` | Conflit (plan avec abonnés actifs, limite de clés atteinte, etc.) |
| \`422\` | Données invalides (validation Zod) |
| \`429\` | Limite de requêtes dépassée |
| \`502\` | Erreur de l'API Chargily |

### Codes machine complets

| Code | Statut | Déclencheur |
|---|---|---|
| \`UNAUTHENTICATED\` | 401 | Header \`Authorization\` absent |
| \`INVALID_KEY_FORMAT\` | 401 | La clé ne commence pas par \`yelha_sub_\` |
| \`INVALID_KEY\` | 401 | Clé inexistante ou révoquée |
| \`RATE_LIMIT_EXCEEDED\` | 429 | 60 req/min dépassées |
| \`SUBSCRIPTION_EXPIRED\` | 403 | Votre abonnement YelhaSubs a expiré |
| \`APP_ACCESS_DENIED\` | 403 | Abonnement YelhaSubs requis pour accéder à cette ressource |
| \`SUBSCRIPTION_LIMIT\` | 403 | Limite d'abonnements actifs atteinte pour votre plan |
| \`BAD_BODY\` | 400 | Corps JSON non parsable |
| \`VALIDATION_ERROR\` | 422 | Champs manquants ou invalides (Zod) |
| \`NOT_FOUND\` | 404 | Ressource introuvable |
| \`CONFLICT\` | 409 | Conflit (suppression avec dépendances actives, etc.) |
| \`PLAN_NOT_FOUND\` | 422 | \`planId\` inexistant ou inactif |
| \`CLIENT_NOT_FOUND\` | 422 | \`clientId\` inexistant |
| \`CLIENT_REQUIRED\` | 422 | Ni \`clientId\` ni \`newClient\` fourni |
| \`CHARGILY_NOT_CONFIGURED\` | 409 | Clé Chargily non configurée dans le dashboard |
| \`SUBSCRIPTION_NOT_RENEWABLE\` | 409 | Abonnement EXPIRED ou CANCELLED |
| \`CHARGILY_ERROR\` | 502 | L'API Chargily a retourné une erreur |

### Format des erreurs de validation (422)

\`\`\`json
{ "error": "Données invalides", "code": "VALIDATION_ERROR" }
\`\`\`

> Les détails champ par champ ne sont pas exposés dans la réponse. Référez-vous au tableau des champs de chaque ressource pour connaître les contraintes exactes.

---

## 📄 Pagination

Tous les endpoints de liste acceptent \`page\` et \`limit\` en query string.

| Paramètre | Défaut | Maximum |
|---|---|---|
| \`page\` | \`1\` | — |
| \`limit\` | \`50\` | \`100\` |

**Si aucun résultat :**

\`\`\`json
{ "data": [], "meta": { "total": 0, "page": 1, "limit": 50 } }
\`\`\`

---

## 🚫 Ce que vous NE pouvez PAS faire via l'API

Ces actions restent réservées à l'interface dashboard :

- ❌ Modifier vos **coordonnées de paiement** (CCP, WhatsApp, clé Chargily)
- ❌ Modifier le **contenu** des emails de rappel
- ❌ Changer la **langue** des emails
- ❌ Créer ou **révoquer** des clés API

---

# 📦 PLANS

## Objet plan

\`\`\`json
{
  "id": "clx123...",
  "userId": "clx456...",
  "name": "Premium",
  "description": "Plan mensuel premium",
  "price": "2500",
  "currency": "DZD",
  "interval": "MONTHLY",
  "intervalCount": 1,
  "trialDays": 7,
  "features": ["Support 24/7", "Accès illimité"],
  "isActive": true,
  "createdAt": "2026-05-01T10:00:00.000Z",
  "updatedAt": "2026-05-01T10:00:00.000Z"
}
\`\`\`

> Note : \`price\` est retourné sous forme de **chaîne** (type Decimal en base). Parsez-le avec \`parseFloat()\`.

## Champs des plans

| Champ | Type | Requis | Défaut | Contraintes |
|---|---|---|---|---|
| \`name\` | string | ✅ Oui | — | min 1, max 200 |
| \`description\` | string | Non | null | max 2000 |
| \`price\` | number | ✅ Oui | — | ≥ 0, pas de maximum |
| \`currency\` | string | Non | \`"DZD"\` | max 10 caractères |
| \`interval\` | enum | Non | \`"MONTHLY"\` | DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY |
| \`intervalCount\` | integer | Non | \`1\` | ≥ 1, pas de maximum |
| \`trialDays\` | integer | Non | null | ≥ 0, pas de maximum |
| \`features\` | string[] | Non | \`[]\` | Chaque élément max 200 car., pas de limite sur le nombre |
| \`isActive\` | boolean | Non | \`true\` | — |

## GET /plans — Lister les plans

\`\`\`http
GET /api/sub-api/plans?page=1&limit=50
\`\`\`

**Réponse 200 :**

\`\`\`json
{
  "data": [
    {
      "id": "clx123...",
      "name": "Premium",
      "description": "Plan mensuel premium",
      "price": "2500",
      "currency": "DZD",
      "interval": "MONTHLY",
      "intervalCount": 1,
      "trialDays": 7,
      "features": ["Support 24/7"],
      "isActive": true,
      "createdAt": "2026-05-01T10:00:00.000Z",
      "updatedAt": "2026-05-01T10:00:00.000Z"
    }
  ],
  "meta": { "total": 3, "page": 1, "limit": 50 }
}
\`\`\`

## POST /plans — Créer un plan

\`\`\`http
POST /api/sub-api/plans
Content-Type: application/json
\`\`\`

\`\`\`json
{
  "name": "Premium",
  "description": "Plan mensuel premium",
  "price": 2500,
  "interval": "MONTHLY",
  "intervalCount": 1,
  "trialDays": 7,
  "features": ["Support 24/7", "Accès illimité"],
  "isActive": true
}
\`\`\`

**Réponse 201 :**

\`\`\`json
{
  "data": {
    "id": "clx789...",
    "userId": "clx456...",
    "name": "Premium",
    "description": "Plan mensuel premium",
    "price": "2500",
    "currency": "DZD",
    "interval": "MONTHLY",
    "intervalCount": 1,
    "trialDays": 7,
    "features": ["Support 24/7", "Accès illimité"],
    "isActive": true,
    "createdAt": "2026-05-17T10:00:00.000Z",
    "updatedAt": "2026-05-17T10:00:00.000Z"
  }
}
\`\`\`

## GET /plans/{id} — Récupérer un plan

\`\`\`http
GET /api/sub-api/plans/{id}
\`\`\`

**Réponse 200 :** objet plan complet (voir ci-dessus).
**Réponse 404 :** \`{ "error": "Plan introuvable", "code": "NOT_FOUND" }\`

## PATCH /plans/{id} — Modifier un plan

Tous les champs sont optionnels. Seuls les champs envoyés sont mis à jour.

\`\`\`http
PATCH /api/sub-api/plans/{id}
Content-Type: application/json
\`\`\`

\`\`\`json
{ "price": 3000, "isActive": false }
\`\`\`

**Réponse 200 :** objet plan mis à jour.

> ⚠️ Modifier \`price\` n'affecte pas les abonnements existants — seulement les nouveaux.

## DELETE /plans/{id} — Supprimer un plan

\`\`\`http
DELETE /api/sub-api/plans/{id}
\`\`\`

**Réponse 200 :** \`{ "data": { "deleted": true } }\`
**Réponse 409 :** si des abonnements ACTIVE ou TRIAL utilisent ce plan.

> 💡 Préférez \`PATCH { "isActive": false }\` pour désactiver sans supprimer.

---

# 👤 CLIENTS

## Objet client

\`\`\`json
{
  "id": "clx123...",
  "name": "Benali",
  "firstName": "Ahmed",
  "phone": "0555123456",
  "email": "ahmed@exemple.com",
  "wilaya": "Alger",
  "address": "16 rue de la Liberté",
  "clientType": "INDIVIDUAL",
  "createdAt": "2026-05-01T10:00:00.000Z"
}
\`\`\`

## Champs des clients

| Champ | Type | Requis | Défaut | Contraintes |
|---|---|---|---|---|
| \`name\` | string | ✅ Oui | — | min 1, max 200 |
| \`firstName\` | string | Non | null | max 100 |
| \`phone\` | string | Non | null | max 30, format libre |
| \`email\` | string | Non | null | format email valide |
| \`wilaya\` | string | Non | null | max 100 |
| \`address\` | string | Non | null | max 300 |
| \`clientType\` | enum | Non | \`"INDIVIDUAL"\` | INDIVIDUAL, COMPANY |

**Unicité :** il n'y a **pas** de contrainte d'unicité sur l'email ou le téléphone. Deux clients peuvent avoir la même adresse email.

## GET /clients — Lister les clients

\`\`\`http
GET /api/sub-api/clients?page=1&limit=50&search=ahmed
\`\`\`

**Paramètre \`search\` :** recherche dans les champs \`name\`, \`firstName\`, \`email\` et \`phone\` (insensible à la casse pour les textes).

**Filtre wilaya :** non disponible via l'API.

**Réponse 200 :**

\`\`\`json
{
  "data": [
    { "id": "clx123...", "name": "Benali", "firstName": "Ahmed", "email": "ahmed@exemple.com", ... }
  ],
  "meta": { "total": 1, "page": 1, "limit": 50 }
}
\`\`\`

## POST /clients — Créer un client

\`\`\`http
POST /api/sub-api/clients
Content-Type: application/json
\`\`\`

\`\`\`json
{
  "name": "Benali",
  "firstName": "Ahmed",
  "phone": "0555123456",
  "email": "ahmed@exemple.com",
  "wilaya": "Alger",
  "address": "16 rue de la Liberté",
  "clientType": "INDIVIDUAL"
}
\`\`\`

**Réponse 201 :**

\`\`\`json
{
  "data": {
    "id": "clx789...",
    "name": "Benali",
    "firstName": "Ahmed",
    "phone": "0555123456",
    "email": "ahmed@exemple.com",
    "wilaya": "Alger",
    "address": "16 rue de la Liberté",
    "clientType": "INDIVIDUAL",
    "createdAt": "2026-05-17T10:00:00.000Z"
  }
}
\`\`\`

## GET /clients/{id} — Récupérer un client

\`\`\`http
GET /api/sub-api/clients/{id}
\`\`\`

**Réponse 200 :** objet client complet.
**Réponse 404 :** \`{ "error": "Client introuvable", "code": "NOT_FOUND" }\`

## PATCH /clients/{id} — Modifier un client

\`\`\`http
PATCH /api/sub-api/clients/{id}
Content-Type: application/json
\`\`\`

\`\`\`json
{ "phone": "0661234567", "wilaya": "Oran" }
\`\`\`

Envoyez \`null\` pour effacer un champ optionnel : \`{ "email": null }\`.

**Réponse 200 :** objet client mis à jour.

## DELETE /clients/{id} — Supprimer un client

\`\`\`http
DELETE /api/sub-api/clients/{id}
\`\`\`

**Réponse 200 :** \`{ "data": { "deleted": true } }\`
**Réponse 409 :** si le client a des abonnements ACTIVE ou TRIAL. Annulez-les d'abord.

---

# 🔁 ABONNEMENTS

## Objet abonnement

\`\`\`json
{
  "id": "clx123...",
  "status": "ACTIVE",
  "planId": "clx456...",
  "clientId": "clx789...",
  "clientEmail": "ahmed@exemple.com",
  "startDate": "2026-05-01T00:00:00.000Z",
  "endDate": null,
  "nextBilling": "2026-06-01T00:00:00.000Z",
  "cancelledAt": null,
  "notes": "Client VIP",
  "createdAt": "2026-05-01T10:00:00.000Z",
  "updatedAt": "2026-05-01T10:00:00.000Z",
  "client": { "id": "clx789...", "name": "Benali", "firstName": "Ahmed", "email": "ahmed@exemple.com" },
  "plan":   { "id": "clx456...", "name": "Premium", "price": "2500", "interval": "MONTHLY" }
}
\`\`\`

## Statuts et transitions

| Statut | Description |
|---|---|
| \`TRIAL\` | Période d'essai gratuite |
| \`ACTIVE\` | Abonnement payant actif |
| \`PAUSED\` | En pause (aucune action automatique) |
| \`CANCELLED\` | Annulé manuellement |
| \`EXPIRED\` | Expiré automatiquement |

**Tableau des transitions valides :**

| De \\ Vers | TRIAL | ACTIVE | PAUSED | CANCELLED | EXPIRED |
|---|---|---|---|---|---|
| TRIAL | — | ✅ | ✅ | ✅ | auto |
| ACTIVE | — | — | ✅ | ✅ | auto |
| PAUSED | — | ✅ | — | ✅ | — |
| CANCELLED | — | ✅ | — | — | — |
| EXPIRED | — | ✅ | — | — | — |

> L'API accepte **toute** transition de statut via PATCH — c'est à vous de respecter la logique métier ci-dessus.

**Expiration automatique** (job cron, chaque jour à 10h UTC+1) :
- \`ACTIVE\` dont \`nextBilling\` < maintenant − 7 jours → \`EXPIRED\`
- \`TRIAL\` dont \`nextBilling\` < maintenant → \`EXPIRED\` (immédiat, sans délai de grâce)

## GET /subscriptions — Lister les abonnements

\`\`\`http
GET /api/sub-api/subscriptions?page=1&limit=50&status=ACTIVE&clientId=cli_xxx&planId=plan_xxx
\`\`\`

**Filtres disponibles :**

| Paramètre | Description |
|---|---|
| \`status\` | Filtrer par statut (TRIAL, ACTIVE, PAUSED, CANCELLED, EXPIRED) |
| \`clientId\` | Filtrer par client |
| \`planId\` | Filtrer par plan |

**Réponse 200 :**

\`\`\`json
{
  "data": [ { /* objet abonnement */ } ],
  "meta": { "total": 12, "page": 1, "limit": 50 }
}
\`\`\`

## GET /subscriptions/{id} — Récupérer un abonnement

\`\`\`http
GET /api/sub-api/subscriptions/{id}
\`\`\`

**Réponse 200 :** objet abonnement complet (avec \`client\` et \`plan\` imbriqués).
**Réponse 404 :** \`{ "error": "Abonnement introuvable", "code": "NOT_FOUND" }\`

## POST /subscriptions — Créer un abonnement

\`\`\`http
POST /api/sub-api/subscriptions
Content-Type: application/json
\`\`\`

### Champs

| Champ | Type | Requis | Défaut | Notes |
|---|---|---|---|---|
| \`planId\` | string | ✅ Oui | — | Doit être actif |
| \`clientId\` | string | ¹ | — | ID d'un client existant |
| \`newClient\` | object | ¹ | — | Crée le client en même temps |
| \`clientEmail\` | string | Non | null | Email pour les rappels automatiques |
| \`status\` | enum | Non | \`"ACTIVE"\` | TRIAL, ACTIVE, PAUSED |
| \`startDate\` | ISO 8601 | Non | maintenant | Date de début |
| \`endDate\` | ISO 8601 | Non | null | Date de fin fixe (optionnel) |
| \`nextBilling\` | ISO 8601 | Non | calculé | Écrase le calcul automatique |
| \`notes\` | string | Non | null | max 1000 caractères |

¹ \`clientId\` **ou** \`newClient\` est requis. Si les deux sont fournis, \`clientId\` est prioritaire et \`newClient\` est ignoré.

**Calcul automatique de \`nextBilling\` :**
- \`status: "TRIAL"\` + plan avec \`trialDays\` → \`startDate + trialDays jours\`
- \`status: "ACTIVE"\` → \`startDate + interval × intervalCount\`
- \`status: "PAUSED"\` → \`null\`

**Avec client existant :**

\`\`\`json
{
  "planId": "plan_xxx",
  "clientId": "cli_xxx",
  "clientEmail": "ahmed@exemple.com",
  "status": "ACTIVE",
  "startDate": "2026-05-17T00:00:00.000Z"
}
\`\`\`

**Avec création de client inline :**

\`\`\`json
{
  "planId": "plan_xxx",
  "newClient": {
    "name": "Benali",
    "firstName": "Ahmed",
    "phone": "0555123456",
    "email": "ahmed@exemple.com"
  },
  "clientEmail": "ahmed@exemple.com",
  "status": "TRIAL"
}
\`\`\`

**Réponse 201 :**

\`\`\`json
{
  "data": {
    "id": "clx999...",
    "status": "ACTIVE",
    "planId": "plan_xxx",
    "clientId": "cli_xxx",
    "clientEmail": "ahmed@exemple.com",
    "startDate": "2026-05-17T00:00:00.000Z",
    "endDate": null,
    "nextBilling": "2026-06-17T00:00:00.000Z",
    "cancelledAt": null,
    "notes": null,
    "createdAt": "2026-05-17T10:00:00.000Z",
    "updatedAt": "2026-05-17T10:00:00.000Z",
    "client": { "id": "cli_xxx", "name": "Benali", "firstName": "Ahmed", "email": "ahmed@exemple.com" },
    "plan":   { "id": "plan_xxx", "name": "Premium", "price": "2500", "interval": "MONTHLY" }
  }
}
\`\`\`

> 💡 Si \`clientEmail\` est fourni, un email de bienvenue est envoyé automatiquement après la création.

> ⚠️ La création échoue avec `403 SUBSCRIPTION_LIMIT` si vous avez atteint le nombre maximum d'abonnements actifs autorisé par votre plan YelhaSubs (Starter: 20, Premium: 50, Pro: 220, Agency: illimité).

## PATCH /subscriptions/{id} — Modifier un abonnement

\`\`\`http
PATCH /api/sub-api/subscriptions/{id}
Content-Type: application/json
\`\`\`

Tous les champs sont optionnels.

| Champ | Type | Notes |
|---|---|---|
| \`status\` | enum | TRIAL, ACTIVE, PAUSED, CANCELLED, EXPIRED |
| \`planId\` | string | Changer de plan |
| \`nextBilling\` | ISO 8601 \| null | Étendre ou annuler la prochaine facturation |
| \`endDate\` | ISO 8601 \| null | Date de fin fixe |
| \`clientEmail\` | string \| null | Mettre à jour l'email de rappel |
| \`notes\` | string | max 1000 caractères |

**Exemples courants :**

\`\`\`json
// Activer après paiement manuel
{ "status": "ACTIVE", "nextBilling": "2026-06-17T00:00:00.000Z" }

// Mettre en pause
{ "status": "PAUSED" }

// Étendre la période
{ "nextBilling": "2026-07-17T00:00:00.000Z" }

// Annuler
{ "status": "CANCELLED" }
\`\`\`

**Réponse 200 :** objet abonnement mis à jour.

## DELETE /subscriptions/{id} — Supprimer un abonnement

\`\`\`http
DELETE /api/sub-api/subscriptions/{id}
\`\`\`

**Réponse 200 :** \`{ "data": { "deleted": true } }\`

> ⚠️ Suppression **définitive** et irréversible. Pour conserver l'historique, utilisez plutôt \`PATCH { "status": "CANCELLED" }\`.

---

# 💳 CHECKOUT / PAIEMENT

## POST /subscriptions/{id}/checkout — Générer un lien Chargily

\`\`\`http
POST /api/sub-api/subscriptions/{id}/checkout
Content-Type: application/json
\`\`\`

\`\`\`json
{
  "successUrl": "https://monsite.com/paiement-reussi",
  "failureUrl": "https://monsite.com/paiement-echec"
}
\`\`\`

Les deux champs sont **optionnels** (défaut : URL de base de l'application).

**Réponse 200 :**

\`\`\`json
{
  "data": {
    "checkoutUrl": "https://pay.chargily.net/checkout/abc123...",
    "amount": 2500,
    "currency": "DZD"
  }
}
\`\`\`

### Règles

| Question | Réponse |
|---|---|
| Devises supportées | **DZD uniquement** |
| Durée de validité du lien | Dépend de Chargily (~24h). YelhaSubs ne contrôle pas cette durée. |
| Appels multiples | Chaque appel génère un **nouveau** lien Chargily indépendant |
| Abonnement EXPIRED ou CANCELLED | \`409 SUBSCRIPTION_NOT_RENEWABLE\` |
| Clé Chargily non configurée | \`409 CHARGILY_NOT_CONFIGURED\` |

### Renouvellement anticipé (J-3)

Un lien peut être généré **jusqu'à 3 jours avant** l'expiration. Si le client paie alors que \`nextBilling\` est encore dans le futur, le webhook calcule la prochaine date à partir de **\`nextBilling\` existant** (pas d'aujourd'hui). Les jours restants sont ainsi préservés.

**Exemple :** abonnement expirant le 16 juin, paiement le 13 juin → prochaine facturation : **16 juillet** (et non 13 juillet).

---

# 🔔 WEBHOOK CHARGILY (paiement automatique)

Pour que les paiements en ligne activent automatiquement les abonnements, configurez le webhook côté Chargily.

## Configuration dans Chargily

1. Connectez-vous sur **pay.chargily.net** > **Développeurs** > **Webhooks**
2. Créez un webhook avec l'URL :

   \`\`\`
   https://subs.yelha.net/api/webhooks/chargily-subscriptions
   \`\`\`

3. Cochez l'événement **\`checkout.paid\`**
4. La clé de signature doit être identique à votre **clé secrète Chargily** (celle renseignée dans Dashboard > Abonnements > Paramètres > Chargily).

## Payload reçu par YelhaSubs

\`\`\`json
{
  "type": "checkout.paid",
  "data": {
    "id": "chargily_checkout_abc123",
    "amount": 2500,
    "status": "paid",
    "metadata": {
      "type": "sub_renewal",
      "subscriptionId": "clx123...",
      "userId": "clx456..."
    }
  }
}
\`\`\`

> Le champ \`metadata\` est injecté automatiquement par YelhaSubs lors de la création du checkout.

## Comportement à la réception

1. La signature HMAC SHA256 est vérifiée
2. L'abonnement passe à \`ACTIVE\`
3. \`nextBilling\` est étendu d'une période (basé sur le plan)
4. Les flags anti-spam sont réinitialisés (un nouveau rappel sera envoyé au prochain cycle)
5. **Idempotence :** un même paiement Chargily est ignoré s'il a déjà été traité (cache Redis, TTL 7 jours)

> 🔒 Seuls les événements \`checkout.paid\` avec \`status: "paid"\` sont traités. Les paiements en attente ou échoués sont ignorés sans écriture en base.

## Réponse attendue

Chargily attend un statut **\`200\`** dans un délai de **10 secondes**. YelhaSubs répond toujours en moins de 2 secondes. En cas d'absence de réponse, Chargily ré-essaie automatiquement (voir leur documentation).

## Vérification de la signature HMAC SHA256

La signature est transmise dans le header **\`signature\`** (valeur hexadécimale).

**JavaScript / Node.js :**

\`\`\`javascript
const crypto = require('crypto')

function verifyWebhook(rawBody, signature, secret) {
  const computed = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')
  if (computed.length !== signature.length) return false
  return crypto.timingSafeEqual(
    Buffer.from(computed),
    Buffer.from(signature)
  )
}

// Dans votre handler Express :
app.post('/webhook/chargily', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['signature']
  const isValid = verifyWebhook(req.body, signature, process.env.CHARGILY_SECRET)
  if (!isValid) return res.status(403).json({ error: 'Signature invalide' })

  const payload = JSON.parse(req.body)
  if (payload.type === 'checkout.paid') {
    // traitement...
  }
  res.json({ received: true })
})
\`\`\`

**PHP :**

\`\`\`php
<?php
function verifyWebhook(string $rawBody, string $signature, string $secret): bool {
    $computed = hash_hmac('sha256', $rawBody, $secret);
    return hash_equals($computed, $signature);
}

$rawBody  = file_get_contents('php://input');
$signature = $_SERVER['HTTP_SIGNATURE'] ?? '';
$secret    = getenv('CHARGILY_SECRET');

if (!verifyWebhook($rawBody, $signature, $secret)) {
    http_response_code(403);
    exit('Signature invalide');
}

$payload = json_decode($rawBody, true);
if ($payload['type'] === 'checkout.paid') {
    // traitement...
}
http_response_code(200);
echo json_encode(['received' => true]);
\`\`\`

**Python :**

\`\`\`python
import hmac
import hashlib
import os

def verify_webhook(raw_body: bytes, signature: str, secret: str) -> bool:
    computed = hmac.new(
        secret.encode('utf-8'),
        raw_body,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(computed, signature)

# Dans votre handler Flask :
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/webhook/chargily', methods=['POST'])
def chargily_webhook():
    signature = request.headers.get('signature', '')
    if not verify_webhook(request.data, signature, os.environ['CHARGILY_SECRET']):
        return jsonify({'error': 'Signature invalide'}), 403

    payload = request.get_json()
    if payload.get('type') == 'checkout.paid':
        pass  # traitement...
    return jsonify({'received': True})
\`\`\`

---

# 💻 EXEMPLES DE CODE

## Créer un abonnement — cURL

\`\`\`bash
curl -X POST https://subs.yelha.net/api/sub-api/subscriptions \\
  -H "Authorization: Bearer yelha_sub_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "planId": "plan_xxx",
    "clientId": "cli_xxx",
    "clientEmail": "client@exemple.com",
    "status": "ACTIVE"
  }'
\`\`\`

## Créer un abonnement — JavaScript / Node.js

\`\`\`javascript
const res = await fetch('https://subs.yelha.net/api/sub-api/subscriptions', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${process.env.YELHA_SUB_KEY}\`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    planId: 'plan_xxx',
    newClient: { name: 'Benali', firstName: 'Ahmed', email: 'ahmed@exemple.com' },
    clientEmail: 'ahmed@exemple.com',
    status: 'TRIAL',
  }),
})
const { data } = await res.json()
console.log('Abonnement créé :', data.id)
\`\`\`

## Créer un abonnement — PHP

\`\`\`php
$ch = curl_init('https://subs.yelha.net/api/sub-api/subscriptions');
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => [
        'Authorization: Bearer ' . getenv('YELHA_SUB_KEY'),
        'Content-Type: application/json',
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'planId'      => 'plan_xxx',
        'clientId'    => 'cli_xxx',
        'clientEmail' => 'client@exemple.com',
        'status'      => 'ACTIVE',
    ]),
]);
$response = json_decode(curl_exec($ch), true);
curl_close($ch);
\`\`\`

## Créer un abonnement — Python

\`\`\`python
import os, requests

r = requests.post(
    'https://subs.yelha.net/api/sub-api/subscriptions',
    headers={
        'Authorization': f"Bearer {os.environ['YELHA_SUB_KEY']}",
        'Content-Type': 'application/json',
    },
    json={
        'planId': 'plan_xxx',
        'clientId': 'cli_xxx',
        'clientEmail': 'client@exemple.com',
        'status': 'ACTIVE',
    },
)
r.raise_for_status()
print(r.json()['data']['id'])
\`\`\`

## Pagination — itérer toutes les pages

\`\`\`javascript
async function fetchAll(endpoint, apiKey) {
  const results = []
  let page = 1
  while (true) {
    const res = await fetch(
      \`https://subs.yelha.net/api/sub-api/\${endpoint}?page=\${page}&limit=100\`,
      { headers: { Authorization: \`Bearer \${apiKey}\` } }
    )
    const { data, meta } = await res.json()
    results.push(...data)
    if (results.length >= meta.total) break
    page++
  }
  return results
}

// Usage
const allSubs = await fetchAll('subscriptions', process.env.YELHA_SUB_KEY)
\`\`\`

## Gestion des erreurs et retry (backoff exponentiel)

\`\`\`javascript
async function callWithRetry(requestFn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const res = await requestFn()

    // Rate limit → attendre le délai indiqué
    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get('Retry-After') ?? '5', 10)
      await new Promise(r => setTimeout(r, retryAfter * 1000))
      continue
    }

    // Erreur serveur transitoire → backoff exponentiel
    if (res.status >= 500 && res.status !== 502 && attempt < maxRetries) {
      await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000))
      continue
    }

    // 502 CHARGILY_ERROR → remonter immédiatement à l'utilisateur, pas de retry
    return res
  }
  throw new Error('Max retries atteint')
}

// Usage
const res = await callWithRetry(() =>
  fetch('https://subs.yelha.net/api/sub-api/subscriptions/clx123/checkout', {
    method: 'POST',
    headers: { Authorization: \`Bearer \${process.env.YELHA_SUB_KEY}\` },
  })
)
const body = await res.json()
if (!res.ok) throw new Error(body.error)
window.location.href = body.data.checkoutUrl
\`\`\`

---

# 🔐 BONNES PRATIQUES

- **Stockez la clé** dans une variable d'environnement (\`YELHA_SUB_KEY\`). Ne la commitez jamais.
- **Vérifiez le statut HTTP** avant de parser la réponse JSON.
- **Utilisez \`clientId\`** plutôt que \`newClient\` si le client existe déjà — évite les doublons.
- **Ne faites jamais confiance** à l'ID transmis depuis le front-end client : re-vérifiez côté serveur.
- **Retry sur \`429\` et \`5xx\`** avec backoff exponentiel. Ne retryez pas \`502\` (erreur Chargily → informez l'utilisateur).
- **Révoquez immédiatement** une clé compromise depuis le dashboard et générez-en une nouvelle.
- **Vérifiez la signature HMAC** de chaque webhook avant de l'exploiter.
- **Répondez \`200\`** dès que possible dans votre handler de webhook (avant tout traitement lourd) pour éviter les timeouts Chargily.

---

# 📋 CHANGELOG

## v1.1.0 — 2026-05-17
- **Nouveau :** rappels email J-3 (3 jours avant expiration) avec lien Chargily
- **Nouveau :** renouvellement anticipé : les jours restants sont préservés si le paiement intervient dans les 3 jours avant \`nextBilling\`
- **Nouveau :** \`403 APP_SUBSCRIPTION_EXPIRED\` — toute l'API est bloquée si votre abonnement app Abonnements a expiré
- **Nouveau :** \`409 SUBSCRIPTION_NOT_RENEWABLE\` — checkout bloqué pour abonnements EXPIRED ou CANCELLED
- **Correction :** montant envoyé à Chargily en dinars entiers (plus de multiplication ×100)

## v1.0.0 — 2026-05-01
- Version initiale : CRUD Plans, Clients, Abonnements
- Génération de lien Chargily (\`/checkout\`)
- Webhook Chargily avec idempotence Redis
- Rate limiting 60 req/min par clé API

---

© ${new Date().getFullYear()} YelhaSubs — Documentation API Abonnements v${SUB_API_DOCS_VERSION}
`
