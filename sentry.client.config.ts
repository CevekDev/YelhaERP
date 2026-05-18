// Sentry client-side init.
// No-op if SENTRY_DSN is not configured — safe for dev/preview.
import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    environment: process.env.NODE_ENV,
    // Filter out noisy/expected errors
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'ResizeObserver loop completed with undelivered notifications',
      'Network request failed',
      'NEXT_NOT_FOUND',
      'NEXT_REDIRECT',
    ],
  })
}
