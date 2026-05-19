'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useStreak } from '@/hooks/useStreak'
import { Flame } from 'lucide-react'

interface Presence {
  userId: string
  username: string
  displayName: string | null
  avatarUrl: string | null
}

interface Props {
  chapterId: string
  currentUser: { id: string; username: string; displayName: string | null; avatarUrl: string | null }
  wordCount: number
  initialWordCount: number
}

export function PresenceBar({ chapterId, currentUser, wordCount, initialWordCount }: Props) {
  const supabase = createClient()
  const [online, setOnline] = useState<Presence[]>([])
  const sessionWords = Math.max(0, wordCount - initialWordCount)
  const streak = useStreak(sessionWords > 0)

  useEffect(() => {
    const channel = supabase.channel(`chapter:${chapterId}`, {
      config: { presence: { key: currentUser.id } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<Presence>()
        const users = Object.values(state).flat() as Presence[]
        setOnline(users)
      })
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId: currentUser.id,
            username: currentUser.username,
            displayName: currentUser.displayName,
            avatarUrl: currentUser.avatarUrl,
          })
        }
      })

    return () => { supabase.removeChannel(channel) }
  }, [chapterId, currentUser, supabase])

  return (
    <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-surface text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="hidden sm:inline">Otomatik kaydediliyor</span>
      </span>

      <span className="mx-auto font-medium text-foreground/70 flex items-center gap-2">
        {wordCount.toLocaleString('tr')} kelime
        {sessionWords > 0 && (
          <span className="text-emerald-400 text-[10px]">+{sessionWords.toLocaleString('tr')} bu oturumda</span>
        )}
      </span>

      {streak.streak > 0 && (
        <span
          className="flex items-center gap-1 text-orange-400 font-medium shrink-0"
          title={`En yüksek seri: ${streak.best} gün`}
        >
          <Flame className="w-3 h-3" />
          {streak.streak}
        </span>
      )}

      <div className="flex items-center gap-1 shrink-0">
        {online.map(u => (
          <div
            key={u.userId}
            className="w-6 h-6 rounded-full bg-primary/30 flex items-center justify-center text-[10px] font-bold text-primary border border-primary/30"
            title={u.displayName ?? u.username}
          >
            {(u.displayName ?? u.username).charAt(0).toUpperCase()}
          </div>
        ))}
      </div>
    </div>
  )
}
