'use client'

import { cn } from '@/lib/utils'
import { LayoutList, Kanban, Calendar } from 'lucide-react'

type ViewType = 'list' | 'kanban' | 'calendar'

interface ViewToggleProps {
  value: ViewType
  onChange: (v: ViewType) => void
  options?: ViewType[]
  className?: string
}

const ICONS: Record<ViewType, React.ElementType> = {
  list: LayoutList,
  kanban: Kanban,
  calendar: Calendar,
}

const LABELS: Record<ViewType, string> = {
  list: 'Liste',
  kanban: 'Kanban',
  calendar: 'Calendrier',
}

export function ViewToggle({ value, onChange, options = ['list', 'kanban'], className }: ViewToggleProps) {
  return (
    <div className={cn('flex items-center bg-muted rounded-lg p-0.5 gap-0.5', className)}>
      {options.map(opt => {
        const Icon = ICONS[opt]
        return (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            title={LABELS[opt]}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all',
              value === opt
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{LABELS[opt]}</span>
          </button>
        )
      })}
    </div>
  )
}
