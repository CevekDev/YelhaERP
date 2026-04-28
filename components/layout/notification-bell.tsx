'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

interface Notification {
  id: string; type: string; title: string; message: string
  isRead: boolean; priority: string; actionUrl?: string; createdAt: string
}

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: 'bg-red-500', HIGH: 'bg-orange-500', NORMAL: 'bg-blue-500', LOW: 'bg-slate-400',
}
const TYPE_ICONS: Record<string, string> = {
  INVOICE_OVERDUE: '💸', QUOTE_EXPIRING: '📋', STOCK_ALERT: '📦',
  CASHFLOW_WARNING: '⚠️', FISCAL_DEADLINE: '📅', ANOMALY: '🔍',
  AI_INSIGHT: '🤖',
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)

  const fetchNotifications = useCallback(async () => {
    const res = await fetch('/api/notifications')
    if (!res.ok) return
    const d = await res.json()
    setNotifications(d.notifications ?? [])
    setUnreadCount(d.unreadCount ?? 0)
  }, [])

  useEffect(() => {
    fetchNotifications()
    // Refresh every 5 minutes
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  const markRead = async (id: string) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'POST' })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const markAllRead = async () => {
    await fetch('/api/notifications/read-all', { method: 'POST' })
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    setUnreadCount(0)
  }

  const recent = notifications.slice(0, 8)

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-slate-700">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <button className="text-xs text-yelha-600 hover:underline font-normal" onClick={markAllRead}>
              Tout marquer lu
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {recent.length === 0 ? (
          <div className="py-6 text-center">
            <Bell className="h-8 w-8 text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Aucune notification</p>
          </div>
        ) : (
          recent.map(n => (
            <DropdownMenuItem key={n.id} asChild onClick={() => !n.isRead && markRead(n.id)}>
              <Link
                href={n.actionUrl ?? '/dashboard/notifications'}
                className={cn('flex items-start gap-3 p-2.5 cursor-pointer', !n.isRead && 'bg-blue-50/50')}
              >
                <div className="mt-0.5 flex-shrink-0">
                  <div className={cn('w-2 h-2 rounded-full mt-1.5', PRIORITY_COLORS[n.priority] ?? 'bg-slate-400')} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span>{TYPE_ICONS[n.type] ?? '🔔'}</span>
                    <p className={cn('text-sm truncate', !n.isRead && 'font-semibold')}>{n.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(n.createdAt).toLocaleDateString('fr-DZ')}
                  </p>
                </div>
              </Link>
            </DropdownMenuItem>
          ))
        )}
        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/notifications" className="text-center text-sm text-yelha-600 hover:underline w-full flex justify-center py-1">
                Voir toutes les notifications
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
