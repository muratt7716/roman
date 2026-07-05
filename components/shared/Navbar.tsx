'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LogOut, User, Bell, LayoutDashboard,
  Compass, Users, Lightbulb, Wand2, Menu, X, ChevronRight, Library,
  MessageSquarePlus, ShieldCheck, GraduationCap, Zap, BookOpen
} from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types'
import { FeedbackModal } from '@/components/FeedbackModal'

interface NavbarProps {
  profile?: Profile | null
  unreadCount?: number
  isAdmin?: boolean
}

export function Navbar({ profile, unreadCount = 0, isAdmin = false }: NavbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 transition-all duration-300">
        <div
          className={cn(
            'absolute inset-0 transition-all duration-500',
            scrolled || mobileMenuOpen
              ? 'bg-background/80 backdrop-blur-xl border-b border-white/[0.06] shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.01),0_4px_30px_rgba(0,0,0,0.4)]'
              : 'bg-transparent border-b border-transparent'
          )}
        />

        <div className="relative max-w-7xl mx-auto px-6 h-full flex items-center justify-between">

          <Link href="/" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex items-center gap-2.5 group font-sans" aria-label="Kalem Birliği anasayfa">
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

          <div className="flex items-center gap-2">
            {profile ? (
              <>
                {/* Desktop Nav links */}
                <div className="hidden md:flex items-center gap-1.5 mr-2">
                  {[
                    { href: '/explore',   label: 'Keşfet',   icon: <Compass className="w-4 h-4 text-primary" /> },
                    { href: '/kitaplik',  label: 'Kütüphane', icon: <Library className="w-4 h-4 text-amber-400" /> },
                    { href: '/writers',   label: 'Yazarlar',  icon: <Users className="w-4 h-4 text-pink-400" /> },
                    { href: '/classroom', label: 'Akademi',  icon: <GraduationCap className="w-4 h-4 text-violet-400" /> },
                    { href: '/sprint',    label: 'Sprint',   icon: <Zap className="w-4 h-4 text-amber-400" /> },
                    { href: '/dashboard', label: 'Panel',    icon: <LayoutDashboard className="w-4 h-4 text-sky-400" /> },
                  ].map(({ href, label, icon }) => (
                    <Link key={href} href={href} className={cn(
                      'flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-medium transition-all duration-300',
                      pathname === href
                        ? 'text-white bg-white/[0.04] border border-white/[0.06] shadow-inner'
                        : 'text-muted-foreground hover:text-white hover:bg-white/[0.02]'
                    )}>
                      {icon}{label}
                    </Link>
                  ))}
                </div>

                {/* Notification bell */}
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

                {/* Avatar Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger render={
                    <button className="ml-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background" aria-label="Hesap menüsü" />
                  }>
                    <Avatar className="w-8 h-8 ring-2 ring-white/[0.06] hover:ring-primary/50 transition-all duration-300">
                      <AvatarImage src={profile.avatar_url ?? undefined} className="object-cover" />
                      <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                        {profile.display_name?.[0] ?? profile.username[0]}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>

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
                      <Link href="/classroom" className="flex w-full items-center gap-2.5 text-[13px] text-muted-foreground hover:text-white font-medium">
                        <GraduationCap className="w-4 h-4 text-violet-400" /> Akademi
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem className="rounded-xl px-3 py-2 cursor-pointer hover:bg-white/[0.03]">
                      <Link href="/sprint" className="flex w-full items-center gap-2.5 text-[13px] text-muted-foreground hover:text-white font-medium">
                        <Zap className="w-4 h-4 text-amber-400" /> Sprint
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem className="rounded-xl px-3 py-2 cursor-pointer hover:bg-white/[0.03]">
                      <Link href={`/u/${profile.username}`} className="flex w-full items-center gap-2.5 text-[13px] text-muted-foreground hover:text-white font-medium">
                        <User className="w-4 h-4 text-violet-400" /> Profilim
                      </Link>
                    </DropdownMenuItem>

                    {isAdmin && (
                      <DropdownMenuItem className="rounded-xl px-3 py-2 cursor-pointer hover:bg-white/[0.03]">
                        <Link href="/admin" className="flex w-full items-center gap-2.5 text-[13px] text-amber-400 hover:text-amber-300 font-medium">
                          <ShieldCheck className="w-4 h-4" /> Admin Paneli
                        </Link>
                      </DropdownMenuItem>
                    )}

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
                      <Link href="/discover/magazines" className="flex w-full items-center gap-2.5 text-[13px] text-muted-foreground hover:text-white font-medium">
                        <BookOpen className="w-4 h-4 text-primary" /> Sınıf Dergileri
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="bg-white/[0.04] my-1" />

                    <DropdownMenuItem className="rounded-xl px-3 py-2 cursor-pointer hover:bg-white/[0.03]" onSelect={e => { e.preventDefault(); setFeedbackOpen(true) }}>
                      <span className="flex w-full items-center gap-2.5 text-[13px] text-muted-foreground hover:text-white font-medium">
                        <MessageSquarePlus className="w-4 h-4 text-sky-400" /> Geri Bildirim Gönder
                      </span>
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

                {/* Mobile hamburger */}
                <button
                  onClick={() => setMobileMenuOpen(v => !v)}
                  className="w-9 h-9 flex md:hidden items-center justify-center rounded-xl text-muted-foreground hover:text-white hover:bg-white/[0.02] border border-transparent hover:border-white/[0.04] transition-all duration-300"
                  aria-label="Menüyü Aç"
                >
                  {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-1.5">
                <div className="hidden md:flex items-center gap-1.5">
                  <Link href="/explore" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-[13px] font-medium text-muted-foreground hover:text-white hover:bg-white/[0.02] rounded-xl px-3 h-9 transition-colors')}>
                    Keşfet
                  </Link>
                  <Link href="/kitaplik" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-[13px] font-medium text-muted-foreground hover:text-white hover:bg-white/[0.02] rounded-xl px-3 h-9 transition-colors')}>
                    Kütüphane
                  </Link>
                  <Link href="/writers" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-[13px] font-medium text-muted-foreground hover:text-white hover:bg-white/[0.02] rounded-xl px-3 h-9 transition-colors')}>
                    Yazarlar
                  </Link>
                  <Link href="/login" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'text-[13px] font-medium text-muted-foreground hover:text-white hover:bg-white/[0.02] rounded-xl px-3.5 h-9 transition-colors')}>
                    Giriş Yap
                  </Link>
                </div>
                <Link href="/signup" className={cn(buttonVariants({ size: 'sm' }), 'bg-gradient-to-r from-primary to-indigo-600 text-white rounded-xl px-4 h-9 text-[13px] font-medium shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:brightness-110 hover:shadow-[0_0_25px_rgba(124,58,237,0.45)] transition-all')}>
                  Ücretsiz Başla
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(v => !v)}
                  className="w-9 h-9 flex md:hidden items-center justify-center rounded-xl text-muted-foreground hover:text-white hover:bg-white/[0.02] border border-transparent hover:border-white/[0.04] transition-all duration-300"
                  aria-label="Menüyü Aç"
                >
                  {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Feedback Modal — rendered outside dropdown so state persists */}
      {profile && <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />}

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="fixed inset-x-0 top-16 z-40 bg-background/95 backdrop-blur-xl border-b border-white/[0.06] shadow-[0_20px_50px_rgba(0,0,0,0.8)] py-6 px-6 flex flex-col gap-3 md:hidden max-h-[85vh] overflow-y-auto"
          >
            <div className="space-y-1">
              <span className="text-[10px] font-bold tracking-wider text-muted-foreground/60 uppercase block px-3 mb-2">Navigasyon</span>
              {[
                { href: '/explore', label: 'Keşfet', icon: <Compass className="w-4 h-4 text-primary" /> },
                { href: '/kitaplik', label: 'Kütüphane', icon: <Library className="w-4 h-4 text-amber-400" /> },
                { href: '/writers', label: 'Yazarlar', icon: <Users className="w-4 h-4 text-pink-400" /> },
                ...(profile ? [
                  { href: '/classroom', label: 'Akademi', icon: <GraduationCap className="w-4 h-4 text-violet-400" /> },
                  { href: '/sprint', label: 'Sprint', icon: <Zap className="w-4 h-4 text-amber-400" /> },
                  { href: '/dashboard', label: 'Panel', icon: <LayoutDashboard className="w-4 h-4 text-sky-400" /> }
                ] : []),
              ].map(({ href, label, icon }) => (
                <Link key={href} href={href} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/[0.03] text-sm text-muted-foreground hover:text-white transition-colors">
                  <span className="flex items-center gap-2">{icon}{label}</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                </Link>
              ))}
            </div>

            {profile && (
              <div className="border-t border-white/[0.04] pt-3 mt-1 space-y-1">
                <span className="text-[10px] font-bold tracking-wider text-muted-foreground/60 uppercase block px-3 mb-2">Yazar Araçları</span>
                {[
                  { href: '/fikir-odasi', label: 'Fikir Odası', icon: <Lightbulb className="w-4 h-4 text-amber-400" /> },
                  { href: '/jenerator', label: 'Karakter Jeneratörü', icon: <Wand2 className="w-4 h-4 text-violet-400" /> },
                ].map(({ href, label, icon }) => (
                  <Link key={href} href={href} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/[0.03] text-sm text-muted-foreground hover:text-white transition-colors">
                    <span className="flex items-center gap-2">{icon}{label}</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                  </Link>
                ))}
                <button
                  onClick={() => { setMobileMenuOpen(false); setFeedbackOpen(true) }}
                  className="flex w-full items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/[0.03] text-sm text-muted-foreground hover:text-white transition-colors"
                >
                  <span className="flex items-center gap-2"><MessageSquarePlus className="w-4 h-4 text-sky-400" />Geri Bildirim Gönder</span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                </button>
                {isAdmin && (
                  <Link href="/admin" className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-amber-500/10 text-sm transition-colors">
                    <span className="flex items-center gap-2 text-amber-400"><ShieldCheck className="w-4 h-4" />Admin Paneli</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-50 text-amber-400" />
                  </Link>
                )}
              </div>
            )}

            {!profile && (
              <div className="border-t border-white/[0.04] pt-4 mt-2 flex flex-col gap-2">
                <Link href="/login" className="w-full text-center py-2.5 rounded-xl border border-white/[0.06] hover:bg-white/[0.03] text-sm text-muted-foreground hover:text-white transition-all font-medium">
                  Giriş Yap
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
