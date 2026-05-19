'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ExternalLink } from 'lucide-react'

interface MemberHoverCardProps {
  username?: string | null
  displayName?: string | null
  avatarUrl?: string | null
  roleName?: string | null
  wordCount: number
  isOwner?: boolean
}

export function MemberHoverCard({ username, displayName, avatarUrl, roleName, wordCount, isOwner }: MemberHoverCardProps) {
  const [open, setOpen] = useState(false)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const name = displayName ?? username ?? 'Kullanıcı'
  const role = roleName ?? (isOwner ? 'Baş Yazar' : 'Üye')
  const profileHref = username ? `/u/${username}` : null

  function handleMouseEnter() {
    if (closeTimer.current) clearTimeout(closeTimer.current)
    setOpen(true)
  }

  function handleMouseLeave() {
    closeTimer.current = setTimeout(() => setOpen(false), 120)
  }

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Member card */}
      <div className={`flex items-center gap-3 glass rounded-xl p-3 cursor-pointer transition-all duration-200 ${open ? 'ring-1 ring-primary/40 bg-primary/[0.06]' : 'hover:ring-1 hover:ring-white/15 hover:bg-white/[0.03]'}`}>
        <Avatar className="w-10 h-10 shrink-0">
          <AvatarImage src={avatarUrl ?? undefined} />
          <AvatarFallback className="bg-primary/20 text-primary font-semibold">
            {name[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{name}</p>
          <p className="text-xs text-muted-foreground">{role}</p>
        </div>
        <div className="ml-auto text-right shrink-0">
          <p className="text-xs font-medium tabular-nums">{wordCount.toLocaleString('tr')}</p>
          <p className="text-[10px] text-muted-foreground">kelime</p>
        </div>
      </div>

      {/* Hover popup */}
      {open && (
        <div
          className="absolute bottom-full left-0 right-0 mb-2 z-50"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div className="glass-strong rounded-xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-white/10 space-y-3 animate-in fade-in slide-in-from-bottom-1 duration-150">
            <div className="flex items-center gap-3">
              <Avatar className="w-12 h-12 ring-2 ring-primary/20">
                <AvatarImage src={avatarUrl ?? undefined} />
                <AvatarFallback className="bg-primary/20 text-primary font-bold text-lg">
                  {name[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold text-sm">{name}</p>
                {username && <p className="text-xs text-muted-foreground">@{username}</p>}
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/20 font-medium">
                {role}
              </span>
              <span className="text-muted-foreground tabular-nums">
                {wordCount.toLocaleString('tr')} kelime
              </span>
            </div>

            {profileHref ? (
              <Link
                href={profileHref}
                className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 text-xs font-medium transition-colors border border-primary/20"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Profili Görüntüle
              </Link>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-1">Profil sayfası yok</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
