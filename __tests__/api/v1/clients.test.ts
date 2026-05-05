import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/v1/clients/route'
import { GET as getOne, PUT, DELETE } from '@/app/api/v1/clients/[id]/route'
import { prisma } from '@/lib/prisma'

function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer yelha_test_abc' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

const mockClient = {
  id: 'cli-1',
  clientType: 'COMPANY',
  name: 'Test SARL',
  firstName: null,
  email: 'contact@test.dz',
  phone: '0555123456',
  address: '1 Rue Test',
  wilaya: 'Alger',
  nif: '123456789',
  nis: null,
  rc: null,
  description: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  _count: { invoices: 0, quotes: 0 },
}

describe('GET /api/v1/clients', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns paginated clients with meta', async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValue([mockClient] as never)
    vi.mocked(prisma.client.count).mockResolvedValue(1)

    const req = makeRequest('GET', 'http://localhost/api/v1/clients')
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data).toHaveLength(1)
    expect(json.meta).toMatchObject({ page: 1, limit: 20, total: 1, hasNext: false, hasPrev: false })
  })

  it('filters by type', async () => {
    vi.mocked(prisma.client.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.client.count).mockResolvedValue(0)

    const req = makeRequest('GET', 'http://localhost/api/v1/clients?type=INDIVIDUAL')
    await GET(req)
    expect(prisma.client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ clientType: 'INDIVIDUAL' }) })
    )
  })

  it('rejects invalid type', async () => {
    const req = makeRequest('GET', 'http://localhost/api/v1/clients?type=INVALID')
    const res = await GET(req)
    expect(res.status).toBe(400)
  })
})

describe('POST /api/v1/clients', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a company client', async () => {
    vi.mocked(prisma.client.create).mockResolvedValue(mockClient as never)

    const req = makeRequest('POST', 'http://localhost/api/v1/clients', {
      name: 'Test SARL',
      clientType: 'COMPANY',
      email: 'contact@test.dz',
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.name).toBe('Test SARL')
  })

  it('rejects name shorter than 2 chars', async () => {
    const req = makeRequest('POST', 'http://localhost/api/v1/clients', { name: 'X' })
    const res = await POST(req)
    expect(res.status).toBe(422)
  })

  it('rejects invalid email', async () => {
    const req = makeRequest('POST', 'http://localhost/api/v1/clients', {
      name: 'Test SARL',
      email: 'not-an-email',
    })
    const res = await POST(req)
    expect(res.status).toBe(422)
  })
})

describe('PUT /api/v1/clients/:id', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updates client fields', async () => {
    vi.mocked(prisma.client.findFirst).mockResolvedValue(mockClient as never)
    vi.mocked(prisma.client.update).mockResolvedValue({ ...mockClient, name: 'Updated SARL' } as never)

    const req = makeRequest('PUT', 'http://localhost/api/v1/clients/cli-1', { name: 'Updated SARL' })
    const res = await PUT(req, { params: { id: 'cli-1' } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.name).toBe('Updated SARL')
  })

  it('returns 404 for unknown client', async () => {
    vi.mocked(prisma.client.findFirst).mockResolvedValue(null)
    const req = makeRequest('PUT', 'http://localhost/api/v1/clients/unknown', { name: 'X Y Z' })
    const res = await PUT(req, { params: { id: 'unknown' } })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/v1/clients/:id', () => {
  beforeEach(() => vi.clearAllMocks())

  it('deletes a client with no invoices', async () => {
    vi.mocked(prisma.client.findFirst).mockResolvedValue({ ...mockClient, _count: { invoices: 0 } } as never)
    vi.mocked(prisma.client.delete).mockResolvedValue(mockClient as never)

    const req = makeRequest('DELETE', 'http://localhost/api/v1/clients/cli-1')
    const res = await DELETE(req, { params: { id: 'cli-1' } })
    expect(res.status).toBe(200)
    expect(prisma.client.delete).toHaveBeenCalled()
  })

  it('rejects deleting a client with invoices', async () => {
    vi.mocked(prisma.client.findFirst).mockResolvedValue({ ...mockClient, _count: { invoices: 3 } } as never)

    const req = makeRequest('DELETE', 'http://localhost/api/v1/clients/cli-1')
    const res = await DELETE(req, { params: { id: 'cli-1' } })
    expect(res.status).toBe(409)
    expect(prisma.client.delete).not.toHaveBeenCalled()
  })
})
