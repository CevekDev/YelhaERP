import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface CheckResult {
  ok: boolean
  detail?: string
}

interface HealthReport {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  checks: Record<string, CheckResult>
}

/**
 * Public-but-light health check. Returns the status of every critical
 * dependency and env var so you can verify a prod deploy in one GET.
 *
 *   curl https://subs.yelha.net/api/health
 *
 * Codes:
 *   200 healthy   — tout est OK
 *   200 degraded  — app boot mais certaines features sont limitées (Sentry off, IA off, etc.)
 *   503 unhealthy — une dépendance critique (DB, secret webhook, cron) est cassée
 */
export async function GET(_req: NextRequest) {
  const checks: Record<string, CheckResult> = {}

  const requireEnv = (name: string): CheckResult => ({
    ok: !!process.env[name],
    detail: process.env[name] ? undefined : 'missing',
  })
  const optionalEnv = (name: string): CheckResult => ({
    ok: !!process.env[name],
    detail: process.env[name] ? undefined : 'not configured (optional)',
  })

  // --- critiques (la prod ne peut pas tourner sans) ---
  checks.databaseUrl     = requireEnv('DATABASE_URL')
  checks.directUrl       = requireEnv('DIRECT_URL')
  checks.nextauthSecret  = requireEnv('NEXTAUTH_SECRET')
  checks.cronSecret      = requireEnv('CRON_SECRET')
  checks.chargilySecret  = requireEnv('CHARGILY_SECRET_KEY')
  checks.chargilyWebhook = requireEnv('CHARGILY_WEBHOOK_SECRET')
  checks.resendApiKey    = requireEnv('RESEND_API_KEY')

  // --- important (degraded si absent — rate limit fallback mémoire trivialement contournable) ---
  checks.upstashUrl   = requireEnv('UPSTASH_REDIS_REST_URL')
  checks.upstashToken = requireEnv('UPSTASH_REDIS_REST_TOKEN')

  // --- optionnels (l'app marche sans, mais avec features réduites) ---
  checks.sentryDsn = optionalEnv('SENTRY_DSN')
  checks.googleOauth = {
    ok: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    detail: (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) ? 'Google OAuth disabled' : undefined,
  }
  checks.deepseekApi = optionalEnv('DEEPSEEK_API_KEY')

  // --- DB connectivity ---
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = { ok: true }
  } catch (e) {
    checks.database = { ok: false, detail: e instanceof Error ? e.message : 'connection failed' }
  }

  // --- verdict ---
  const criticalKeys = ['databaseUrl', 'directUrl', 'nextauthSecret', 'cronSecret',
    'chargilySecret', 'chargilyWebhook', 'resendApiKey', 'database']
  // sentryDsn et googleOauth/deepseekApi : optionnels — leur absence ne
  // dégrade pas le statut global. Affichés à titre informatif uniquement.
  const warnKeys = ['upstashUrl', 'upstashToken']

  const criticalDown = criticalKeys.some(k => !checks[k]?.ok)
  const warnDown = warnKeys.some(k => !checks[k]?.ok)

  const status: HealthReport['status'] = criticalDown ? 'unhealthy' : warnDown ? 'degraded' : 'healthy'

  return NextResponse.json(
    { status, timestamp: new Date().toISOString(), checks } satisfies HealthReport,
    { status: criticalDown ? 503 : 200 },
  )
}
