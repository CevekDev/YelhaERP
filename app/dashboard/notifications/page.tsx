'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Bell, CheckCheck } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface Notification {
  id: string; type: string; title: string; message: string
  isRead: boolean; priority: string; actionUrl?: string; createdAt: string
}

const PRIORITY_VARIANTS: Record<string, 'destructive' | 'warning' | 'info' | 'secondary'> = {
  URGENT: 'destructive', HIGH: 'warning', NORMAL: 'info', LOW: 'secondary',
}
const PRIORITY_LABELS: Record<string, string> = {
  URGENT: 'Urgent', HIGH: 'Haute', NORMAL: 'Normale', LOW: 'Basse',
}
const TYPE_ICONS: Record<string, string> = {
  INVOICE_OVERDUE: '💸', QUOTE_EXPIRING: '📋', STOCK_ALERT: '📦',
  CASHFLOW_WARNING: '⚠️', FISCAL_DEADLINE: '📅', ANOMALY: '🔍', AI_INSIGHT: '🤖',
}
const TYPE_LABELS: Record<string, string> = {
  INVOICE_OVERDUE: 'Facture en retard', QUOTE_EXPIRING: 'Devis expirant',
  STOCK_ALERT: 'Alerte stock', CASHFLOW_WARNING: 'Trésorerie',
  FISCAL_DEADLINE: 'Échéance fiscale', ANOMALY: 'Anomalie', AI_INSIGHT: 'IA',
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/notifications')
    if (res.ok) {
      const d = await res.json()
      setNotifications(d.notifications ?? [])
      setUnreadCount(d.unreadCount ?? 0)
    } else toast.error('Erreur chargement')
    setLoading(false)
  }, [])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'POST' })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const markAllRead = async () => {
    await fetch('/api/notifications/read-all', { method: 'POST' })
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    setUnreadCount(0)
    toast.success('Toutes les notifications marquées comme lues')
  }

  return (
    <div>
      <Header title="Notifications" />
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <PageHeader title="Notifications" description={`${unreadCount} non lue${unreadCount !== 1 ? 's' : ''}`} />
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" className="gap-2" onClick={markAllRead}>
              <CheckCheck className="h-4 w-4" />Tout marquer lu
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="py-12 text-center text-muted-foreground">Chargement...</div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                <p className="text-muted-foreground">Aucune notification</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map(n => (
                  <div key={n.id} className={cn('flex items-start gap-4 p-4 hover:bg-slate-50 transition-colors', !n.isRead && 'bg-blue-50/40')}>
                    <div className="text-2xl mt-0.5">{TYPE_ICONS[n.type] ?? '🔔'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn('font-medium text-sm', !n.isRead && 'font-semibold')}>{n.title}</span>
                        <Badge variant={PRIORITY_VARIANTS[n.priority] ?? 'secondary'} className="text-[10px] px-1.5 py-0">
                          {PRIORITY_LABELS[n.priority] ?? n.priority}
                        </Badge>
                        <span className="text-xs text-muted-foreground bg-slate-100 rounded-full px-2 py-0.5">
                          {TYPE_LABELS[n.type] ?? n.type}
                        </span>
                        {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-muted-foreground">
                          {new Date(n.createdAt).toLocaleDateString('fr-DZ', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {n.actionUrl && (
                          <Link href={n.actionUrl} className="text-xs text-yelha-600 hover:underline">
                            Voir →
                          </Link>
                        )}
                        {!n.isRead && (
                          <button className="text-xs text-slate-500 hover:text-slate-700 hover:underline" onClick={() => markRead(n.id)}>
                            Marquer comme lu
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
