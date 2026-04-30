import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export interface ApiKeyContext {
  companyId: string
  plan: string
  keyId: string
  scopes: string[]
}

export async function authenticateApiKey(req: NextRequest): Promise<ApiKeyContext | null> {
  const auth = req.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const rawKey = auth.slice(7).trim()
  if (!rawKey || rawKey.length < 20) return null

  const hash = crypto.createHash('sha256').update(rawKey).digest('hex')

  const apiKey = await prisma.apiKey.findUnique({
    where: { keyHash: hash, isActive: true },
    include: { company: { select: { id: true, plan: true } } },
  })
  if (!apiKey) return null

  // Update lastUsedAt non-blocking
  prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {})

  return {
    companyId: apiKey.company.id,
    plan: apiKey.company.plan,
    keyId: apiKey.id,
    scopes: apiKey.scopes,
  }
}

export function generateApiKey(mode: 'live' | 'test' = 'live'): { raw: string; hash: string; prefix: string } {
  const random = crypto.randomBytes(32).toString('base64url')
  const raw = `yelha_${mode}_${random}`
  const hash = crypto.createHash('sha256').update(raw).digest('hex')
  const prefix = raw.slice(0, 24)
  return { raw, hash, prefix }
}
