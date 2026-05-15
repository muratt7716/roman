'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

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
}

export function PresenceBar({ chapterId, currentUser, wordCount }: Props) {
  const supabase = createClient()
  const [online, setOnline] = useState<Presence[]>([])

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
      <span className="flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        Otomatik kaydediliyor
      </span>
      <span className="mx-auto font-medium text-foreground/70">{wordCount.toLocaleString('tr')} kelime</span>
      <div className="flex items-center gap-1">
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
