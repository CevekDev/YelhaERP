import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FilterChipProps {
  label: string
  value?: string
  onRemove: () => void
  className?: string
}

export function FilterChip({ label, value, onRemove, className }: FilterChipProps) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-medium px-2.5 py-1',
      className,
    )}>
      <span className="text-muted-foreground">{label}:</span>
      <span>{value}</span>
      <button
        onClick={onRemove}
        className="rounded-full hover:bg-primary/20 p-0.5 transition-colors ml-0.5"
        aria-label={`Retirer filtre ${label}`}
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </span>
  )
}
