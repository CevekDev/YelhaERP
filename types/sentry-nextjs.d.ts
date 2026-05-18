// Shim de types pour @sentry/nextjs.
// La résolution TS du package via le champ `exports` (multi-condition edge/
// node/browser/import) ne trouve pas toujours `build/types/index.types.d.ts`.
// On déclare une surface minimale — seules les 3 fonctions qu'on utilise
// effectivement dans le code (init, captureException, withSentryConfig).
declare module '@sentry/nextjs' {
  export function init(options: Record<string, unknown>): void
  export function captureException(error: unknown, context?: Record<string, unknown>): string
  export function captureMessage(message: string, level?: string): string
  export function withSentryConfig<T>(config: T, options?: Record<string, unknown>): T
}
