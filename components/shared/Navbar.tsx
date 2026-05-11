'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PenLine, LogOut, User, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
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
              <Button variant="ghost" size="sm" asChild>
                <Link href="/explore">Keşfet</Link>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link href="/notifications" aria-label="Bildirimler">
                  <Bell className="w-4 h-4" />
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full" aria-label="Hesap menüsü">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={profile.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary text-xs">
                        {profile.display_name?.[0] ?? profile.username[0]}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-surface border-border">
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="cursor-pointer">Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/u/${profile.username}`} className="cursor-pointer">
                      <User className="w-4 h-4 mr-2" /> Profil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="cursor-pointer">Ayarlar</Link>
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
              <Button variant="ghost" size="sm" asChild>
                <Link href="/explore">Keşfet</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Giriş Yap</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/signup">Başla</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
