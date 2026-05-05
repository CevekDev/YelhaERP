# Changelog — YelhaERP REST API

All notable changes to the YelhaERP REST API are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).  
Base URL: `https://erp.yelha.net/api/v1`

---

## [1.1.0] — 2025-05-05

### Added

#### Write endpoints (POST / PUT / DELETE)
- `POST   /api/v1/invoices` — Create a new invoice with line items
- `PUT    /api/v1/invoices/:id` — Update invoice status or line items
- `DELETE /api/v1/invoices/:id` — Soft-delete (sets status → CANCELLED)
- `POST   /api/v1/clients` — Create a client (company or individual)
- `PUT    /api/v1/clients/:id` — Update client fields
- `DELETE /api/v1/clients/:id` — Hard-delete (blocked if client has invoices)
- `POST   /api/v1/products` — Create a product in the catalogue
- `PUT    /api/v1/products/:id` — Update product details (price, SKU, stock alert…)
- `DELETE /api/v1/products/:id` — Soft-delete (sets isActive → false, preserves history)
- `GET    /api/v1/quotes/:id` — Get quote detail with lines (was missing)
- `POST   /api/v1/quotes` — Create a quote with line items
- `PUT    /api/v1/quotes/:id` — Update quote status or content
- `DELETE /api/v1/quotes/:id` — Hard-delete (blocked if already CONVERTED)
- `POST   /api/v1/quotes/:id/convert` — Convert a quote into an invoice

#### Webhooks
- `GET    /api/v1/webhooks` — List active webhook subscriptions
- `POST   /api/v1/webhooks` — Register a new webhook (url + events)
- `DELETE /api/v1/webhooks/:id` — Deactivate a webhook

  Supported events: `invoice.created`, `invoice.updated`, `invoice.paid`,
  `quote.accepted`, `quote.rejected`, `quote.converted`,
  `client.created`, `client.updated`

  Each outbound call carries:
  - `Content-Type: application/json`
  - `X-Yelha-Signature: sha256=<hmac-sha256-hex>`
  - `X-Yelha-Event: <event-name>`
  - `X-Yelha-Delivery: <uuid>`

#### Pagination improvements
- All list endpoints now return `meta.hasNext` and `meta.hasPrev`
- All list endpoints accept `sortBy` and `sortOrder` (asc/desc) query parameters

#### Environment support
- All responses now include `X-Yelha-Environment: live | test`
- API keys carry a `mode` field (`live` vs `test`)
- Live keys: `yelha_live_...` / Test keys: `yelha_test_...`

#### Developer
- Vitest test suite for all new endpoints (`npm test`)
- `vitest.config.ts` with path aliases and coverage configuration

### Changed
- `GET /api/v1/invoices` — `meta` now includes `hasNext` and `hasPrev`
- `GET /api/v1/clients` — `meta` now includes `hasNext`, `hasPrev`; default sort `name asc`
- `GET /api/v1/products` — `meta` now includes `hasNext`, `hasPrev`; default sort `name asc`
- `GET /api/v1/quotes` — `meta` now includes `hasNext`, `hasPrev`

### Security
- Write operations now validated with `requireWriteScope()` — scope `write` required in API key
- Webhook signing uses HMAC-SHA256 with a per-webhook random secret (64 hex chars)
- Maximum 10 active webhooks per account
- Webhook secrets returned only once on creation

---

## [1.0.0] — 2025-01-01

### Added (initial release)
- `GET /api/v1/invoices` — List invoices with filters (status, clientId, date range)
- `GET /api/v1/invoices/:id` — Invoice detail with lines and payments
- `GET /api/v1/clients` — List clients with search and type filter
- `GET /api/v1/clients/:id` — Client detail with invoice count
- `GET /api/v1/products` — List products with search and active filter
- `GET /api/v1/products/:id` — Product detail with stock info
- `GET /api/v1/quotes` — List quotes with filters
- `GET /api/v1/stock` — Stock positions
- `GET /api/v1/stock/:productId` — Stock movements for a product
- `GET /api/v1/orders` — E-commerce orders
- Bearer token authentication via `Authorization: Bearer <key>`
- Per-plan rate limiting with `X-RateLimit-*` headers
- Error format: `{ error, code, status }`

---

## Upcoming — v2 (planned)

> All v1 endpoints remain fully supported. v2 will be additive.

### Planned additions
- `GET /api/v2/invoices` — Cursor-based pagination (more efficient for large datasets)
- `POST /api/v2/invoices/:id/send` — Send invoice by email directly from the API
- `POST /api/v2/payments` — Record invoice payments via API
- `GET /api/v2/analytics` — Revenue aggregates and KPIs
- `GET /api/v2/employees` — HR employee list (payroll-scoped keys)
- Bulk operations: `POST /api/v2/invoices/bulk`
- OpenAPI 3.1 spec at `/api/v2/openapi.json`

No endpoints from v1 will be removed in v2. A `Deprecation` header will be added to any
endpoint scheduled for removal at least 6 months in advance.
