import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/v1/webhooks/route'
import { DELETE } from '@/app/api/v1/webhooks/[id]/route'
import { signPayload } from '@/lib/webhooks/dispatch'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer yelha_test_abc' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

const mockWebhook = {
  id: 'wh-1',
  url: 'https://example.com/hook',
  events: ['invoice.created', 'invoice.paid'],
  description: 'Test hook',
  isActive: true,
  lastTriggeredAt: null,
  createdAt: new Date(),
  secret: 'supersecret123',
}

describe('GET /api/v1/webhooks', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists active webhooks (without secret)', async () => {
    vi.mocked(prisma.webhook.findMany).mockResolvedValue([mockWebhook] as never)

    const res = await GET(makeRequest('GET', 'http://localhost/api/v1/webhooks'))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toHaveLength(1)
    expect(json.data[0].secret).toBeUndefined()
  })
})

describe('POST /api/v1/webhooks', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a webhook and returns the secret', async () => {
    vi.mocked(prisma.webhook.count).mockResolvedValue(0)
    vi.mocked(prisma.webhook.create).mockResolvedValue(mockWebhook as never)

    const req = makeRequest('POST', 'http://localhost/api/v1/webhooks', {
      url:    'https://example.com/hook',
      events: ['invoice.created', 'invoice.paid'],
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.secret).toBeDefined()
    expect(json.data.secretNote).toContain('Conservez')
  })

  it('rejects invalid event names', async () => {
    vi.mocked(prisma.webhook.count).mockResolvedValue(0)

    const req = makeRequest('POST', 'http://localhost/api/v1/webhooks', {
      url:    'https://example.com/hook',
      events: ['not.an.event'],
    })
    const res = await POST(req)
    expect(res.status).toBe(422)
  })

  it('rejects non-HTTPS URLs', async () => {
    vi.mocked(prisma.webhook.count).mockResolvedValue(0)

    const req = makeRequest('POST', 'http://localhost/api/v1/webhooks', {
      url:    'ftp://evil.com/hook',
      events: ['invoice.created'],
    })
    const res = await POST(req)
    expect(res.status).toBe(422)
  })

  it('enforces 10-webhook limit', async () => {
    vi.mocked(prisma.webhook.count).mockResolvedValue(10)

    const req = makeRequest('POST', 'http://localhost/api/v1/webhooks', {
      url:    'https://example.com/hook',
      events: ['invoice.created'],
    })
    const res = await POST(req)
    expect(res.status).toBe(429)
    const json = await res.json()
    expect(json.code).toBe('LIMIT_EXCEEDED')
  })
})

describe('DELETE /api/v1/webhooks/:id', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deactivates a webhook', async () => {
    vi.mocked(prisma.webhook.findFirst).mockResolvedValue(mockWebhook as never)
    vi.mocked(prisma.webhook.update).mockResolvedValue({ ...mockWebhook, isActive: false } as never)

    const res = await DELETE(makeRequest('DELETE', 'http://localhost/api/v1/webhooks/wh-1'), { params: { id: 'wh-1' } })
    expect(res.status).toBe(200)
    expect(prisma.webhook.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isActive: false } })
    )
  })

  it('returns 404 for unknown webhook', async () => {
    vi.mocked(prisma.webhook.findFirst).mockResolvedValue(null)
    const res = await DELETE(makeRequest('DELETE', 'http://localhost/api/v1/webhooks/nope'), { params: { id: 'nope' } })
    expect(res.status).toBe(404)
  })
})

describe('signPayload (HMAC-SHA256)', () => {
  it('produces correct HMAC', () => {
    const secret = 'my-secret'
    const body = JSON.stringify({ event: 'invoice.created', data: {} })
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex')
    const result = signPayload(secret, body)
    expect(result).toBe(expected)
  })

  it('produces different signatures for different bodies', () => {
    const secret = 'my-secret'
    const sig1 = signPayload(secret, '{"a":1}')
    const sig2 = signPayload(secret, '{"a":2}')
    expect(sig1).not.toBe(sig2)
  })

  it('produces different signatures for different secrets', () => {
    const body = '{"event":"test"}'
    const sig1 = signPayload('secret-1', body)
    const sig2 = signPayload('secret-2', body)
    expect(sig1).not.toBe(sig2)
  })
})
