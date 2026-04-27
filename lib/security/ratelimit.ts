import { NextRequest } from 'next/server'

// Fallback en mémoire si Upstash n'est pas configuré
const memoryStore = new Map<string, { count: number; resetAt: number }>()

function getIdentifier(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.headers.get('x-real-ip') ?? 'unknown'
  return ip
}

interface RateLimitConfig {
  limit: number
  windowMs: number
}

export async function rateLimit(
  req: NextRequest,
  config: RateLimitConfig = { limit: 100, windowMs: 60_000 }
): Promise<{ success: boolean; remaining: number; reset: number }> {
  // Tente d'utiliser Upstash si configuré
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const { Ratelimit } = await import('@upstash/ratelimit')
      const { Redis } = await import('@upstash/redis')
      const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
      const limiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(config.limit, `${config.windowMs / 1000} s`),
      })
      const id = getIdentifier(req)
      const result = await limiter.limit(id)
      return {
        success: result.success,
        remaining: result.remaining,
        reset: result.reset,
      }
    } catch {
      // Fallback silencieux vers la mémoire
    }
  }

  // Fallback en mémoire
  const key = getIdentifier(req)
  const now = Date.now()
  const entry = memoryStore.get(key)

  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, { count: 1, resetAt: now + config.windowMs })
    return { success: true, remaining: config.limit - 1, reset: now + config.windowMs }
  }

  if (entry.count >= config.limit) {
    return { success: false, remaining: 0, reset: entry.resetAt }
  }

  entry.count++
  return { success: true, remaining: config.limit - entry.count, reset: entry.resetAt }
}

// Configs prédéfinies
export const PUBLIC_RATE_LIMIT = { limit: 100, windowMs: 60_000 }
export const AUTH_RATE_LIMIT = { limit: 10, windowMs: 60_000 } // Plus strict pour l'auth
export const AUTHENTICATED_RATE_LIMIT = { limit: 300, windowMs: 60_000 }
export const AI_RATE_LIMIT = { limit: 20, windowMs: 60_000 }
