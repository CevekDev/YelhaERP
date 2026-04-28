'use client'

import { useSession } from 'next-auth/react'
import { Bell, Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { useT } from '@/lib/i18n'

interface HeaderProps { title: string }

export function Header({ title }: HeaderProps) {
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const { t } = useT()

  const initials = (session?.user?.name ?? 'U')
    .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-6 sticky top-0 z-30">
      <h1 className="text-lg font-semibold">{title}</h1>
      <div className="flex items-center gap-2">
        <LanguageSwitcher />

        <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title={theme === 'dark' ? t('header.theme_light') : t('header.theme_dark')}>
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <Button variant="ghost" size="icon" title={t('header.notifications')}>
          <Bell className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <div className="w-8 h-8 rounded-full bg-yelha-500 flex items-center justify-center text-white text-xs font-semibold">
                {initials}
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>
              <p className="font-medium truncate">{session?.user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>{t('header.profile')}</DropdownMenuItem>
            <DropdownMenuItem>{t('header.settings')}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
