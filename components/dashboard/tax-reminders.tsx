import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getG50Deadline, getCNASDeadline } from '@/lib/algerian/tax'
import { AlertCircle, CheckCircle } from 'lucide-react'

interface TaxRemindersProps {
  companyId: string
}

export function TaxReminders({ companyId: _ }: TaxRemindersProps) {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const g50 = getG50Deadline(year, month)
  const cnas = getCNASDeadline(year, month)

  const daysUntilG50 = Math.ceil((g50.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  const daysUntilCNAS = Math.ceil((cnas.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  const reminders = [
    {
      label: 'Déclaration G50 (TVA)',
      deadline: g50,
      daysLeft: daysUntilG50,
    },
    {
      label: 'Déclaration CNAS',
      deadline: cnas,
      daysLeft: daysUntilCNAS,
    },
  ]

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Échéances fiscales</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {reminders.map(r => {
          const isUrgent = r.daysLeft <= 5
          const isPast = r.daysLeft < 0
          return (
            <div key={r.label} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              {isPast ? (
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
              ) : isUrgent ? (
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle className="h-4 w-4 text-yelha-500 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{r.label}</p>
                <p className="text-xs text-muted-foreground">
                  {r.deadline.toLocaleDateString('fr-DZ')}
                </p>
              </div>
              <Badge
                variant={isPast ? 'destructive' : isUrgent ? 'warning' : 'secondary'}
                className="shrink-0"
              >
                {isPast ? 'Dépassé' : `J-${r.daysLeft}`}
              </Badge>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
