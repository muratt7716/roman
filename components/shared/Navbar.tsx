'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { PenLine, LogOut, User, Bell, LayoutDashboard, Compass, Users, Lightbulb, Wand2, Gamepad2 } from 'lucide-react'
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
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 transition-all duration-300">
      {/* Dynamic ultra-frosted dark glass background */}
      <div className="absolute inset-0 bg-background/70 backdrop-blur-md border-b border-white/[0.04] shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.01),0_4px_30px_rgba(0,0,0,0.4)]" />

      <div className="relative max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
        
        {/* Sleek Branding / Logo */}
        <Link href="/" className="flex items-center gap-2.5 group font-sans" aria-label="Kalem Birliği anasayfa">
          <img 
            src="/logo.png" 
            className="w-8 h-8 rounded-xl object-cover border border-white/[0.08] shadow-[0_0_16px_rgba(124,58,237,0.2)] group-hover:scale-105 group-hover:shadow-[0_0_22px_rgba(124,58,237,0.45)] transition-all duration-300" 
            alt="Kalem Birliği Logo" 
          />
          <div className="flex flex-col">
            <span className="font-display font-semibold text-[15px] tracking-wide text-white leading-tight">
              Kalem Birliği
            </span>
            <span className="text-[9px] text-muted-foreground/80 font-medium tracking-widest uppercase mt-0.5 leading-none">
              Ortak Kurgu Ağı
            </span>
          </div>
        </Link>

        {/* Navigation Core links */}
        <div className="flex items-center gap-2">
          {profile ? (
            <>
              {/* Nav links */}
              <div className="hidden md:flex items-center gap-1.5 mr-2">
                <Link
                  href="/explore"
                  className={cn(
                    'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-medium transition-all duration-300',
                    pathname === '/explore'
                      ? 'text-white bg-white/[0.04] border border-white/[0.06] shadow-inner'
                      : 'text-muted-foreground hover:text-white hover:bg-white/[0.02]'
                  )}
                >
                  <Compass className="w-4 h-4 text-primary" />
                  Keşfet
                </Link>
                <Link
                  href="/writers"
                  className={cn(
                    'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-medium transition-all duration-300',
                    pathname === '/writers'
                      ? 'text-white bg-white/[0.04] border border-white/[0.06] shadow-inner'
                      : 'text-muted-foreground hover:text-white hover:bg-white/[0.02]'
                  )}
                >
                  <Users className="w-4 h-4 text-pink-400" />
                  Yazarlar
                </Link>
                <Link
                  href="/dashboard"
                  className={cn(
                    'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-medium transition-all duration-300',
                    pathname === '/dashboard'
                      ? 'text-white bg-white/[0.04] border border-white/[0.06] shadow-inner'
                      : 'text-muted-foreground hover:text-white hover:bg-white/[0.02]'
                  )}
                >
                  <LayoutDashboard className="w-4 h-4 text-sky-400" />
                  Panel
                </Link>
              </div>

              {/* Notification bell with micro-pulse */}
              <Link
                href="/notifications"
                aria-label={unreadCount > 0 ? `${unreadCount} okunmamış bildirim` : 'Bildirimler'}
                className={cn(
                  'relative w-9 h-9 flex items-center justify-center rounded-xl transition-all duration-300 border border-transparent',
                  pathname === '/notifications'
                    ? 'text-white bg-white/[0.04] border-white/[0.06]'
                    : 'text-muted-foreground hover:text-white hover:bg-white/[0.02] hover:border-white/[0.04]'
                )}
              >
                <Bell className="w-4 h-4 transition-transform duration-300 hover:rotate-12" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-gradient-to-r from-primary to-pink-500 text-[9px] font-bold text-white flex items-center justify-center shadow-[0_0_10px_rgba(124,58,237,0.5)]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Link>

              {/* Frosted Dropdown Trigger */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      className="ml-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      aria-label="Hesap menüsü"
                    />
                  }
                >
                  <Avatar className="w-8 h-8 ring-2 ring-white/[0.06] hover:ring-primary/50 transition-all duration-300">
                    <AvatarImage src={profile.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                      {profile.display_name?.[0] ?? profile.username[0]}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                
                {/* Ultra-frosted dark glass dropdown */}
                <DropdownMenuContent align="end" className="w-56 bg-background/90 backdrop-blur-xl border border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.6)] p-1.5 rounded-2xl">
                  <div className="px-3 py-2.5 border-b border-white/[0.04] mb-1">
                    <span className="text-[9px] font-bold tracking-wider text-muted-foreground/60 uppercase block mb-1">Yazar Hesabı</span>
                    <p className="text-sm font-semibold text-white truncate">{profile.display_name ?? profile.username}</p>
                    <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>
                  </div>
                  
                  <DropdownMenuItem className="rounded-xl px-3 py-2 cursor-pointer hover:bg-white/[0.03]">
                    <Link href="/dashboard" className="flex w-full items-center gap-2.5 text-[13px] text-muted-foreground hover:text-white font-medium">
                      <LayoutDashboard className="w-4 h-4 text-sky-400" /> Panel
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem className="rounded-xl px-3 py-2 cursor-pointer hover:bg-white/[0.03]">
                    <Link href={`/u/${profile.username}`} className="flex w-full items-center gap-2.5 text-[13px] text-muted-foreground hover:text-white font-medium">
                      <User className="w-4 h-4 text-violet-400" /> Profilim
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator className="bg-white/[0.04] my-1" />

                  <DropdownMenuItem className="rounded-xl px-3 py-2 cursor-pointer hover:bg-white/[0.03]">
                    <Link href="/fikir-odasi" className="flex w-full items-center gap-2.5 text-[13px] text-muted-foreground hover:text-white font-medium">
                      <Lightbulb className="w-4 h-4 text-amber-400" /> Fikir Odası
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem className="rounded-xl px-3 py-2 cursor-pointer hover:bg-white/[0.03]">
                    <Link href="/jenerator" className="flex w-full items-center gap-2.5 text-[13px] text-muted-foreground hover:text-white font-medium">
                      <Wand2 className="w-4 h-4 text-violet-400" /> Karakter Jeneratörü
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem className="rounded-xl px-3 py-2 cursor-pointer hover:bg-white/[0.03]">
                    <Link href="/oyun" className="flex w-full items-center gap-2.5 text-[13px] text-muted-foreground hover:text-white font-medium">
                      <Gamepad2 className="w-4 h-4 text-emerald-400" /> Kelime Oyunu
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-white/[0.04] my-1" />

                  <DropdownMenuItem className="rounded-xl px-3 py-2 cursor-pointer hover:bg-white/[0.03]">
                    <Link href="/settings" className="flex w-full items-center gap-2.5 text-[13px] text-muted-foreground hover:text-white font-medium">
                      Ayarlar
                    </Link>
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator className="bg-white/[0.04] my-1" />
                  
                  <DropdownMenuItem onClick={signOut} className="rounded-xl px-3 py-2 cursor-pointer hover:bg-destructive/10 text-destructive focus:bg-destructive/10">
                    <div className="flex w-full items-center gap-2.5 text-[13px] font-medium">
                      <LogOut className="w-4 h-4" /> Çıkış Yap
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              {/* Unlogged Navigation Links */}
              <div className="flex items-center gap-1.5">
                <Link 
                  href="/explore" 
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'sm' }), 
                    'text-[13px] font-medium text-muted-foreground hover:text-white hover:bg-white/[0.02] rounded-xl px-3 h-9 transition-colors'
                  )}
                >
                  Keşfet
                </Link>
                <Link 
                  href="/writers" 
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'sm' }), 
                    'text-[13px] font-medium text-muted-foreground hover:text-white hover:bg-white/[0.02] rounded-xl px-3 h-9 transition-colors hidden sm:flex'
                  )}
                >
                  Yazarlar
                </Link>
                <Link 
                  href="/login" 
                  className={cn(
                    buttonVariants({ variant: 'ghost', size: 'sm' }), 
                    'text-[13px] font-medium text-muted-foreground hover:text-white hover:bg-white/[0.02] rounded-xl px-3.5 h-9 transition-colors'
                  )}
                >
                  Giriş Yap
                </Link>
                <Link 
                  href="/signup" 
                  className={cn(
                    buttonVariants({ size: 'sm' }), 
                    'bg-gradient-to-r from-primary to-indigo-600 text-white rounded-xl px-4 h-9 text-[13px] font-medium shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:brightness-110 hover:shadow-[0_0_25px_rgba(124,58,237,0.45)] transition-all'
                  )}
                >
                  Ücretsiz Başla
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
