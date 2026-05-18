// Next.js instrumentation hook — runs once at server boot.
// Used to:
// 1. Initialize Sentry for the appropriate runtime
// 2. Warn loudly in production if critical env vars are missing

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')

    // Production sanity checks — warn loudly if critical infra is missing.
    if (process.env.NODE_ENV === 'production') {
      const missing: string[] = []
      if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
        missing.push('UPSTASH_REDIS_REST_URL/TOKEN (rate limit will fall back to in-memory which is NOT shared across Vercel instances — trivially bypassable)')
      }
      if (!process.env.CHARGILY_WEBHOOK_SECRET) {
        missing.push('CHARGILY_WEBHOOK_SECRET (webhook HMAC verification will fail)')
      }
      if (!process.env.CRON_SECRET) {
        missing.push('CRON_SECRET (cron routes will reject everything)')
      }
      if (missing.length > 0) {
        // eslint-disable-next-line no-console
        console.warn('[boot] ⚠ Missing critical env vars in production:\n  - ' + missing.join('\n  - '))
      }
    }
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}
