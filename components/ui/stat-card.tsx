import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon?: LucideIcon
  color?: 'default' | 'blue' | 'green' | 'amber' | 'red' | 'purple'
  trend?: string
  trendUp?: boolean
  href?: string
  alert?: boolean
  className?: string
}

const COLOR_MAP: Record<string, { bg: string; icon: string; trend: string }> = {
  default: { bg: 'bg-muted',        icon: 'text-muted-foreground', trend: 'text-muted-foreground' },
  blue:    { bg: 'bg-blue-50',      icon: 'text-blue-600',         trend: 'text-blue-600' },
  green:   { bg: 'bg-emerald-50',   icon: 'text-emerald-600',      trend: 'text-emerald-600' },
  amber:   { bg: 'bg-amber-50',     icon: 'text-amber-600',        trend: 'text-amber-600' },
  red:     { bg: 'bg-red-50',       icon: 'text-red-600',          trend: 'text-red-600' },
  purple:  { bg: 'bg-purple-50',    icon: 'text-purple-600',       trend: 'text-purple-600' },
}

export function StatCard({
  label, value, sub, icon: Icon, color = 'default',
  trend, trendUp, href, alert, className,
}: StatCardProps) {
  const colors = COLOR_MAP[color]
  const Wrapper = href ? 'a' : 'div'

  return (
    <Wrapper
      {...(href ? { href } : {})}
      className={cn(
        'bg-background border border-border rounded-xl p-4 flex items-start gap-3',
        href && 'hover:border-primary/30 hover:shadow-sm cursor-pointer transition-all',
        alert && 'border-red-200 bg-red-50/50',
        className,
      )}
    >
      {Icon && (
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5', colors.bg)}>
          <Icon className={cn('h-4 w-4', colors.icon)} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground mb-0.5 truncate">{label}</p>
        <p className={cn('text-xl font-bold text-foreground leading-none', alert && 'text-red-600')}>{value}</p>
        {(sub || trend) && (
          <div className="flex items-center gap-2 mt-1">
            {trend && (
              <span className={cn('text-xs font-medium', trendUp ? 'text-emerald-600' : 'text-red-600')}>
                {trendUp ? '↑' : '↓'} {trend}
              </span>
            )}
            {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
          </div>
        )}
      </div>
    </Wrapper>
  )
}
