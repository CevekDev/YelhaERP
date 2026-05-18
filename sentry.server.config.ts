// Sentry server-side init (Node runtime).
import * as Sentry from '@sentry/nextjs'

const dsn = process.env.SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    environment: process.env.NODE_ENV,
    // Don't report expected next.js control flow signals
    ignoreErrors: ['NEXT_NOT_FOUND', 'NEXT_REDIRECT'],
  })
}
