import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface StatusBarProps {
  steps: string[]
  current: string
  className?: string
}

export function StatusBar({ steps, current, className }: StatusBarProps) {
  const currentIdx = steps.indexOf(current)

  return (
    <div className={cn('flex items-center px-6 py-3 border-b border-border bg-muted/20', className)}>
      {steps.map((step, i) => {
        const isDone = i < currentIdx
        const isActive = i === currentIdx

        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-2">
              <div className={cn(
                'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all',
                isDone  ? 'bg-primary text-primary-foreground' :
                isActive ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' :
                           'bg-muted border-2 border-border text-muted-foreground',
              )}>
                {isDone ? <Check className="h-3.5 w-3.5" /> : <span>{i + 1}</span>}
              </div>
              <span className={cn(
                'text-sm font-medium',
                isActive ? 'text-foreground' : isDone ? 'text-foreground' : 'text-muted-foreground',
              )}>
                {step}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn('flex-1 h-px mx-3', i < currentIdx ? 'bg-primary' : 'bg-border')} />
            )}
          </div>
        )
      })}
    </div>
  )
}
