import crypto from 'crypto'
import { NextRequest } from 'next/server'

/**
 * Verify the CRON_SECRET in constant time. Returns true if the Bearer token
 * provided in the Authorization header matches process.env.CRON_SECRET.
 * Use this in every /api/cron/* route to avoid timing-attack leakage on the
 * shared secret.
 */
export function verifyCronSecret(req: NextRequest): boolean {
  const expected = process.env.CRON_SECRET
  if (!expected) return false
  const provided = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  const expectedBuf = Buffer.from(expected)
  const providedBuf = Buffer.from(provided)
  if (expectedBuf.length !== providedBuf.length) return false
  return crypto.timingSafeEqual(expectedBuf, providedBuf)
}
