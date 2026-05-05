import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/v1/quotes/route'
import { GET as getOne, PUT, DELETE } from '@/app/api/v1/quotes/[id]/route'
import { POST as convert } from '@/app/api/v1/quotes/[id]/convert/route'
import { prisma } from '@/lib/prisma'

function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer yelha_test_abc' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

const mockLine = { id: 'ql-1', description: 'Service', quantity: 2, unitPrice: 5000, taxRate: 19, total: 11900 }
const mockQuote = {
  id: 'q-1',
  number: 'DV-2025-0001',
  status: 'DRAFT',
  issueDate: new Date('2025-01-01'),
  expiryDate: new Date('2025-02-01'),
  subtotal: 10000,
  taxAmount: 1900,
  total: 11900,
  currency: 'DZD',
  notes: null,
  clientId: 'cli-1',
  client: { id: 'cli-1', name: 'Test SARL', email: null },
  lines: [mockLine],
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('GET /api/v1/quotes', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns paginated quotes', async () => {
    vi.mocked(prisma.quote.findMany).mockResolvedValue([mockQuote] as never)
    vi.mocked(prisma.quote.count).mockResolvedValue(1)

    const req = makeRequest('GET', 'http://localhost/api/v1/quotes')
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.meta.total).toBe(1)
    expect(json.meta.hasPrev).toBe(false)
  })

  it('supports sortBy=total', async () => {
    vi.mocked(prisma.quote.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.quote.count).mockResolvedValue(0)

    await GET(makeRequest('GET', 'http://localhost/api/v1/quotes?sortBy=total&sortOrder=asc'))
    expect(prisma.quote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { total: 'asc' } })
    )
  })
})

describe('POST /api/v1/quotes', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a quote', async () => {
    vi.mocked(prisma.client.findFirst).mockResolvedValue({ id: 'cli-1' } as never)
    vi.mocked(prisma.quote.count).mockResolvedValue(0)
    vi.mocked(prisma.quote.create).mockResolvedValue(mockQuote as never)

    const req = makeRequest('POST', 'http://localhost/api/v1/quotes', {
      clientId:  'clyabc123',
      issueDate: '2025-01-01T00:00:00Z',
      lines: [{ description: 'Prestation', quantity: 2, unitPrice: 5000, taxRate: 19 }],
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  it('rejects empty lines array', async () => {
    const req = makeRequest('POST', 'http://localhost/api/v1/quotes', {
      clientId: 'clyabc123',
      issueDate: '2025-01-01T00:00:00Z',
      lines: [],
    })
    const res = await POST(req)
    expect(res.status).toBe(422)
  })
})

describe('GET /api/v1/quotes/:id', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns a quote with lines', async () => {
    vi.mocked(prisma.quote.findFirst).mockResolvedValue(mockQuote as never)
    const req = makeRequest('GET', 'http://localhost/api/v1/quotes/q-1')
    const res = await getOne(req, { params: { id: 'q-1' } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.lines).toHaveLength(1)
  })

  it('returns 404 for unknown quote', async () => {
    vi.mocked(prisma.quote.findFirst).mockResolvedValue(null)
    const res = await getOne(makeRequest('GET', 'http://localhost/api/v1/quotes/nope'), { params: { id: 'nope' } })
    expect(res.status).toBe(404)
  })
})

describe('PUT /api/v1/quotes/:id', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updates quote status to ACCEPTED', async () => {
    vi.mocked(prisma.quote.findFirst).mockResolvedValue(mockQuote as never)
    vi.mocked(prisma.quote.update).mockResolvedValue({ ...mockQuote, status: 'ACCEPTED' } as never)

    const req = makeRequest('PUT', 'http://localhost/api/v1/quotes/q-1', { status: 'ACCEPTED' })
    const res = await PUT(req, { params: { id: 'q-1' } })
    expect(res.status).toBe(200)
  })

  it('rejects modifying a CONVERTED quote', async () => {
    vi.mocked(prisma.quote.findFirst).mockResolvedValue({ ...mockQuote, status: 'CONVERTED' } as never)

    const req = makeRequest('PUT', 'http://localhost/api/v1/quotes/q-1', { status: 'DRAFT' })
    const res = await PUT(req, { params: { id: 'q-1' } })
    expect(res.status).toBe(409)
  })
})

describe('DELETE /api/v1/quotes/:id', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deletes a DRAFT quote', async () => {
    vi.mocked(prisma.quote.findFirst).mockResolvedValue(mockQuote as never)
    vi.mocked(prisma.quote.delete).mockResolvedValue(mockQuote as never)

    const res = await DELETE(makeRequest('DELETE', 'http://localhost/api/v1/quotes/q-1'), { params: { id: 'q-1' } })
    expect(res.status).toBe(200)
    expect(prisma.quote.delete).toHaveBeenCalled()
  })

  it('rejects deleting a CONVERTED quote', async () => {
    vi.mocked(prisma.quote.findFirst).mockResolvedValue({ ...mockQuote, status: 'CONVERTED' } as never)

    const res = await DELETE(makeRequest('DELETE', 'http://localhost/api/v1/quotes/q-1'), { params: { id: 'q-1' } })
    expect(res.status).toBe(409)
    expect(prisma.quote.delete).not.toHaveBeenCalled()
  })
})

describe('POST /api/v1/quotes/:id/convert', () => {
  beforeEach(() => vi.clearAllMocks())

  it('converts an ACCEPTED quote to an invoice', async () => {
    vi.mocked(prisma.quote.findFirst).mockResolvedValue({ ...mockQuote, status: 'ACCEPTED' } as never)
    vi.mocked(prisma.invoice.count).mockResolvedValue(0)
    vi.mocked(prisma.$transaction).mockImplementation(async (fn: unknown) => {
      if (typeof fn === 'function') {
        return fn({
          quote: { update: vi.fn() },
          invoice: { create: vi.fn().mockResolvedValue({ id: 'inv-new', number: 'FAC-2025-0001' }) },
        })
      }
    })

    const req = makeRequest('POST', 'http://localhost/api/v1/quotes/q-1/convert', { type: 'STANDARD' })
    const res = await convert(req, { params: { id: 'q-1' } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.quote.status).toBe('CONVERTED')
  })

  it('rejects converting an already CONVERTED quote', async () => {
    vi.mocked(prisma.quote.findFirst).mockResolvedValue({ ...mockQuote, status: 'CONVERTED' } as never)

    const req = makeRequest('POST', 'http://localhost/api/v1/quotes/q-1/convert', {})
    const res = await convert(req, { params: { id: 'q-1' } })
    expect(res.status).toBe(409)
  })
})
