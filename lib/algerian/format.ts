/**
 * Formatage du dinar algérien.
 * - formatDA(990) → "990 DA"
 * - formatDACompact(990000) → "990K DA"
 */

export function formatDA(amount: number | string | null | undefined): string {
  if (amount == null || amount === '') return '0 DA'
  const n = typeof amount === 'string' ? Number(amount) : amount
  if (!Number.isFinite(n)) return '0 DA'
  return `${Math.round(n).toLocaleString('fr-DZ')} DA`
}

export function formatDACompact(amount: number | null | undefined): string {
  if (amount == null) return '0 DA'
  const abs = Math.abs(amount)
  if (abs >= 1_000_000) return `${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M DA`
  if (abs >= 1_000) return `${(amount / 1_000).toFixed(1).replace(/\.0$/, '')}K DA`
  return `${Math.round(amount)} DA`
}
