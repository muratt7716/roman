'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PenLine, LogOut, User, Bell } from 'lucide-react'
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
}

export function Navbar({ profile }: NavbarProps) {
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-display font-bold text-lg">
          <PenLine className="w-5 h-5 text-primary" />
          <span className="text-gradient">Writer Squad</span>
        </Link>

        <div className="flex items-center gap-2">
          {profile ? (
            <>
              <Link
                href="/explore"
                className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
              >
                Keşfet
              </Link>
              <Link
                href="/notifications"
                aria-label="Bildirimler"
                className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))}
              >
                <Bell className="w-4 h-4" />
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'rounded-full')}
                      aria-label="Hesap menüsü"
                    />
                  }
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={profile.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {profile.display_name?.[0] ?? profile.username[0]}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-surface border-border">
                  <DropdownMenuItem>
                    <Link href="/dashboard" className="flex w-full cursor-pointer">Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Link href={`/u/${profile.username}`} className="flex w-full cursor-pointer items-center">
                      <User className="w-4 h-4 mr-2" /> Profil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Link href="/settings" className="flex w-full cursor-pointer">Ayarlar</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer">
                    <LogOut className="w-4 h-4 mr-2" /> Çıkış Yap
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Link
                href="/explore"
                className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
              >
                Keşfet
              </Link>
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}
              >
                Giriş Yap
              </Link>
              <Link
                href="/signup"
                className={cn(buttonVariants({ size: 'sm' }))}
              >
                Başla
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
