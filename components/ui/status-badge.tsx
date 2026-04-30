import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  label: string
  color?: 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'cyan' | 'orange'
  dot?: boolean
  size?: 'sm' | 'md'
  className?: string
}

const COLOR_MAP: Record<string, string> = {
  gray:   'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  blue:   'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  green:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  amber:  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  red:    'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  cyan:   'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
  orange: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
}

const DOT_MAP: Record<string, string> = {
  gray: 'bg-gray-400', blue: 'bg-blue-500', green: 'bg-emerald-500',
  amber: 'bg-amber-500', red: 'bg-red-500', purple: 'bg-purple-500',
  cyan: 'bg-cyan-500', orange: 'bg-orange-500',
}

export function StatusBadge({ label, color = 'gray', dot = true, size = 'sm', className }: StatusBadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full font-medium',
      size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1',
      COLOR_MAP[color],
      className,
    )}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', DOT_MAP[color])} />}
      {label}
    </span>
  )
}

// Convenience map for common ERP statuses
export const STATUS_CONFIG: Record<string, { label: string; color: StatusBadgeProps['color'] }> = {
  // Invoices / Quotes
  DRAFT:              { label: 'Brouillon',    color: 'gray' },
  SENT:               { label: 'Envoyé',       color: 'blue' },
  PAID:               { label: 'Payé',         color: 'green' },
  PARTIAL:            { label: 'Partiel',      color: 'amber' },
  OVERDUE:            { label: 'En retard',    color: 'red' },
  CANCELLED:          { label: 'Annulé',       color: 'gray' },
  ACCEPTED:           { label: 'Accepté',      color: 'green' },
  REJECTED:           { label: 'Refusé',       color: 'red' },
  EXPIRED:            { label: 'Expiré',       color: 'gray' },
  CONVERTED:          { label: 'Converti',     color: 'purple' },
  // PO statuses
  SUBMITTED:          { label: 'Soumis',       color: 'blue' },
  APPROVED:           { label: 'Approuvé',     color: 'green' },
  PARTIALLY_RECEIVED: { label: 'Part. reçu',   color: 'amber' },
  RECEIVED:           { label: 'Reçu',         color: 'green' },
  INVOICED:           { label: 'Facturé',      color: 'purple' },
  // Production
  CONFIRMED:          { label: 'Confirmé',     color: 'blue' },
  IN_PROGRESS:        { label: 'En cours',     color: 'amber' },
  DONE:               { label: 'Terminé',      color: 'green' },
  // CRM leads
  NEW:                { label: 'Nouveau',      color: 'blue' },
  CONTACTED:          { label: 'Contacté',     color: 'cyan' },
  QUALIFIED:          { label: 'Qualifié',     color: 'purple' },
  PROPOSAL:           { label: 'Proposition',  color: 'amber' },
  NEGOTIATION:        { label: 'Négociation',  color: 'orange' },
  WON:                { label: 'Gagné',        color: 'green' },
  LOST:               { label: 'Perdu',        color: 'red' },
  // HR
  PENDING:            { label: 'En attente',   color: 'amber' },
  // Projects
  ACTIVE:             { label: 'Actif',        color: 'green' },
  ON_HOLD:            { label: 'En pause',     color: 'amber' },
  COMPLETED:          { label: 'Terminé',      color: 'blue' },
  // Leaves
  TODO:               { label: 'À faire',      color: 'gray' },
  REVIEW:             { label: 'En révision',  color: 'purple' },
}

export function AutoStatusBadge({ status, className }: { status: string; className?: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: 'gray' as const }
  return <StatusBadge label={cfg.label} color={cfg.color} className={className} />
}
