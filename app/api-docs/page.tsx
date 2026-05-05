import { PrintButton } from './_print-button'

export const metadata = { title: 'Documentation API — YelhaERP' }

const BASE = 'https://erp.yelha.net/api/v1'

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-10 print:mb-8 break-inside-avoid-page">
      <h2 className="text-xl font-bold text-slate-900 border-b-2 border-yelha-400 pb-2 mb-4">{title}</h2>
      {children}
    </section>
  )
}

function Badge({ method }: { method: 'GET' | 'POST' | 'PUT' | 'DELETE' }) {
  const colors: Record<string, string> = {
    GET: 'bg-green-100 text-green-800',
    POST: 'bg-blue-100 text-blue-800',
    PUT: 'bg-amber-100 text-amber-800',
    DELETE: 'bg-red-100 text-red-800',
  }
  return <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${colors[method]}`}>{method}</span>
}

function Endpoint({
  method, path, description, params, body, response, example, deprecated,
}: {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  description: string
  params?: { name: string; type: string; required?: boolean; desc: string }[]
  body?: { name: string; type: string; required?: boolean; desc: string }[]
  response: string
  example: string
  deprecated?: string
}) {
  return (
    <div className={`mb-6 border rounded-xl overflow-hidden print:break-inside-avoid ${deprecated ? 'border-amber-200' : 'border-slate-200'}`}>
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b flex-wrap">
        <Badge method={method} />
        <code className="text-sm font-mono text-slate-800">{path}</code>
        <span className="text-sm text-slate-500 ml-auto">{description}</span>
        {deprecated && (
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
            ⚠ Déprécié — {deprecated}
          </span>
        )}
      </div>
      {(params || body) && (
        <div className="px-4 py-3 border-b">
          {params && params.length > 0 && (
            <>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Paramètres de requête</p>
              <table className="w-full text-sm mb-3">
                <thead><tr className="text-left text-xs text-slate-500"><th className="pb-1 pr-4">Nom</th><th className="pb-1 pr-4">Type</th><th className="pb-1 pr-4">Requis</th><th className="pb-1">Description</th></tr></thead>
                <tbody>
                  {params.map(p => (
                    <tr key={p.name} className="border-t border-slate-100">
                      <td className="py-1.5 pr-4 font-mono text-xs text-blue-700">{p.name}</td>
                      <td className="py-1.5 pr-4 font-mono text-xs text-slate-500">{p.type}</td>
                      <td className="py-1.5 pr-4 text-xs">{p.required ? <span className="text-red-600">Oui</span> : 'Non'}</td>
                      <td className="py-1.5 text-xs text-slate-600">{p.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          {body && body.length > 0 && (
            <>
              <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Corps JSON (body)</p>
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs text-slate-500"><th className="pb-1 pr-4">Champ</th><th className="pb-1 pr-4">Type</th><th className="pb-1 pr-4">Requis</th><th className="pb-1">Description</th></tr></thead>
                <tbody>
                  {body.map(p => (
                    <tr key={p.name} className="border-t border-slate-100">
                      <td className="py-1.5 pr-4 font-mono text-xs text-purple-700">{p.name}</td>
                      <td className="py-1.5 pr-4 font-mono text-xs text-slate-500">{p.type}</td>
                      <td className="py-1.5 pr-4 text-xs">{p.required ? <span className="text-red-600">Oui</span> : 'Non'}</td>
                      <td className="py-1.5 text-xs text-slate-600">{p.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 divide-x divide-slate-200">
        <div className="px-4 py-3">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Exemple cURL</p>
          <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap bg-slate-50 rounded p-2">{example}</pre>
        </div>
        <div className="px-4 py-3">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Réponse</p>
          <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap bg-slate-50 rounded p-2">{response}</pre>
        </div>
      </div>
    </div>
  )
}

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { font-size: 11px; }
          pre { font-size: 9px; }
          @page { margin: 1.5cm; }
        }
      `}</style>

      {/* Sticky nav */}
      <div className="no-print sticky top-0 z-10 bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-yelha-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">Y</span>
          </div>
          <span className="font-bold text-slate-800">YelhaERP — Documentation API v1.1</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">v1.1 stable</span>
          <PrintButton />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-10">

        {/* Cover */}
        <div className="mb-12 pb-8 border-b-2 border-yelha-400">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-yelha-500 rounded-xl flex items-center justify-center">
              <span className="text-white text-xl font-bold">Y</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Documentation API</h1>
              <p className="text-slate-500">YelhaERP REST API — Version 1.1</p>
            </div>
          </div>
          <p className="text-slate-600 leading-relaxed">
            L'API YelhaERP vous permet d'accéder programmatiquement à vos données ERP depuis vos applications.
            Elle expose des endpoints de lecture et d'écriture pour les factures, clients, produits et devis,
            et notifie vos systèmes en temps réel via des webhooks signés.
          </p>
          <div className="mt-4 bg-yelha-50 border border-yelha-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-yelha-800 mb-1">URL de base</p>
            <code className="text-yelha-700 font-mono">{BASE}</code>
          </div>
        </div>

        {/* Table of contents */}
        <div className="no-print mb-10 bg-slate-50 rounded-xl p-5">
          <p className="font-semibold text-slate-700 mb-3 text-sm">Table des matières</p>
          <div className="grid grid-cols-2 gap-1 text-sm">
            {[
              ['#quickstart', '1. Quick Start (3 étapes)'],
              ['#auth', '2. Authentification'],
              ['#environments', '3. Environnements'],
              ['#ratelimit', '4. Rate Limiting'],
              ['#format', '5. Format des réponses'],
              ['#schemas', '6. Schémas de données'],
              ['#invoices', '7. Factures'],
              ['#clients', '8. Clients'],
              ['#products', '9. Produits'],
              ['#quotes', '10. Devis'],
              ['#webhooks', '11. Webhooks'],
              ['#changelog', '12. Changelog'],
            ].map(([href, label]) => (
              <a key={href} href={href} className="text-yelha-600 hover:underline">{label}</a>
            ))}
          </div>
        </div>

        {/* Quick Start */}
        <Section id="quickstart" title="1. Quick Start — 3 étapes">
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              {
                step: '1', title: 'Obtenir une clé API',
                desc: 'Allez dans Paramètres → Intégrations → API YelhaERP. Créez une clé avec les scopes nécessaires (read et/ou write).',
              },
              {
                step: '2', title: 'Premier appel',
                desc: 'Ajoutez votre clé dans le header Authorization. Toutes les requêtes retournent du JSON.',
              },
              {
                step: '3', title: 'Lire la réponse',
                desc: 'Les données sont dans data[], la pagination dans meta. Les erreurs ont toujours un code machine.',
              },
            ].map(({ step, title, desc }) => (
              <div key={step} className="border rounded-xl p-4">
                <div className="w-8 h-8 bg-yelha-500 rounded-full flex items-center justify-center text-white font-bold text-sm mb-3">{step}</div>
                <p className="font-semibold text-sm mb-1">{title}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
            ))}
          </div>
          <div className="bg-slate-900 rounded-xl p-4">
            <p className="text-xs text-slate-400 mb-2"># Exemple complet — lister les factures payées</p>
            <pre className="text-green-400 text-sm font-mono">{`curl -X GET "${BASE}/invoices?status=PAID&limit=5" \\
  -H "Authorization: Bearer yelha_live_votreclé..."

# Réponse
{
  "data": [{ "id": "clx...", "number": "FAC-2025-001", "total": "11900.00" }],
  "meta": { "page": 1, "limit": 5, "total": 87, "pages": 18, "hasNext": true, "hasPrev": false }
}`}</pre>
          </div>
        </Section>

        {/* Authentication */}
        <Section id="auth" title="2. Authentification">
          <p className="text-slate-600 mb-4 text-sm">
            Toutes les requêtes doivent inclure votre clé API dans l'en-tête <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">Authorization</code>.
            Créez vos clés depuis <strong>Paramètres → Intégrations → API YelhaERP</strong>.
          </p>
          <div className="bg-slate-900 rounded-xl p-4 mb-4">
            <pre className="text-green-400 text-sm font-mono">Authorization: Bearer yelha_live_votreclésecrete...</pre>
          </div>
          <p className="text-sm text-slate-600 mb-3">
            Les clés ont un ou plusieurs <strong>scopes</strong> qui contrôlent les accès :
          </p>
          <table className="w-full text-sm border rounded-xl overflow-hidden mb-4">
            <thead className="bg-slate-50"><tr>
              <th className="text-left px-4 py-2 font-medium text-slate-600">Scope</th>
              <th className="text-left px-4 py-2 font-medium text-slate-600">Endpoints autorisés</th>
            </tr></thead>
            <tbody>
              <tr><td className="px-4 py-2 font-mono text-sm">read</td><td className="px-4 py-2 text-sm text-slate-500">Tous les GET</td></tr>
              <tr className="border-t"><td className="px-4 py-2 font-mono text-sm">write</td><td className="px-4 py-2 text-sm text-slate-500">POST, PUT, DELETE + tous les GET</td></tr>
            </tbody>
          </table>
        </Section>

        {/* Environments */}
        <Section id="environments" title="3. Environnements">
          <p className="text-slate-600 mb-4 text-sm">
            Deux environnements sont disponibles. Toutes les réponses incluent un header <code className="bg-slate-100 px-1 rounded text-xs font-mono">X-Yelha-Environment</code>.
          </p>
          <table className="w-full text-sm border rounded-xl overflow-hidden">
            <thead className="bg-slate-50"><tr>
              <th className="text-left px-4 py-3 font-semibold">Environnement</th>
              <th className="text-left px-4 py-3 font-semibold">Préfixe de clé</th>
              <th className="text-left px-4 py-3 font-semibold">Header</th>
              <th className="text-left px-4 py-3 font-semibold">Usage</th>
            </tr></thead>
            <tbody>
              <tr>
                <td className="px-4 py-3 font-medium">Production</td>
                <td className="px-4 py-3 font-mono text-sm text-green-700">yelha_live_...</td>
                <td className="px-4 py-3 font-mono text-xs">X-Yelha-Environment: live</td>
                <td className="px-4 py-3 text-sm text-slate-500">Données réelles</td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-3 font-medium">Sandbox</td>
                <td className="px-4 py-3 font-mono text-sm text-blue-700">yelha_test_...</td>
                <td className="px-4 py-3 font-mono text-xs">X-Yelha-Environment: test</td>
                <td className="px-4 py-3 text-sm text-slate-500">Tests et développement</td>
              </tr>
            </tbody>
          </table>
        </Section>

        {/* Rate limiting */}
        <Section id="ratelimit" title="4. Limites de débit (Rate Limiting)">
          <p className="text-slate-600 mb-4 text-sm">
            Limites appliquées par clé API sur une fenêtre glissante d'une heure.
          </p>
          <table className="w-full text-sm border rounded-xl overflow-hidden mb-4">
            <thead className="bg-slate-50"><tr>
              <th className="text-left px-4 py-3">Plan</th>
              <th className="text-left px-4 py-3">Requêtes / heure</th>
              <th className="text-left px-4 py-3">Usage recommandé</th>
            </tr></thead>
            <tbody>
              {[
                { plan: 'TRIAL', limit: '100', usage: 'Tests et développement' },
                { plan: 'STARTER', limit: '1 000', usage: 'Petites intégrations' },
                { plan: 'PRO', limit: '10 000', usage: 'Applications métier actives' },
                { plan: 'AGENCY', limit: '100 000', usage: 'Intégrations haute fréquence' },
              ].map((r, i) => (
                <tr key={r.plan} className={i > 0 ? 'border-t' : ''}>
                  <td className="px-4 py-3 font-mono font-medium">{r.plan}</td>
                  <td className="px-4 py-3 font-semibold text-yelha-700">{r.limit}</td>
                  <td className="px-4 py-3 text-slate-500">{r.usage}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="bg-slate-50 rounded-lg p-4 text-sm">
            <p className="font-semibold mb-2">En-têtes de réponse</p>
            <table className="w-full text-xs font-mono">
              {[
                ['X-RateLimit-Limit', 'Limite totale du plan'],
                ['X-RateLimit-Remaining', 'Requêtes restantes'],
                ['X-RateLimit-Reset', 'Timestamp UNIX de réinitialisation'],
                ['X-RateLimit-Plan', 'Plan actuel'],
                ['X-API-Version', 'Version de l\'API (v1)'],
                ['X-Yelha-Environment', 'Environnement (live | test)'],
              ].map(([h, d]) => (
                <tr key={h}><td className="py-0.5 pr-4 text-blue-700">{h}</td><td className="text-slate-500">{d}</td></tr>
              ))}
            </table>
          </div>
        </Section>

        {/* Format */}
        <Section id="format" title="5. Format des réponses">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Succès — liste</p>
              <pre className="bg-slate-50 border rounded-lg p-3 text-xs font-mono">{`{
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "pages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}`}</pre>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Erreur</p>
              <pre className="bg-slate-50 border rounded-lg p-3 text-xs font-mono">{`{
  "error": "Description de l'erreur",
  "code": "INVALID_PARAMS",
  "status": 400
}`}</pre>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Codes d'erreur</p>
            <table className="w-full text-sm border rounded-xl overflow-hidden">
              <thead className="bg-slate-50"><tr>
                <th className="text-left px-4 py-2 font-medium text-slate-600">HTTP</th>
                <th className="text-left px-4 py-2 font-medium text-slate-600">Code</th>
                <th className="text-left px-4 py-2 font-medium text-slate-600">Description</th>
              </tr></thead>
              <tbody>
                {[
                  ['200', 'SUCCESS', 'Requête traitée'],
                  ['400', 'INVALID_PARAMS', 'Paramètres invalides'],
                  ['400', 'INVALID_BODY', 'Corps JSON malformé'],
                  ['401', 'UNAUTHORIZED', 'Clé API invalide ou absente'],
                  ['403', 'INSUFFICIENT_SCOPE', 'Scope "write" requis'],
                  ['404', 'NOT_FOUND', 'Ressource introuvable'],
                  ['409', 'CONFLICT', 'Opération impossible (ex: facture déjà payée)'],
                  ['422', 'VALIDATION_ERROR', 'Données invalides (Zod)'],
                  ['429', 'RATE_LIMIT_EXCEEDED', 'Quota dépassé'],
                  ['429', 'LIMIT_EXCEEDED', 'Limite fonctionnelle atteinte (ex: 10 webhooks max)'],
                  ['500', 'SERVER_ERROR', 'Erreur interne'],
                ].map(([code, name, desc], i) => (
                  <tr key={i} className={i > 0 ? 'border-t' : ''}>
                    <td className="px-4 py-2 font-mono text-sm">{code}</td>
                    <td className="px-4 py-2 font-mono text-xs text-blue-700">{name}</td>
                    <td className="px-4 py-2 text-slate-500 text-sm">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Schemas */}
        <Section id="schemas" title="6. Schémas de données complets">
          <p className="text-slate-600 text-sm mb-4">
            Tous les inputs sont validés côté serveur avec <strong>Zod</strong>. Voici les schémas complets.
          </p>
          {[
            {
              name: 'Invoice', fields: [
                ['id', 'cuid', 'Identifiant unique'],
                ['number', 'string', 'Numéro généré automatiquement (ex: FAC-2025-001)'],
                ['type', 'STANDARD|SIMPLIFIED|PROFORMA|CREDIT_NOTE', 'Type de facture'],
                ['status', 'DRAFT|SENT|PAID|PARTIAL|OVERDUE|CANCELLED', 'Statut'],
                ['clientId', 'cuid (requis)', 'ID du client'],
                ['issueDate', 'ISO 8601 (requis)', 'Date d\'émission'],
                ['dueDate', 'ISO 8601 (optionnel)', 'Date d\'échéance'],
                ['currency', 'string[3] défaut DZD', 'Devise'],
                ['notes', 'string max 2000', 'Notes libres'],
                ['subtotal', 'Decimal(15,2)', 'Montant HT (calculé)'],
                ['taxAmount', 'Decimal(15,2)', 'TVA (calculée)'],
                ['total', 'Decimal(15,2)', 'TTC (calculé)'],
                ['lines[]', 'InvoiceLine[]', 'Lignes (1–100)'],
                ['payments[]', 'InvoicePayment[]', 'Paiements enregistrés'],
              ],
            },
            {
              name: 'InvoiceLine', fields: [
                ['description', 'string 1–500 (requis)', 'Description de la ligne'],
                ['quantity', 'number > 0 max 999999 (requis)', 'Quantité'],
                ['unitPrice', 'number ≥ 0 (requis)', 'Prix unitaire HT'],
                ['taxRate', 'number 0–100 défaut 19', 'Taux TVA %'],
                ['productId', 'cuid (optionnel)', 'Lier à un produit du catalogue'],
                ['total', 'Decimal(15,2)', 'Total ligne TTC (calculé)'],
              ],
            },
            {
              name: 'Client', fields: [
                ['clientType', 'COMPANY|INDIVIDUAL défaut COMPANY', 'Type de client'],
                ['name', 'string 2–200 (requis)', 'Raison sociale ou nom'],
                ['firstName', 'string max 100', 'Prénom (individus)'],
                ['email', 'email format', 'Email'],
                ['phone', 'string max 20', 'Téléphone'],
                ['address', 'string max 500', 'Adresse'],
                ['wilaya', 'string max 100', 'Wilaya algérienne'],
                ['nif', 'string max 20', 'Numéro d\'Identification Fiscale'],
                ['nis', 'string max 20', 'Numéro d\'Identification Statistique'],
                ['rc', 'string max 30', 'Registre de Commerce'],
                ['description', 'string max 1000', 'Notes libres'],
              ],
            },
            {
              name: 'Product', fields: [
                ['name', 'string 1–200 (requis)', 'Nom du produit'],
                ['sku', 'string max 50 unique', 'Référence interne'],
                ['description', 'string max 1000', 'Description'],
                ['unitPrice', 'number ≥ 0 (requis)', 'Prix unitaire HT'],
                ['taxRate', 'number 0–100 défaut 19', 'Taux TVA %'],
                ['stockQty', 'Decimal(10,3)', 'Stock actuel (géré par mouvements)'],
                ['stockAlert', 'number ≥ 0 défaut 0', 'Seuil d\'alerte stock bas'],
                ['unit', 'string max 20', 'Unité (pièce, kg, m²…)'],
                ['isActive', 'boolean défaut true', 'Produit actif'],
                ['isLowStock', 'boolean (calculé)', 'Vrai si stockQty ≤ stockAlert > 0'],
              ],
            },
            {
              name: 'Quote', fields: [
                ['clientId', 'cuid (requis)', 'ID du client'],
                ['issueDate', 'ISO 8601 (requis)', 'Date d\'émission'],
                ['expiryDate', 'ISO 8601', 'Date d\'expiration'],
                ['status', 'DRAFT|SENT|ACCEPTED|REJECTED|EXPIRED|CONVERTED', 'Statut'],
                ['currency', 'string[3] défaut DZD', 'Devise'],
                ['notes', 'string max 2000', 'Notes'],
                ['lines[]', 'QuoteLine[]', 'Lignes (1–100)'],
              ],
            },
          ].map(({ name, fields }) => (
            <div key={name} className="mb-6">
              <p className="font-mono font-bold text-slate-800 mb-2">{name}</p>
              <table className="w-full text-sm border rounded-xl overflow-hidden">
                <thead className="bg-slate-50"><tr>
                  <th className="text-left px-4 py-2 font-medium text-slate-600">Champ</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-600">Type / Contraintes</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-600">Description</th>
                </tr></thead>
                <tbody>
                  {fields.map(([field, type, desc], i) => (
                    <tr key={field} className={i > 0 ? 'border-t' : ''}>
                      <td className="px-4 py-2 font-mono text-xs text-purple-700">{field}</td>
                      <td className="px-4 py-2 font-mono text-xs text-slate-500">{type}</td>
                      <td className="px-4 py-2 text-xs text-slate-600">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </Section>

        {/* Invoices */}
        <Section id="invoices" title="7. Factures">
          <Endpoint
            method="GET" path={`${BASE}/invoices`}
            description="Liste toutes les factures"
            params={[
              { name: 'page', type: 'integer', desc: 'Numéro de page (défaut: 1)' },
              { name: 'limit', type: 'integer', desc: 'Résultats par page, max 100 (défaut: 20)' },
              { name: 'status', type: 'string', desc: 'DRAFT | SENT | PAID | PARTIAL | OVERDUE | CANCELLED' },
              { name: 'clientId', type: 'string', desc: 'Filtrer par ID client' },
              { name: 'from', type: 'ISO 8601', desc: 'Date de début (ex: 2025-01-01T00:00:00Z)' },
              { name: 'to', type: 'ISO 8601', desc: 'Date de fin' },
              { name: 'sortBy', type: 'string', desc: 'createdAt | issueDate | dueDate | total | number' },
              { name: 'sortOrder', type: 'string', desc: 'asc | desc (défaut: desc)' },
            ]}
            example={`curl -X GET "${BASE}/invoices?status=PAID&sortBy=total&sortOrder=desc" \\
  -H "Authorization: Bearer yelha_live_..."`}
            response={`{
  "data": [{ "id": "clx...", "number": "FAC-2025-001",
    "status": "PAID", "total": "15000.00", "currency": "DZD",
    "client": { "id": "...", "name": "Client SARL" } }],
  "meta": { "page": 1, "limit": 20, "total": 87,
    "pages": 5, "hasNext": true, "hasPrev": false }
}`}
          />
          <Endpoint
            method="GET" path={`${BASE}/invoices/:id`}
            description="Détail complet avec lignes et paiements"
            params={[{ name: 'id', type: 'string', required: true, desc: 'Identifiant de la facture' }]}
            example={`curl "${BASE}/invoices/clx123" \\
  -H "Authorization: Bearer yelha_live_..."`}
            response={`{
  "data": { "id": "clx123", "number": "FAC-2025-001",
    "lines": [{ "description": "Prestation", "quantity": "2.000",
      "unitPrice": "5000.00", "taxRate": "19.00", "total": "11900.00" }],
    "payments": [{ "amount": "11900.00", "method": "CASH",
      "paidAt": "2025-01-15T10:00:00.000Z" }] }
}`}
          />
          <Endpoint
            method="POST" path={`${BASE}/invoices`}
            description="Créer une nouvelle facture"
            body={[
              { name: 'clientId', type: 'string', required: true, desc: 'ID du client' },
              { name: 'issueDate', type: 'ISO 8601', required: true, desc: 'Date d\'émission' },
              { name: 'type', type: 'string', desc: 'STANDARD (défaut) | SIMPLIFIED | PROFORMA | CREDIT_NOTE' },
              { name: 'dueDate', type: 'ISO 8601', desc: 'Date d\'échéance' },
              { name: 'currency', type: 'string', desc: 'DZD (défaut) | EUR | USD' },
              { name: 'notes', type: 'string', desc: 'Notes (max 2000)' },
              { name: 'lines', type: 'InvoiceLine[]', required: true, desc: 'Lignes de facture (1–100)' },
            ]}
            example={`curl -X POST "${BASE}/invoices" \\
  -H "Authorization: Bearer yelha_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "clientId": "clx...",
    "issueDate": "2025-05-01T00:00:00Z",
    "dueDate": "2025-06-01T00:00:00Z",
    "lines": [{
      "description": "Prestation de conseil",
      "quantity": 5,
      "unitPrice": 10000,
      "taxRate": 19
    }]
  }'`}
            response={`{
  "data": { "id": "clx-new", "number": "FAC-2025-042",
    "status": "DRAFT", "subtotal": "50000.00",
    "taxAmount": "9500.00", "total": "59500.00" }
}`}
          />
          <Endpoint
            method="PUT" path={`${BASE}/invoices/:id`}
            description="Modifier le statut ou les lignes d'une facture"
            body={[
              { name: 'status', type: 'string', desc: 'Nouveau statut' },
              { name: 'dueDate', type: 'ISO 8601 | null', desc: 'Date d\'échéance' },
              { name: 'notes', type: 'string | null', desc: 'Notes' },
              { name: 'currency', type: 'string', desc: 'Devise' },
              { name: 'lines', type: 'InvoiceLine[]', desc: 'Remplace toutes les lignes existantes' },
            ]}
            example={`curl -X PUT "${BASE}/invoices/clx123" \\
  -H "Authorization: Bearer yelha_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{ "status": "PAID" }'`}
            response={`{ "data": { "id": "clx123", "status": "PAID", ... } }`}
          />
          <Endpoint
            method="DELETE" path={`${BASE}/invoices/:id`}
            description="Annuler une facture (soft-delete — status → CANCELLED)"
            example={`curl -X DELETE "${BASE}/invoices/clx123" \\
  -H "Authorization: Bearer yelha_live_..."`}
            response={`{ "data": { "id": "clx123", "deleted": true } }`}
          />
        </Section>

        {/* Clients */}
        <Section id="clients" title="8. Clients">
          <Endpoint
            method="GET" path={`${BASE}/clients`}
            description="Liste tous les clients"
            params={[
              { name: 'page', type: 'integer', desc: 'Numéro de page' },
              { name: 'limit', type: 'integer', desc: 'Résultats par page, max 100' },
              { name: 'search', type: 'string', desc: 'Recherche nom, email, NIF' },
              { name: 'type', type: 'string', desc: 'COMPANY | INDIVIDUAL' },
              { name: 'sortBy', type: 'string', desc: 'name | createdAt | updatedAt' },
              { name: 'sortOrder', type: 'string', desc: 'asc | desc (défaut: asc)' },
            ]}
            example={`curl "${BASE}/clients?search=SARL&type=COMPANY" \\
  -H "Authorization: Bearer yelha_live_..."`}
            response={`{
  "data": [{ "id": "clx...", "name": "Client SARL",
    "email": "contact@client.dz", "wilaya": "Alger",
    "_count": { "invoices": 12 } }],
  "meta": { "page": 1, "total": 34, "hasNext": false, "hasPrev": false }
}`}
          />
          <Endpoint
            method="POST" path={`${BASE}/clients`}
            description="Créer un client"
            body={[
              { name: 'name', type: 'string 2–200', required: true, desc: 'Raison sociale ou nom de famille' },
              { name: 'clientType', type: 'string', desc: 'COMPANY (défaut) | INDIVIDUAL' },
              { name: 'email', type: 'email', desc: 'Email' },
              { name: 'phone', type: 'string', desc: 'Téléphone' },
              { name: 'wilaya', type: 'string', desc: 'Wilaya' },
              { name: 'address', type: 'string', desc: 'Adresse' },
              { name: 'nif', type: 'string', desc: 'NIF' },
            ]}
            example={`curl -X POST "${BASE}/clients" \\
  -H "Authorization: Bearer yelha_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{ "name": "Nouveau Client SARL", "email": "contact@nc.dz", "wilaya": "Oran" }'`}
            response={`{ "data": { "id": "clx-new", "name": "Nouveau Client SARL", "clientType": "COMPANY" } }`}
          />
          <Endpoint
            method="PUT" path={`${BASE}/clients/:id`}
            description="Modifier un client (champs partiels)"
            body={[{ name: '...', type: 'Tous les champs de POST', desc: 'Tous optionnels' }]}
            example={`curl -X PUT "${BASE}/clients/clx123" \\
  -H "Authorization: Bearer yelha_live_..." \\
  -d '{ "phone": "0550123456", "wilaya": "Constantine" }'`}
            response={`{ "data": { "id": "clx123", "phone": "0550123456", "wilaya": "Constantine" } }`}
          />
          <Endpoint
            method="DELETE" path={`${BASE}/clients/:id`}
            description="Supprimer un client (impossible s'il a des factures)"
            example={`curl -X DELETE "${BASE}/clients/clx123" \\
  -H "Authorization: Bearer yelha_live_..."`}
            response={`{ "data": { "id": "clx123", "deleted": true } }
# ou si le client a des factures :
{ "error": "Impossible de supprimer un client qui a des factures",
  "code": "CONFLICT", "status": 409 }`}
          />
        </Section>

        {/* Products */}
        <Section id="products" title="9. Produits">
          <Endpoint
            method="GET" path={`${BASE}/products`}
            description="Liste tous les produits"
            params={[
              { name: 'page', type: 'integer', desc: 'Numéro de page' },
              { name: 'limit', type: 'integer', desc: 'Max 100' },
              { name: 'search', type: 'string', desc: 'Recherche nom ou SKU' },
              { name: 'active', type: 'boolean', desc: 'true = actifs uniquement' },
              { name: 'sortBy', type: 'string', desc: 'name | createdAt | unitPrice | stockQty' },
              { name: 'sortOrder', type: 'string', desc: 'asc | desc' },
            ]}
            example={`curl "${BASE}/products?active=true&sortBy=stockQty&sortOrder=asc" \\
  -H "Authorization: Bearer yelha_live_..."`}
            response={`{
  "data": [{ "id": "clx...", "name": "Widget Pro", "sku": "WP-001",
    "unitPrice": "2500.00", "stockQty": "5.000",
    "stockAlert": "10", "isLowStock": true }],
  "meta": { "page": 1, "total": 56, "hasNext": true }
}`}
          />
          <Endpoint
            method="POST" path={`${BASE}/products`}
            description="Créer un produit"
            body={[
              { name: 'name', type: 'string 1–200', required: true, desc: 'Nom du produit' },
              { name: 'unitPrice', type: 'number ≥ 0', required: true, desc: 'Prix HT' },
              { name: 'sku', type: 'string', desc: 'Référence unique' },
              { name: 'taxRate', type: 'number', desc: '19 (défaut)' },
              { name: 'unit', type: 'string', desc: 'Unité (pièce, kg…)' },
              { name: 'stockAlert', type: 'number', desc: 'Seuil alerte stock' },
            ]}
            example={`curl -X POST "${BASE}/products" \\
  -H "Authorization: Bearer yelha_live_..." \\
  -d '{ "name": "Clavier Mécanique", "sku": "KB-001", "unitPrice": 8500, "taxRate": 19 }'`}
            response={`{ "data": { "id": "clx-new", "name": "Clavier Mécanique", "sku": "KB-001", "unitPrice": "8500.00" } }`}
          />
          <Endpoint method="PUT" path={`${BASE}/products/:id`}
            description="Modifier un produit (champs partiels + isActive)"
            body={[
              { name: '...', type: 'Tous les champs de POST', desc: 'Tous optionnels' },
              { name: 'isActive', type: 'boolean', desc: 'Activer / désactiver' },
            ]}
            example={`curl -X PUT "${BASE}/products/clx123" \\
  -H "Authorization: Bearer yelha_live_..." \\
  -d '{ "unitPrice": 9000, "stockAlert": 5 }'`}
            response={`{ "data": { "id": "clx123", "unitPrice": "9000.00", "stockAlert": "5" } }`}
          />
          <Endpoint method="DELETE" path={`${BASE}/products/:id`}
            description="Désactiver un produit (soft-delete — isActive → false, historique préservé)"
            example={`curl -X DELETE "${BASE}/products/clx123" \\
  -H "Authorization: Bearer yelha_live_..."`}
            response={`{ "data": { "id": "clx123", "deleted": true, "note": "Produit désactivé (historique préservé)" } }`}
          />
        </Section>

        {/* Quotes */}
        <Section id="quotes" title="10. Devis">
          <Endpoint method="GET" path={`${BASE}/quotes`}
            description="Liste tous les devis"
            params={[
              { name: 'page', type: 'integer', desc: 'Numéro de page' },
              { name: 'limit', type: 'integer', desc: 'Max 100' },
              { name: 'status', type: 'string', desc: 'DRAFT | SENT | ACCEPTED | REJECTED | EXPIRED | CONVERTED' },
              { name: 'clientId', type: 'string', desc: 'Filtrer par client' },
              { name: 'sortBy', type: 'string', desc: 'createdAt | issueDate | expiryDate | total | number' },
              { name: 'sortOrder', type: 'string', desc: 'asc | desc' },
            ]}
            example={`curl "${BASE}/quotes?status=ACCEPTED" \\
  -H "Authorization: Bearer yelha_live_..."`}
            response={`{
  "data": [{ "id": "clx...", "number": "DV-2025-012",
    "status": "ACCEPTED", "total": "89000.00" }],
  "meta": { "page": 1, "total": 21, "hasNext": false }
}`}
          />
          <Endpoint method="GET" path={`${BASE}/quotes/:id`}
            description="Détail d'un devis avec lignes"
            params={[{ name: 'id', type: 'string', required: true, desc: 'ID du devis' }]}
            example={`curl "${BASE}/quotes/clx123" \\
  -H "Authorization: Bearer yelha_live_..."`}
            response={`{
  "data": { "id": "clx123", "number": "DV-2025-012",
    "lines": [{ "description": "Étude", "quantity": "1.000", "unitPrice": "75000.00" }],
    "client": { "name": "Entreprise XYZ" } }
}`}
          />
          <Endpoint method="POST" path={`${BASE}/quotes`}
            description="Créer un devis"
            body={[
              { name: 'clientId', type: 'string', required: true, desc: 'ID du client' },
              { name: 'issueDate', type: 'ISO 8601', required: true, desc: 'Date d\'émission' },
              { name: 'lines', type: 'QuoteLine[]', required: true, desc: 'Lignes (1–100)' },
              { name: 'expiryDate', type: 'ISO 8601', desc: 'Date d\'expiration' },
              { name: 'currency', type: 'string', desc: 'DZD (défaut)' },
              { name: 'notes', type: 'string', desc: 'Notes' },
            ]}
            example={`curl -X POST "${BASE}/quotes" \\
  -H "Authorization: Bearer yelha_live_..." \\
  -d '{ "clientId": "clx...", "issueDate": "2025-05-01T00:00:00Z",
    "expiryDate": "2025-06-01T00:00:00Z",
    "lines": [{ "description": "Audit", "quantity": 1, "unitPrice": 50000 }] }'`}
            response={`{ "data": { "id": "clx-new", "number": "DV-2025-043", "status": "DRAFT", "total": "59500.00" } }`}
          />
          <Endpoint method="PUT" path={`${BASE}/quotes/:id`}
            description="Modifier un devis (statut, lignes, expiration)"
            body={[
              { name: 'status', type: 'string', desc: 'DRAFT | SENT | ACCEPTED | REJECTED | EXPIRED' },
              { name: 'expiryDate', type: 'ISO 8601 | null', desc: 'Nouvelle expiration' },
              { name: 'notes', type: 'string', desc: 'Notes' },
              { name: 'lines', type: 'QuoteLine[]', desc: 'Remplace toutes les lignes' },
            ]}
            example={`curl -X PUT "${BASE}/quotes/clx123" \\
  -H "Authorization: Bearer yelha_live_..." \\
  -d '{ "status": "ACCEPTED" }'`}
            response={`{ "data": { "id": "clx123", "status": "ACCEPTED" } }
# Déclenche aussi le webhook: quote.accepted`}
          />
          <Endpoint method="DELETE" path={`${BASE}/quotes/:id`}
            description="Supprimer un devis (impossible si déjà CONVERTED)"
            example={`curl -X DELETE "${BASE}/quotes/clx123" \\
  -H "Authorization: Bearer yelha_live_..."`}
            response={`{ "data": { "id": "clx123", "deleted": true } }`}
          />
          <Endpoint method="POST" path={`${BASE}/quotes/:id/convert`}
            description="Convertir un devis en facture (atomique via transaction DB)"
            body={[
              { name: 'type', type: 'string', desc: 'STANDARD (défaut) | PROFORMA' },
              { name: 'issueDate', type: 'ISO 8601', desc: 'Date facture (défaut: aujourd\'hui)' },
              { name: 'dueDate', type: 'ISO 8601 | null', desc: 'Échéance facture' },
            ]}
            example={`curl -X POST "${BASE}/quotes/clx123/convert" \\
  -H "Authorization: Bearer yelha_live_..." \\
  -d '{ "type": "STANDARD", "dueDate": "2025-07-01T00:00:00Z" }'`}
            response={`{
  "data": {
    "quote": { "id": "clx123", "status": "CONVERTED" },
    "invoice": { "id": "clx-new", "number": "FAC-2025-044", "status": "DRAFT" }
  }
}
# Déclenche le webhook: quote.converted`}
          />
        </Section>

        {/* Webhooks */}
        <Section id="webhooks" title="11. Webhooks">
          <p className="text-slate-600 text-sm mb-4">
            Les webhooks envoient des notifications HTTP POST signées vers vos URLs lors d'événements.
            Chaque appel inclut un header <code className="bg-slate-100 px-1 rounded text-xs font-mono">X-Yelha-Signature</code>
            que vous devez vérifier pour garantir l'authenticité.
          </p>

          {/* Events table */}
          <div className="mb-6">
            <p className="text-sm font-semibold text-slate-700 mb-2">Événements disponibles</p>
            <table className="w-full text-sm border rounded-xl overflow-hidden">
              <thead className="bg-slate-50"><tr>
                <th className="text-left px-4 py-2 font-medium">Événement</th>
                <th className="text-left px-4 py-2 font-medium">Déclenché lors de…</th>
              </tr></thead>
              <tbody>
                {[
                  ['invoice.created', 'Création d\'une facture via POST /invoices'],
                  ['invoice.updated', 'Mise à jour via PUT /invoices/:id (statut ≠ PAID)'],
                  ['invoice.paid', 'PUT /invoices/:id avec status: "PAID"'],
                  ['quote.accepted', 'PUT /quotes/:id avec status: "ACCEPTED"'],
                  ['quote.rejected', 'PUT /quotes/:id avec status: "REJECTED"'],
                  ['quote.converted', 'POST /quotes/:id/convert'],
                  ['client.created', 'POST /clients'],
                  ['client.updated', 'PUT /clients/:id'],
                ].map(([event, desc], i) => (
                  <tr key={event} className={i > 0 ? 'border-t' : ''}>
                    <td className="px-4 py-2 font-mono text-xs text-purple-700">{event}</td>
                    <td className="px-4 py-2 text-xs text-slate-500">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Payload example */}
          <div className="mb-6">
            <p className="text-sm font-semibold text-slate-700 mb-2">Exemple de payload reçu</p>
            <pre className="bg-slate-50 border rounded-lg p-4 text-xs font-mono">{`POST https://your-server.com/hooks
Content-Type: application/json
X-Yelha-Signature: sha256=a3f8b1c2d4e5...
X-Yelha-Event: invoice.created
X-Yelha-Delivery: 550e8400-e29b-41d4-a716-446655440000

{
  "event": "invoice.created",
  "timestamp": "2025-05-05T10:30:00.000Z",
  "data": {
    "id": "clx123",
    "number": "FAC-2025-042",
    "status": "DRAFT",
    "total": "59500.00",
    "client": { "id": "cli-1", "name": "Client SARL" }
  }
}`}</pre>
          </div>

          {/* Signature verification */}
          <div className="mb-6">
            <p className="text-sm font-semibold text-slate-700 mb-2">Vérification de la signature (Node.js)</p>
            <pre className="bg-slate-900 rounded-lg p-4 text-xs font-mono text-green-400">{`import crypto from 'crypto'

function verifyWebhook(rawBody: string, signature: string, secret: string): boolean {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')

  // Utiliser timingSafeEqual pour prévenir les timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  )
}

// Express
app.post('/hooks', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['x-yelha-signature'] as string
  if (!verifyWebhook(req.body.toString(), sig, process.env.WEBHOOK_SECRET!)) {
    return res.status(401).json({ error: 'Signature invalide' })
  }
  const payload = JSON.parse(req.body.toString())
  console.log('Événement:', payload.event, payload.data)
  res.json({ received: true })
})`}</pre>
          </div>

          <Endpoint method="GET" path={`${BASE}/webhooks`}
            description="Lister les webhooks actifs"
            example={`curl "${BASE}/webhooks" \\
  -H "Authorization: Bearer yelha_live_..."`}
            response={`{
  "data": [{ "id": "wh-1", "url": "https://app.com/hooks",
    "events": ["invoice.created", "invoice.paid"],
    "isActive": true, "lastTriggeredAt": "2025-05-04T09:00:00Z" }],
  "meta": { "total": 1 }
}`}
          />
          <Endpoint method="POST" path={`${BASE}/webhooks`}
            description="Enregistrer un nouveau webhook (secret retourné une seule fois)"
            body={[
              { name: 'url', type: 'string URL', required: true, desc: 'URL HTTPS de destination' },
              { name: 'events', type: 'string[]', required: true, desc: 'Événements à écouter (au moins 1)' },
              { name: 'description', type: 'string', desc: 'Description optionnelle' },
            ]}
            example={`curl -X POST "${BASE}/webhooks" \\
  -H "Authorization: Bearer yelha_live_..." \\
  -d '{
    "url": "https://mon-app.com/hooks/yelha",
    "events": ["invoice.created", "invoice.paid"],
    "description": "Notification facturation"
  }'`}
            response={`{
  "data": {
    "id": "wh-new", "url": "https://mon-app.com/hooks/yelha",
    "events": ["invoice.created", "invoice.paid"],
    "secret": "a3b4c5d6e7f8...",
    "secretNote": "Conservez ce secret — il ne sera plus affiché."
  }
}`}
          />
          <Endpoint method="DELETE" path={`${BASE}/webhooks/:id`}
            description="Désactiver un webhook"
            example={`curl -X DELETE "${BASE}/webhooks/wh-123" \\
  -H "Authorization: Bearer yelha_live_..."`}
            response={`{ "data": { "id": "wh-123", "deleted": true } }`}
          />
        </Section>

        {/* Changelog */}
        <Section id="changelog" title="12. Changelog">
          <div className="space-y-4">
            {[
              {
                version: '1.1.0', date: '2025-05-05', badge: 'Actuelle',
                changes: [
                  'Endpoints POST/PUT/DELETE pour factures, clients, produits, devis',
                  'GET /quotes/:id (manquant en v1.0)',
                  'POST /quotes/:id/convert — conversion devis → facture',
                  'Système de webhooks complet (GET/POST/DELETE /webhooks, HMAC-SHA256)',
                  'Pagination enrichie : meta.hasNext, meta.hasPrev',
                  'Tri sortBy + sortOrder sur tous les endpoints GET liste',
                  'Environnements live/test + header X-Yelha-Environment',
                  'Suite de tests Vitest (npm test)',
                ],
              },
              {
                version: '1.0.0', date: '2025-01-01', badge: 'Stable',
                changes: [
                  'GET /invoices, GET /invoices/:id',
                  'GET /clients, GET /clients/:id',
                  'GET /products, GET /products/:id',
                  'GET /quotes',
                  'GET /stock, GET /stock/:productId',
                  'GET /orders',
                  'Authentification Bearer token, rate limiting par plan',
                ],
              },
            ].map(({ version, date, badge, changes }) => (
              <div key={version} className="border rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-mono font-bold text-slate-800">v{version}</span>
                  <span className="text-xs text-slate-400">{date}</span>
                  <span className="text-xs bg-yelha-100 text-yelha-700 px-2 py-0.5 rounded-full font-medium">{badge}</span>
                </div>
                <ul className="text-sm text-slate-600 space-y-1">
                  {changes.map((c, i) => <li key={i} className="flex gap-2"><span className="text-yelha-500">+</span>{c}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        {/* Support */}
        <Section id="support" title="13. Support">
          <div className="bg-slate-50 rounded-xl p-6 text-sm text-slate-600 space-y-2">
            <p><strong>Email :</strong> support@yelhaerp.dz</p>
            <p><strong>WhatsApp :</strong> +33 7 61 17 93 79</p>
            <p><strong>Version API :</strong> v1.1 — Stable</p>
            <p><strong>CHANGELOG :</strong> Voir <code className="font-mono text-xs">CHANGELOG.md</code> dans le dépôt</p>
            <p className="text-xs text-slate-400 mt-4">© {new Date().getFullYear()} YelhaERP — Alger, Algérie. Tous droits réservés.</p>
          </div>
        </Section>
      </div>
    </div>
  )
}
