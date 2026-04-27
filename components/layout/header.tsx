'use client'

import { useSession } from 'next-auth/react'
import { Bell, Sun, Moon, Globe } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface HeaderProps {
  title: string
  onToggleRTL?: () => void
  isRTL?: boolean
}

function Avatar_({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  return (
    <div className="w-8 h-8 rounded-full bg-yelha-500 flex items-center justify-center text-white text-xs font-semibold">
      {initials}
    </div>
  )
}

export function Header({ title, onToggleRTL, isRTL }: HeaderProps) {
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-6 sticky top-0 z-30">
      <h1 className="text-lg font-semibold">{title}</h1>
      <div className="flex items-center gap-2">
        {/* RTL toggle */}
        {onToggleRTL && (
          <Button variant="ghost" size="icon" onClick={onToggleRTL} title="Changer de langue">
            <Globe className="h-4 w-4" />
          </Button>
        )}

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Notifications placeholder */}
        <Button variant="ghost" size="icon">
          <Bell className="h-4 w-4" />
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar_ name={session?.user?.name ?? 'U'} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>
              <p className="font-medium truncate">{session?.user?.name}</p>
              <p className="text-xs text-muted-foreground truncate">{session?.user?.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profil</DropdownMenuItem>
            <DropdownMenuItem>Paramètres</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
