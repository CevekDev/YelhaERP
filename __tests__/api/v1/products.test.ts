import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/api/v1/products/route'
import { GET as getOne, PUT, DELETE } from '@/app/api/v1/products/[id]/route'
import { prisma } from '@/lib/prisma'

function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer yelha_test_abc' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

const mockProduct = {
  id: 'prod-1',
  name: 'Widget Pro',
  sku: 'WP-001',
  description: 'A great widget',
  unitPrice: 2500,
  taxRate: 19,
  stockQty: 100,
  stockAlert: 10,
  unit: 'pièce',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('GET /api/v1/products', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns products with isLowStock flag', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([{ ...mockProduct, stockQty: 5, stockAlert: 10 }] as never)
    vi.mocked(prisma.product.count).mockResolvedValue(1)

    const req = makeRequest('GET', 'http://localhost/api/v1/products')
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data[0].isLowStock).toBe(true)
  })

  it('filters active only', async () => {
    vi.mocked(prisma.product.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.product.count).mockResolvedValue(0)

    await GET(makeRequest('GET', 'http://localhost/api/v1/products?active=true'))
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isActive: true }) })
    )
  })
})

describe('POST /api/v1/products', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates a product', async () => {
    vi.mocked(prisma.product.findFirst).mockResolvedValue(null) // no duplicate SKU
    vi.mocked(prisma.product.create).mockResolvedValue(mockProduct as never)

    const req = makeRequest('POST', 'http://localhost/api/v1/products', {
      name: 'Widget Pro',
      unitPrice: 2500,
      sku: 'WP-001',
      taxRate: 19,
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  it('rejects duplicate SKU', async () => {
    vi.mocked(prisma.product.findFirst).mockResolvedValue(mockProduct as never) // SKU exists

    const req = makeRequest('POST', 'http://localhost/api/v1/products', {
      name: 'Other Widget',
      unitPrice: 1000,
      sku: 'WP-001',
    })
    const res = await POST(req)
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.code).toBe('CONFLICT')
  })

  it('rejects negative price', async () => {
    const req = makeRequest('POST', 'http://localhost/api/v1/products', { name: 'Test', unitPrice: -1 })
    const res = await POST(req)
    expect(res.status).toBe(422)
  })
})

describe('PUT /api/v1/products/:id', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updates product price', async () => {
    vi.mocked(prisma.product.findFirst).mockResolvedValue(mockProduct as never)
    vi.mocked(prisma.product.update).mockResolvedValue({ ...mockProduct, unitPrice: 3000 } as never)

    const req = makeRequest('PUT', 'http://localhost/api/v1/products/prod-1', { unitPrice: 3000 })
    const res = await PUT(req, { params: { id: 'prod-1' } })
    expect(res.status).toBe(200)
  })

  it('rejects duplicate SKU on update', async () => {
    vi.mocked(prisma.product.findFirst)
      .mockResolvedValueOnce(mockProduct as never)     // existing product
      .mockResolvedValueOnce({ id: 'prod-2', sku: 'WP-002' } as never) // duplicate

    const req = makeRequest('PUT', 'http://localhost/api/v1/products/prod-1', { sku: 'WP-002' })
    const res = await PUT(req, { params: { id: 'prod-1' } })
    expect(res.status).toBe(409)
  })
})

describe('DELETE /api/v1/products/:id', () => {
  beforeEach(() => vi.clearAllMocks())

  it('soft-deletes by setting isActive=false', async () => {
    vi.mocked(prisma.product.findFirst).mockResolvedValue(mockProduct as never)
    vi.mocked(prisma.product.update).mockResolvedValue({ ...mockProduct, isActive: false } as never)

    const res = await DELETE(makeRequest('DELETE', 'http://localhost/api/v1/products/prod-1'), { params: { id: 'prod-1' } })
    expect(res.status).toBe(200)
    expect(prisma.product.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isActive: false } })
    )
    expect(prisma.product.delete).not.toHaveBeenCalled()
  })
})
