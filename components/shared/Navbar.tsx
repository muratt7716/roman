'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { PenLine, LogOut, User, Bell, LayoutDashboard, Compass, Users } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types'

interface NavbarProps {
  profile?: Profile | null
  unreadCount?: number
}

export function Navbar({ profile, unreadCount = 0 }: NavbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14">
      {/* Glass background */}
      <div className="absolute inset-0 bg-[hsl(245_25%_4%/0.8)] backdrop-blur-xl border-b border-white/[0.06]" />

      <div className="relative max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-display font-bold text-lg group" aria-label="Kalem Birliği anasayfa">
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
            <PenLine className="w-4 h-4 text-primary" />
          </div>
          <span className="text-gradient hidden sm:block">Kalem Birliği</span>
        </Link>

        <div className="flex items-center gap-1">
          {profile ? (
            <>
              {/* Nav links */}
              <Link
                href="/explore"
                className={cn(
                  'hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-200',
                  pathname === '/explore'
                    ? 'text-foreground bg-white/8'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                )}
              >
                <Compass className="w-3.5 h-3.5" />
                Keşfet
              </Link>
              <Link
                href="/writers"
                className={cn(
                  'hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-200',
                  pathname === '/writers'
                    ? 'text-foreground bg-white/8'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                )}
              >
                <Users className="w-3.5 h-3.5" />
                Yazarlar
              </Link>
              <Link
                href="/dashboard"
                className={cn(
                  'hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-200',
                  pathname === '/dashboard'
                    ? 'text-foreground bg-white/8'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                )}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                Dashboard
              </Link>

              {/* Notification bell */}
              <Link
                href="/notifications"
                aria-label={unreadCount > 0 ? `${unreadCount} okunmamış bildirim` : 'Bildirimler'}
                className={cn(
                  'relative w-9 h-9 flex items-center justify-center rounded-lg transition-all duration-200',
                  pathname === '/notifications'
                    ? 'text-foreground bg-white/8'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                )}
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary text-[9px] font-bold text-white flex items-center justify-center shadow-[0_0_8px_rgba(124,58,237,0.6)]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              {/* Avatar dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      className="ml-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Hesap menüsü"
                    />
                  }
                >
                  <Avatar className="w-8 h-8 ring-2 ring-transparent hover:ring-primary/40 transition-all duration-200">
                    <AvatarImage src={profile.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                      {profile.display_name?.[0] ?? profile.username[0]}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 bg-[hsl(245_22%_8%)] border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.6)]">
                  <div className="px-3 py-2 border-b border-white/5">
                    <p className="text-sm font-medium truncate">{profile.display_name ?? profile.username}</p>
                    <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>
                  </div>
                  <DropdownMenuItem>
                    <Link href="/dashboard" className="flex w-full items-center gap-2 cursor-pointer">
                      <LayoutDashboard className="w-4 h-4" /> Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href={`/u/${profile.username}`} className="flex w-full cursor-pointer items-center gap-2">
                      <User className="w-4 h-4" /> Profil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/5" />
                  <DropdownMenuItem>
                    <Link href="/settings" className="flex w-full cursor-pointer">Ayarlar</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/5" />
                  <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer gap-2">
                    <LogOut className="w-4 h-4" /> Çıkış Yap
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link href="/explore" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-muted-foreground hover:text-foreground')}>
                Keşfet
              </Link>
              <Link href="/writers" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-muted-foreground hover:text-foreground hidden sm:flex')}>
                Yazarlar
              </Link>
              <Link href="/login" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-muted-foreground hover:text-foreground')}>
                Giriş Yap
              </Link>
              <Link href="/signup" className={cn(buttonVariants({ size: 'sm' }), 'bg-primary hover:bg-primary/90 text-white shadow-[0_0_16px_rgba(124,58,237,0.35)] transition-shadow hover:shadow-[0_0_20px_rgba(124,58,237,0.5)]')}>
                Başla
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
