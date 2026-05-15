export const SUB_API_DOCS_MARKDOWN = `# YelhaERP — API Abonnements

Documentation complète de l'API publique permettant de piloter votre module d'abonnements depuis votre propre site, application ou SaaS.

---

## 🔑 Authentification

Toutes les requêtes nécessitent une **clé API** dans le header :

\`\`\`
Authorization: Bearer yelha_sub_xxxxxxxxxxxxxxxx
\`\`\`

Pour générer une clé : **Dashboard > Abonnements > Intégration > Générer une clé**.

**Important :** la clé n'est affichée **qu'une seule fois** à sa création. Conservez-la dans un gestionnaire de secrets.

---

## 🌐 URL de base

\`\`\`
https://erp.yelha.net/api/sub-api
\`\`\`

---

## ⏱️ Limite de requêtes

| Limite | Fenêtre |
|--------|---------|
| **60 requêtes** | par minute, par clé |

Les headers de réponse incluent toujours :

\`\`\`
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1747312800000
\`\`\`

En cas de dépassement, le statut est \`429\` avec un header \`Retry-After\` (en secondes).

---

## 📋 Format des réponses

**Succès :**

\`\`\`json
{
  "data": { /* ressource ou liste */ },
  "meta": { "total": 42, "page": 1, "limit": 50 }
}
\`\`\`

**Erreur :**

\`\`\`json
{
  "error": "Plan introuvable",
  "code": "NOT_FOUND"
}
\`\`\`

| Statut | Signification |
|--------|---------------|
| \`200\` | OK |
| \`201\` | Créé |
| \`400\` | Corps invalide |
| \`401\` | Clé manquante / invalide |
| \`404\` | Ressource introuvable |
| \`409\` | Conflit (ex: plan avec abonnés actifs, limite atteinte) |
| \`422\` | Données invalides (validation) |
| \`429\` | Trop de requêtes |
| \`502\` | Erreur Chargily |

---

## 🚫 Ce que vous NE pouvez PAS faire via l'API

Pour des raisons de sécurité, ces actions restent réservées à l'interface dashboard :

- ❌ Modifier vos **coordonnées de paiement** (CCP, WhatsApp, clé Chargily)
- ❌ Modifier le **contenu** des emails de rappel
- ❌ Changer la **langue** des emails

---

# 📦 PLANS

## Lister les plans

\`\`\`http
GET /api/sub-api/plans?page=1&limit=50
\`\`\`

**Réponse :**

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
      "features": ["Support 24/7", "Accès illimité"],
      "isActive": true,
      "createdAt": "2026-05-01T10:00:00.000Z"
    }
  ],
  "meta": { "total": 3, "page": 1, "limit": 50 }
}
\`\`\`

## Créer un plan

\`\`\`http
POST /api/sub-api/plans
Content-Type: application/json

{
  "name": "Premium",
  "description": "Plan mensuel",
  "price": 2500,
  "interval": "MONTHLY",
  "intervalCount": 1,
  "trialDays": 7,
  "features": ["Support 24/7"],
  "isActive": true
}
\`\`\`

**Intervalles valides :** \`DAILY\`, \`WEEKLY\`, \`MONTHLY\`, \`QUARTERLY\`, \`YEARLY\`.

## Récupérer un plan

\`\`\`http
GET /api/sub-api/plans/{id}
\`\`\`

## Modifier un plan

\`\`\`http
PATCH /api/sub-api/plans/{id}
Content-Type: application/json

{ "price": 3000, "isActive": false }
\`\`\`

## Supprimer un plan

\`\`\`http
DELETE /api/sub-api/plans/{id}
\`\`\`

> ⚠️ Renvoie \`409\` si des abonnements actifs ou en essai utilisent ce plan. Désactivez-le plutôt (\`PATCH isActive: false\`).

---

# 👤 CLIENTS

## Lister les clients

\`\`\`http
GET /api/sub-api/clients?page=1&limit=50&search=ahmed
\`\`\`

## Créer un client

\`\`\`http
POST /api/sub-api/clients
Content-Type: application/json

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

**\`clientType\` :** \`INDIVIDUAL\` (particulier) ou \`COMPANY\` (entreprise).

## Récupérer / modifier / supprimer

\`\`\`http
GET    /api/sub-api/clients/{id}
PATCH  /api/sub-api/clients/{id}
DELETE /api/sub-api/clients/{id}
\`\`\`

> ⚠️ La suppression renvoie \`409\` si le client a des abonnements actifs.

---

# 🔁 ABONNEMENTS

## Lister les abonnements

\`\`\`http
GET /api/sub-api/subscriptions?page=1&status=ACTIVE&clientId=cli_123
\`\`\`

**Filtres :** \`status\`, \`clientId\`, \`planId\`.

**Statuts valides :** \`TRIAL\`, \`ACTIVE\`, \`PAUSED\`, \`CANCELLED\`, \`EXPIRED\`.

## Créer un abonnement

Avec un client existant :

\`\`\`json
{
  "planId": "plan_xxx",
  "clientId": "cli_xxx",
  "clientEmail": "client@exemple.com",
  "status": "ACTIVE",
  "startDate": "2026-05-16T00:00:00.000Z"
}
\`\`\`

Avec création de client en ligne :

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

> 💡 \`nextBilling\` est calculé automatiquement (basé sur \`trialDays\` pour \`TRIAL\`, sinon sur \`interval × intervalCount\`). Vous pouvez l'écraser via le champ \`nextBilling\` (ISO 8601).

> 💡 \`clientEmail\` est l'adresse à laquelle sera envoyé le rappel J-1 (renouvellement ou fin d'essai).

## Modifier un abonnement (changement de statut manuel)

\`\`\`http
PATCH /api/sub-api/subscriptions/{id}
Content-Type: application/json

{ "status": "ACTIVE", "nextBilling": "2026-06-16T00:00:00.000Z" }
\`\`\`

**Cas d'usage :**

- Activer un essai après paiement manuel : \`{ "status": "ACTIVE" }\`
- Mettre en pause : \`{ "status": "PAUSED" }\`
- Réactiver : \`{ "status": "ACTIVE" }\`
- Étendre une période : \`{ "nextBilling": "..." }\`

## Supprimer un abonnement

\`\`\`http
DELETE /api/sub-api/subscriptions/{id}
\`\`\`

→ Suppression **définitive** de la base. L'abonnement disparaît complètement.

> 💡 Pour simplement **annuler** sans supprimer (garder dans l'historique), utilisez plutôt :
> \`\`\`http
> PATCH /api/sub-api/subscriptions/{id}
> { "status": "CANCELLED" }
> \`\`\`

## Générer un lien de paiement Chargily

\`\`\`http
POST /api/sub-api/subscriptions/{id}/checkout
Content-Type: application/json

{
  "successUrl": "https://monsite.com/paiement-reussi",
  "failureUrl": "https://monsite.com/paiement-echec"
}
\`\`\`

**Réponse :**

\`\`\`json
{
  "data": {
    "checkoutUrl": "https://pay.chargily.net/checkout/...",
    "amount": 2500,
    "currency": "DZD"
  }
}
\`\`\`

Renvoyez \`checkoutUrl\` à votre client. Une fois payé, **le webhook Chargily** met automatiquement l'abonnement à jour.

> ⚠️ Renvoie \`409\` si la clé Chargily n'est pas configurée dans le dashboard.

---

# 🔔 WEBHOOK CHARGILY (paiement automatique)

Pour que les paiements en ligne activent automatiquement les abonnements, configurez le webhook côté Chargily.

## Configuration dans Chargily

1. Connectez-vous sur **pay.chargily.net** > **Développeurs** > **Webhooks**
2. Créez un webhook avec l'URL :

   \`\`\`
   https://erp.yelha.net/api/webhooks/chargily-subscriptions
   \`\`\`

3. Cochez l'événement **\`checkout.paid\`**
4. Le **secret du webhook** doit être identique à votre **clé secrète Chargily** (celle configurée dans le dashboard).

## Comportement

Quand un paiement est confirmé :

1. La signature est vérifiée (HMAC SHA256)
2. L'abonnement passe à \`ACTIVE\`
3. \`nextBilling\` est étendu d'une période (basé sur le plan)
4. Les flags anti-spam sont réinitialisés

> 🔒 Les paiements **en attente** ou **échoués** ne sont **jamais** enregistrés en base. Seuls les paiements confirmés impactent l'abonnement.

---

# 💻 EXEMPLES

## cURL — Créer un abonnement

\`\`\`bash
curl -X POST https://erp.yelha.net/api/sub-api/subscriptions \\
  -H "Authorization: Bearer yelha_sub_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "planId": "plan_xxx",
    "clientId": "cli_xxx",
    "clientEmail": "client@exemple.com",
    "status": "ACTIVE"
  }'
\`\`\`

## JavaScript / Node.js

\`\`\`javascript
const res = await fetch('https://erp.yelha.net/api/sub-api/subscriptions', {
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
console.log('Subscription créé :', data.id)
\`\`\`

## PHP

\`\`\`php
$ch = curl_init('https://erp.yelha.net/api/sub-api/subscriptions');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . getenv('YELHA_SUB_KEY'),
    'Content-Type: application/json',
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'planId'      => 'plan_xxx',
    'clientId'    => 'cli_xxx',
    'clientEmail' => 'client@exemple.com',
    'status'      => 'ACTIVE',
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = json_decode(curl_exec($ch), true);
\`\`\`

## Python

\`\`\`python
import os, requests

r = requests.post(
    'https://erp.yelha.net/api/sub-api/subscriptions',
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
print(r.json()['data']['id'])
\`\`\`

---

# 🔐 BONNES PRATIQUES

- **Stockez la clé** dans une variable d'environnement (ex: \`YELHA_SUB_KEY\`). Ne la mettez jamais en clair dans le code.
- **Révoquez immédiatement** une clé compromise depuis le dashboard et générez-en une nouvelle.
- **Validez** côté serveur les ressources que vous manipulez : ne faites jamais confiance à l'ID transmis depuis le client.
- **Vérifiez le statut HTTP** avant de parser la réponse.
- **Implémentez une stratégie de retry** avec backoff exponentiel sur les \`429\` et \`5xx\` (sauf \`502 CHARGILY_ERROR\` qui doit être remonté à l'utilisateur).

---

© ${new Date().getFullYear()} YelhaERP — Documentation API Abonnements
`

export const SUB_API_DOCS_VERSION = '1.0.0'
