/**
 * Webhook idempotence guard backed by Upstash Redis.
 * Returns true if the event id was already processed (caller should skip).
 * Returns false if it's a new event (and records it for 7 days).
 *
 * Use a namespace per webhook (e.g. 'chargily', 'chargily_sub', 'delivery')
 * so ids from different providers never collide.
 *
 * Falls back to "not processed" if Redis is unavailable — best-effort.
 */
export async function isAlreadyProcessed(namespace: string, eventId: string): Promise<boolean> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return false
  try {
    const { Redis } = await import('@upstash/redis')
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    const key = `webhook:${namespace}:${eventId}`
    const existing = await redis.get(key)
    if (existing) return true
    await redis.set(key, '1', { ex: 7 * 24 * 3600 })
    return false
  } catch {
    return false
  }
}
