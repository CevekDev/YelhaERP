import { TrendingDown, TrendingUp } from 'lucide-react'
import { formatDA } from '@/lib/algerian/format'

interface Props {
  currentYTD: number
  lastYearYTD: number
}

export function CAAlertBanner({ currentYTD, lastYearYTD }: Props) {
  if (lastYearYTD === 0) return null

  const diff = currentYTD - lastYearYTD
  const pct = Math.round((diff / lastYearYTD) * 100)
  const isDown = diff < 0

  if (!isDown && Math.abs(pct) < 5) return null // Only show if notable difference

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border text-sm ${
      isDown ? 'bg-red-50 border-red-200 text-red-800' : 'bg-green-50 border-green-200 text-green-800'
    }`}>
      {isDown ? <TrendingDown className="h-4 w-4 shrink-0" /> : <TrendingUp className="h-4 w-4 shrink-0" />}
      <span>
        CA YTD : <strong>{formatDA(currentYTD)}</strong> —&nbsp;
        {isDown ? 'en baisse de' : 'en hausse de'}&nbsp;
        <strong>{Math.abs(pct)}%</strong> par rapport à la même période l&apos;an dernier&nbsp;
        ({formatDA(lastYearYTD)})
      </span>
    </div>
  )
}
