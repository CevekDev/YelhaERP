import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/v1/invoices/route'
import { GET as getOne, PUT, DELETE } from '@/app/api/v1/invoices/[id]/route'
import { prisma } from '@/lib/prisma'

const COMPANY_ID = 'test-company-id'

function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer yelha_test_abc123' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

const mockInvoice = {
  id: 'inv-1',
  number: 'FAC-2025-0001',
  type: 'STANDARD',
  status: 'DRAFT',
  issueDate: new Date('2025-01-01'),
  dueDate: null,
  subtotal: 10000,
  taxAmount: 1900,
  total: 11900,
  currency: 'DZD',
  client: { id: 'cli-1', name: 'Test SARL', email: 'test@sarl.dz' },
  lines: [{ id: 'line-1', description: 'Service', quantity: 1, unitPrice: 10000, taxRate: 19, total: 11900 }],
  payments: [],
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('GET /api/v1/invoices', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns paginated invoice list', async () => {
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([mockInvoice] as never)
    vi.mocked(prisma.invoice.count).mockResolvedValue(1)

    const req = makeRequest('GET', 'http://localhost/api/v1/invoices?page=1&limit=20')
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data).toHaveLength(1)
    expect(json.meta.total).toBe(1)
    expect(json.meta.hasNext).toBe(false)
    expect(json.meta.hasPrev).toBe(false)
  })

  it('filters by status', async () => {
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.invoice.count).mockResolvedValue(0)

    const req = makeRequest('GET', 'http://localhost/api/v1/invoices?status=PAID')
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(prisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: 'PAID' }) })
    )
  })

  it('rejects invalid status', async () => {
    const req = makeRequest('GET', 'http://localhost/api/v1/invoices?status=INVALID')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })

  it('supports sortBy and sortOrder', async () => {
    vi.mocked(prisma.invoice.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.invoice.count).mockResolvedValue(0)

    const req = makeRequest('GET', 'http://localhost/api/v1/invoices?sortBy=total&sortOrder=asc')
    const res = await GET(req)
    expect(res.status).toBe(200)
    expect(prisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { total: 'asc' } })
    )
  })
})

describe('POST /api/v1/invoices', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates an invoice', async () => {
    vi.mocked(prisma.client.findFirst).mockResolvedValue({ id: 'cli-1', name: 'Test' } as never)
    vi.mocked(prisma.invoice.count).mockResolvedValue(0)
    vi.mocked(prisma.invoice.create).mockResolvedValue(mockInvoice as never)

    const req = makeRequest('POST', 'http://localhost/api/v1/invoices', {
      clientId:  'clyabc123',
      issueDate: '2025-01-01T00:00:00Z',
      lines: [{ description: 'Service', quantity: 1, unitPrice: 10000, taxRate: 19 }],
    })
    const res = await POST(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data).toBeDefined()
  })

  it('rejects missing required fields', async () => {
    const req = makeRequest('POST', 'http://localhost/api/v1/invoices', { notes: 'missing lines' })
    const res = await POST(req)
    expect(res.status).toBe(422)
    const json = await res.json()
    expect(json.code).toBe('VALIDATION_ERROR')
  })

  it('returns 404 when client not found', async () => {
    vi.mocked(prisma.client.findFirst).mockResolvedValue(null)

    const req = makeRequest('POST', 'http://localhost/api/v1/invoices', {
      clientId:  'clyabc123',
      issueDate: '2025-01-01T00:00:00Z',
      lines: [{ description: 'Service', quantity: 1, unitPrice: 10000 }],
    })
    const res = await POST(req)
    expect(res.status).toBe(404)
  })
})

describe('GET /api/v1/invoices/:id', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns a single invoice', async () => {
    vi.mocked(prisma.invoice.findFirst).mockResolvedValue(mockInvoice as never)
    const req = makeRequest('GET', 'http://localhost/api/v1/invoices/inv-1')
    const res = await getOne(req, { params: { id: 'inv-1' } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.id).toBe('inv-1')
  })

  it('returns 404 for unknown id', async () => {
    vi.mocked(prisma.invoice.findFirst).mockResolvedValue(null)
    const req = makeRequest('GET', 'http://localhost/api/v1/invoices/unknown')
    const res = await getOne(req, { params: { id: 'unknown' } })
    expect(res.status).toBe(404)
  })
})

describe('PUT /api/v1/invoices/:id', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updates invoice status', async () => {
    vi.mocked(prisma.invoice.findFirst).mockResolvedValue(mockInvoice as never)
    vi.mocked(prisma.invoice.update).mockResolvedValue({ ...mockInvoice, status: 'PAID' } as never)

    const req = makeRequest('PUT', 'http://localhost/api/v1/invoices/inv-1', { status: 'PAID' })
    const res = await PUT(req, { params: { id: 'inv-1' } })
    expect(res.status).toBe(200)
  })

  it('rejects modifying a cancelled invoice', async () => {
    vi.mocked(prisma.invoice.findFirst).mockResolvedValue({ ...mockInvoice, status: 'CANCELLED' } as never)

    const req = makeRequest('PUT', 'http://localhost/api/v1/invoices/inv-1', { status: 'DRAFT' })
    const res = await PUT(req, { params: { id: 'inv-1' } })
    expect(res.status).toBe(409)
  })
})

describe('DELETE /api/v1/invoices/:id', () => {
  beforeEach(() => vi.clearAllMocks())

  it('soft-deletes an invoice by setting status to CANCELLED', async () => {
    vi.mocked(prisma.invoice.findFirst).mockResolvedValue(mockInvoice as never)
    vi.mocked(prisma.invoice.update).mockResolvedValue({ ...mockInvoice, status: 'CANCELLED' } as never)

    const req = makeRequest('DELETE', 'http://localhost/api/v1/invoices/inv-1')
    const res = await DELETE(req, { params: { id: 'inv-1' } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.deleted).toBe(true)
    expect(prisma.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'CANCELLED' } })
    )
  })

  it('rejects deleting a paid invoice', async () => {
    vi.mocked(prisma.invoice.findFirst).mockResolvedValue({ ...mockInvoice, status: 'PAID' } as never)

    const req = makeRequest('DELETE', 'http://localhost/api/v1/invoices/inv-1')
    const res = await DELETE(req, { params: { id: 'inv-1' } })
    expect(res.status).toBe(409)
  })
})
