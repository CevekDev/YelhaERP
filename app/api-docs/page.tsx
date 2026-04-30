import { Printer } from 'lucide-react'

export const metadata = { title: 'Documentation API — YelhaERP' }

const BASE = 'https://yelhaerp.vercel.app/api/v1'

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-10 print:mb-8 break-inside-avoid-page">
      <h2 className="text-xl font-bold text-slate-900 border-b-2 border-yelha-400 pb-2 mb-4">{title}</h2>
      {children}
    </section>
  )
}

function Endpoint({
  method, path, description, params, response, example,
}: {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  description: string
  params?: { name: string; type: string; required?: boolean; desc: string }[]
  response: string
  example: string
}) {
  const colors: Record<string, string> = {
    GET: 'bg-green-100 text-green-800',
    POST: 'bg-blue-100 text-blue-800',
    PUT: 'bg-amber-100 text-amber-800',
    DELETE: 'bg-red-100 text-red-800',
  }
  return (
    <div className="mb-6 border border-slate-200 rounded-xl overflow-hidden print:break-inside-avoid">
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b">
        <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${colors[method]}`}>{method}</span>
        <code className="text-sm font-mono text-slate-800">{path}</code>
        <span className="text-sm text-slate-500 ml-auto">{description}</span>
      </div>
      {params && params.length > 0 && (
        <div className="px-4 py-3 border-b">
          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Paramètres</p>
          <table className="w-full text-sm">
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

      {/* Print button — hidden in print */}
      <div className="no-print sticky top-0 z-10 bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-yelha-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">Y</span>
          </div>
          <span className="font-bold text-slate-800">YelhaERP — Documentation API v1</span>
        </div>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-yelha-500 text-white rounded-lg text-sm font-medium hover:bg-yelha-600 transition-colors"
        >
          <Printer className="w-4 h-4" />
          Télécharger PDF
        </button>
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
              <p className="text-slate-500">YelhaERP REST API — Version 1.0</p>
            </div>
          </div>
          <p className="text-slate-600 leading-relaxed">
            L'API YelhaERP vous permet d'accéder programmatiquement à vos données ERP (factures, clients, produits, devis)
            depuis vos propres applications. Elle respecte les standards REST et retourne des réponses JSON.
          </p>
          <div className="mt-4 bg-yelha-50 border border-yelha-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-yelha-800 mb-1">URL de base</p>
            <code className="text-yelha-700 font-mono">{BASE}</code>
          </div>
        </div>

        {/* Authentication */}
        <Section id="auth" title="1. Authentification">
          <p className="text-slate-600 mb-4 text-sm">
            Toutes les requêtes doivent inclure votre clé API dans l'en-tête HTTP <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono">Authorization</code>.
            Créez vos clés depuis <strong>Paramètres → Intégrations → API YelhaERP</strong>.
          </p>
          <div className="bg-slate-900 rounded-xl p-4 mb-4">
            <pre className="text-green-400 text-sm font-mono">{`Authorization: Bearer yelha_live_votreclésecrete...`}</pre>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded-lg p-3 text-sm">
              <p className="font-semibold text-slate-800 mb-1">Clé valide</p>
              <code className="text-xs font-mono text-green-600">HTTP 200 OK</code>
              <p className="text-slate-500 text-xs mt-1">Requête traitée, données retournées</p>
            </div>
            <div className="border rounded-lg p-3 text-sm">
              <p className="font-semibold text-slate-800 mb-1">Clé invalide / manquante</p>
              <code className="text-xs font-mono text-red-600">HTTP 401 UNAUTHORIZED</code>
              <p className="text-slate-500 text-xs mt-1">Clé incorrecte, révoquée ou absente</p>
            </div>
          </div>
        </Section>

        {/* Rate limiting */}
        <Section id="ratelimit" title="2. Limites de débit (Rate Limiting)">
          <p className="text-slate-600 mb-4 text-sm">
            Les limites sont appliquées par clé API sur une fenêtre glissante d'une heure. Les en-têtes de réponse indiquent votre quota en temps réel.
          </p>
          <table className="w-full text-sm border rounded-xl overflow-hidden mb-4">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Plan</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Requêtes / heure</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700">Usage recommandé</th>
              </tr>
            </thead>
            <tbody>
              {[
                { plan: 'TRIAL', limit: '100', usage: 'Tests et développement' },
                { plan: 'STARTER', limit: '1 000', usage: 'Petites intégrations' },
                { plan: 'PRO', limit: '10 000', usage: 'Applications métier actives' },
                { plan: 'AGENCY', limit: '100 000', usage: 'Intégrations haute fréquence' },
              ].map((r, i) => (
                <tr key={r.plan} className={i > 0 ? 'border-t' : ''}>
                  <td className="px-4 py-3 font-mono text-sm font-medium">{r.plan}</td>
                  <td className="px-4 py-3 font-semibold text-yelha-700">{r.limit}</td>
                  <td className="px-4 py-3 text-slate-500 text-sm">{r.usage}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="bg-slate-50 rounded-lg p-4 text-sm">
            <p className="font-semibold mb-2">En-têtes de réponse</p>
            <table className="w-full text-xs font-mono">
              {[
                ['X-RateLimit-Limit', 'Limite totale de votre plan'],
                ['X-RateLimit-Remaining', 'Requêtes restantes dans la fenêtre'],
                ['X-RateLimit-Reset', 'Timestamp UNIX de réinitialisation'],
                ['X-RateLimit-Plan', 'Votre plan actuel'],
              ].map(([h, d]) => (
                <tr key={h}><td className="py-0.5 pr-4 text-blue-700">{h}</td><td className="py-0.5 text-slate-500">{d}</td></tr>
              ))}
            </table>
          </div>
        </Section>

        {/* Format */}
        <Section id="format" title="3. Format des réponses">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Succès</p>
              <pre className="bg-slate-50 border rounded-lg p-3 text-xs font-mono">{`{
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "pages": 8
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
          <div className="mt-4">
            <p className="text-sm font-semibold text-slate-700 mb-2">Codes d'erreur</p>
            <table className="w-full text-sm border rounded-xl overflow-hidden">
              <thead className="bg-slate-50"><tr>
                <th className="text-left px-4 py-2 font-medium text-slate-600">Code HTTP</th>
                <th className="text-left px-4 py-2 font-medium text-slate-600">Code</th>
                <th className="text-left px-4 py-2 font-medium text-slate-600">Description</th>
              </tr></thead>
              <tbody>
                {[
                  ['200', 'SUCCESS', 'Requête traitée avec succès'],
                  ['400', 'INVALID_PARAMS', 'Paramètres manquants ou invalides'],
                  ['401', 'UNAUTHORIZED', 'Clé API invalide ou absente'],
                  ['404', 'NOT_FOUND', 'Ressource introuvable'],
                  ['429', 'RATE_LIMIT_EXCEEDED', 'Quota dépassé — attendez la réinitialisation'],
                  ['500', 'SERVER_ERROR', 'Erreur interne — contactez le support'],
                ].map(([code, name, desc], i) => (
                  <tr key={code} className={i > 0 ? 'border-t' : ''}>
                    <td className="px-4 py-2 font-mono text-sm">{code}</td>
                    <td className="px-4 py-2 font-mono text-xs text-blue-700">{name}</td>
                    <td className="px-4 py-2 text-slate-500 text-sm">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Invoices */}
        <Section id="invoices" title="4. Factures">
          <Endpoint
            method="GET" path={`${BASE}/invoices`}
            description="Liste toutes les factures"
            params={[
              { name: 'page', type: 'integer', desc: 'Numéro de page (défaut: 1)' },
              { name: 'limit', type: 'integer', desc: 'Résultats par page, max 100 (défaut: 20)' },
              { name: 'status', type: 'string', desc: 'Filtrer: DRAFT, SENT, PAID, PARTIAL, OVERDUE, CANCELLED' },
              { name: 'clientId', type: 'string', desc: 'Filtrer par ID client' },
              { name: 'from', type: 'ISO 8601', desc: 'Date de début (ex: 2024-01-01T00:00:00Z)' },
              { name: 'to', type: 'ISO 8601', desc: 'Date de fin' },
            ]}
            example={`curl -X GET "${BASE}/invoices?status=PAID&limit=10" \\
  -H "Authorization: Bearer yelha_live_..."`}
            response={`{
  "data": [{
    "id": "clx...",
    "number": "FA-2024-001",
    "status": "PAID",
    "total": "15000.00",
    "currency": "DZD",
    "client": { "id": "...", "name": "Client SARL" },
    "issueDate": "2024-01-15T00:00:00.000Z"
  }],
  "meta": { "page": 1, "total": 87 }
}`}
          />
          <Endpoint
            method="GET" path={`${BASE}/invoices/:id`}
            description="Détail d'une facture avec lignes et paiements"
            params={[{ name: 'id', type: 'string', required: true, desc: 'Identifiant unique de la facture' }]}
            example={`curl -X GET "${BASE}/invoices/clx123..." \\
  -H "Authorization: Bearer yelha_live_..."`}
            response={`{
  "data": {
    "id": "clx123...",
    "number": "FA-2024-001",
    "client": { "name": "Client SARL", "nif": "..." },
    "lines": [{ "description": "Prestation", "quantity": "2.000",
      "unitPrice": "5000.00", "taxRate": "19.00", "total": "11900.00" }],
    "payments": [{ "amount": "15000.00", "method": "CASH" }]
  }
}`}
          />
        </Section>

        {/* Clients */}
        <Section id="clients" title="5. Clients">
          <Endpoint
            method="GET" path={`${BASE}/clients`}
            description="Liste tous les clients"
            params={[
              { name: 'page', type: 'integer', desc: 'Numéro de page' },
              { name: 'limit', type: 'integer', desc: 'Résultats par page, max 100' },
              { name: 'search', type: 'string', desc: 'Recherche par nom' },
              { name: 'type', type: 'string', desc: 'COMPANY ou INDIVIDUAL' },
            ]}
            example={`curl -X GET "${BASE}/clients?search=SARL&type=COMPANY" \\
  -H "Authorization: Bearer yelha_live_..."`}
            response={`{
  "data": [{
    "id": "clx...", "name": "Client SARL",
    "clientType": "COMPANY", "email": "contact@client.dz",
    "wilaya": "16", "_count": { "invoices": 12 }
  }],
  "meta": { "page": 1, "total": 34 }
}`}
          />
        </Section>

        {/* Products */}
        <Section id="products" title="6. Produits">
          <Endpoint
            method="GET" path={`${BASE}/products`}
            description="Liste tous les produits du catalogue"
            params={[
              { name: 'page', type: 'integer', desc: 'Numéro de page' },
              { name: 'limit', type: 'integer', desc: 'Résultats par page' },
              { name: 'search', type: 'string', desc: 'Recherche par nom ou SKU' },
              { name: 'active', type: 'boolean', desc: 'true = produits actifs uniquement' },
            ]}
            example={`curl -X GET "${BASE}/products?active=true" \\
  -H "Authorization: Bearer yelha_live_..."`}
            response={`{
  "data": [{
    "id": "clx...", "name": "Produit A",
    "sku": "REF-001", "unitPrice": "2500.00",
    "taxRate": "19.00", "stockQty": "150.000", "unit": "pièce"
  }],
  "meta": { "page": 1, "total": 56 }
}`}
          />
        </Section>

        {/* Quotes */}
        <Section id="quotes" title="7. Devis">
          <Endpoint
            method="GET" path={`${BASE}/quotes`}
            description="Liste tous les devis"
            params={[
              { name: 'page', type: 'integer', desc: 'Numéro de page' },
              { name: 'limit', type: 'integer', desc: 'Résultats par page' },
              { name: 'status', type: 'string', desc: 'DRAFT, SENT, ACCEPTED, REJECTED, EXPIRED, CONVERTED' },
              { name: 'clientId', type: 'string', desc: 'Filtrer par ID client' },
            ]}
            example={`curl -X GET "${BASE}/quotes?status=ACCEPTED" \\
  -H "Authorization: Bearer yelha_live_..."`}
            response={`{
  "data": [{
    "id": "clx...", "number": "DV-2024-012",
    "status": "ACCEPTED", "total": "89000.00",
    "currency": "DZD", "expiryDate": "2024-02-28T00:00:00.000Z",
    "client": { "id": "...", "name": "Client EURL" }
  }],
  "meta": { "page": 1, "total": 21 }
}`}
          />
        </Section>

        {/* Support */}
        <Section id="support" title="8. Support">
          <div className="bg-slate-50 rounded-xl p-6 text-sm text-slate-600 space-y-2">
            <p><strong>Email :</strong> support@yelhaerp.dz</p>
            <p><strong>WhatsApp :</strong> +33 7 61 17 93 79</p>
            <p><strong>Version API :</strong> v1.0 — Stable</p>
            <p className="text-xs text-slate-400 mt-4">© {new Date().getFullYear()} YelhaERP — Alger, Algérie. Tous droits réservés.</p>
          </div>
        </Section>
      </div>
    </div>
  )
}
