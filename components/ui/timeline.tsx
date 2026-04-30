import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

export interface TimelineItem {
  id: string
  icon?: LucideIcon
  iconColor?: string
  title: string
  description?: string
  date: string
  user?: string
}

interface TimelineProps {
  items: TimelineItem[]
  className?: string
}

export function Timeline({ items, className }: TimelineProps) {
  return (
    <div className={cn('space-y-0', className)}>
      {items.map((item, i) => {
        const Icon = item.icon
        const isLast = i === items.length - 1

        return (
          <div key={item.id} className="flex gap-3">
            {/* Icon + line */}
            <div className="flex flex-col items-center">
              <div className={cn(
                'w-7 h-7 rounded-full border-2 border-background flex items-center justify-center shrink-0 z-10',
                item.iconColor ?? 'bg-muted border-border',
              )}>
                {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
              </div>
              {!isLast && <div className="w-px flex-1 bg-border my-1" />}
            </div>

            {/* Content */}
            <div className={cn('flex-1 pb-4', isLast && 'pb-0')}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-foreground">{item.title}</p>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{item.date}</span>
              </div>
              {item.description && (
                <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>
              )}
              {item.user && (
                <p className="text-xs text-muted-foreground/70 mt-0.5">par {item.user}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
