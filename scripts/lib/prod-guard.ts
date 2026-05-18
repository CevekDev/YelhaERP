/**
 * Prod safety guard for write-heavy scripts.
 *
 * Refuse to run when DATABASE_URL points to the production Supabase project
 * unless the caller explicitly opts in with --allow-prod or YELHA_ALLOW_PROD=1.
 *
 * Reason: scripts/simulate-* and similar test runners write data (payments,
 * subscriptions, fake webhooks). Running them against prod once already
 * contaminated a real account — see PROJECT_MAP "diagnose-last-account" note.
 */

const PROD_HOST_MARKERS = [
  // Supabase pooled / direct hostnames look like:
  //   db.<project-ref>.supabase.co
  //   <region>.pooler.supabase.com
  'supabase.co',
  'supabase.com',
]

export function assertNotProd(scriptName: string): void {
  const url = process.env.DATABASE_URL ?? ''
  const looksProd = PROD_HOST_MARKERS.some(h => url.includes(h))
  if (!looksProd) return

  const allowed =
    process.argv.includes('--allow-prod') ||
    process.env.YELHA_ALLOW_PROD === '1'

  if (allowed) {
    console.warn('')
    console.warn('⚠️  ' + '═'.repeat(70))
    console.warn(`⚠️   ${scriptName} runs against PRODUCTION (--allow-prod given).`)
    console.warn('⚠️   This will mutate real customer data. You have 5 seconds to Ctrl+C.')
    console.warn('⚠️  ' + '═'.repeat(70))
    console.warn('')
    // Block synchronously for 5s so a human can react.
    const until = Date.now() + 5000
    while (Date.now() < until) { /* spin */ }
    return
  }

  const masked = url.replace(/:[^:@/]+@/, ':***@')
  console.error('')
  console.error('🛑 ' + '═'.repeat(70))
  console.error(`🛑   Refusing to run ${scriptName} against production.`)
  console.error('🛑')
  console.error(`🛑   DATABASE_URL = ${masked}`)
  console.error('🛑')
  console.error('🛑   This script writes data (creates fake payments, subscriptions,')
  console.error('🛑   sends signed webhook payloads). Running it on prod has already')
  console.error('🛑   contaminated a real account once. Use a local/staging DB.')
  console.error('🛑')
  console.error('🛑   If you REALLY want to run on prod (e.g. one-shot cleanup), pass')
  console.error('🛑   --allow-prod  or set  YELHA_ALLOW_PROD=1.')
  console.error('🛑 ' + '═'.repeat(70))
  console.error('')
  process.exit(1)
}
