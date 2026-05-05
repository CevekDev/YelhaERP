import { vi } from 'vitest'

// Mock prisma globally
vi.mock('@/lib/prisma', () => ({
  prisma: {
    invoice:  { findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    client:   { findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    product:  { findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    quote:    { findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    webhook:  { findMany: vi.fn(), findFirst: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    apiKey:   { findUnique: vi.fn(), update: vi.fn() },
    $transaction: vi.fn(),
  },
}))

// Mock webhook dispatch (fire-and-forget, don't test side effects in unit tests)
vi.mock('@/lib/webhooks/dispatch', () => ({
  dispatchWebhook: vi.fn(),
  signPayload: (secret: string, body: string) => {
    const crypto = require('crypto')
    return crypto.createHmac('sha256', secret).update(body).digest('hex')
  },
}))

// Mock API key auth — always returns a valid context by default
vi.mock('@/lib/security/api-key-auth', () => ({
  authenticateApiKey: vi.fn().mockResolvedValue({
    companyId: 'test-company-id',
    plan: 'PRO',
    keyId: 'test-key-id',
    scopes: ['read', 'write'],
    mode: 'test',
  }),
}))

// Mock rate limiting — always allow
vi.mock('@/lib/security/ratelimit', () => ({
  rateLimitByKey: vi.fn().mockResolvedValue({ success: true, remaining: 999, reset: Date.now() + 3600000 }),
  API_V1_RATE_LIMITS: { PRO: { limit: 10000, window: 3600 } },
}))

// Mock generateInvoiceNumber
vi.mock('@/lib/algerian/format', () => ({
  generateInvoiceNumber: vi.fn().mockReturnValue('FAC-2025-0001'),
  formatDA: (n: number) => `${n} DA`,
  formatDACompact: (n: number) => `${n} DA`,
}))
