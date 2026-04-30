import { cn } from '@/lib/utils'

interface ProgressRingProps {
  value: number // 0-100
  size?: number
  strokeWidth?: number
  color?: string
  label?: string
  sublabel?: string
  className?: string
}

export function ProgressRing({
  value,
  size = 80,
  strokeWidth = 8,
  color = 'text-primary',
  label,
  sublabel,
  className,
}: ProgressRingProps) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const filled = circ * (1 - Math.min(Math.max(value, 0), 100) / 100)

  return (
    <div className={cn('inline-flex flex-col items-center gap-1', className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Track */}
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted"
          />
          {/* Progress */}
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeDasharray={circ}
            strokeDashoffset={filled}
            strokeLinecap="round"
            className={cn('transition-all', color)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold text-foreground">{Math.round(value)}%</span>
        </div>
      </div>
      {label && <span className="text-xs font-medium text-foreground text-center">{label}</span>}
      {sublabel && <span className="text-xs text-muted-foreground text-center">{sublabel}</span>}
    </div>
  )
}
