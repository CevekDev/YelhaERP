import { createHmac, timingSafeEqual } from 'crypto'

export const ADMIN_COOKIE = 'yelha_admin'
export const DEFAULT_ADMIN_PASSWORD = 'Yelha@2024'

function getSecret(): string {
  return process.env.NEXTAUTH_SECRET ?? 'yelha-admin-dev-secret-change-me'
}

export function createAdminToken(): string {
  const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000
  const payload = `admin:${expiry}`
  const sig = createHmac('sha256', getSecret()).update(payload).digest('hex')
  return Buffer.from(`${payload}|${sig}`).toString('base64url')
}

export function verifyAdminToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8')
    const lastPipe = decoded.lastIndexOf('|')
    if (lastPipe === -1) return false
    const payload = decoded.substring(0, lastPipe)
    const sig = decoded.substring(lastPipe + 1)
    const expected = createHmac('sha256', getSecret()).update(payload).digest('hex')
    if (sig.length !== expected.length) return false
    if (!timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) return false
    const [role, expiryStr] = payload.split(':')
    if (role !== 'admin') return false
    if (Date.now() > Number(expiryStr)) return false
    return true
  } catch {
    return false
  }
}
