'use client'

import { Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SprintParticipant } from '@/types'

interface Props {
  participants: SprintParticipant[]
  currentUserId: string
}

export function SprintLeaderboard({ participants, currentUserId }: Props) {
  const sorted = [...participants]
    .filter((p) => p.finished_at !== null)
    .sort((a, b) => b.word_count - a.word_count)

  if (sorted.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-6 border border-white/[0.05] text-center text-slate-400 text-sm">
        Henüz kimse sprint&apos;i tamamlamadı.
      </div>
    )
  }

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="glass-card rounded-2xl border border-white/[0.05] overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.05] flex items-center gap-2">
        <Trophy className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-bold text-white">Sprint Sıralaması</span>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {sorted.map((p, i) => {
          const isMe = p.user_id === currentUserId
          return (
            <div
              key={p.user_id}
              className={cn(
                'flex items-center gap-3 px-5 py-3 text-sm transition-colors',
                isMe ? 'bg-primary/5 border-l-2 border-primary' : 'hover:bg-white/[0.02]'
              )}
            >
              <span className="text-base w-6 shrink-0 text-center">{medals[i] ?? `${i + 1}.`}</span>
              <div className="flex-1 min-w-0">
                <p className={cn('font-medium truncate', isMe ? 'text-primary' : 'text-white')}>
                  {p.profile?.display_name ?? p.profile?.username ?? 'Yazar'}
                  {isMe && <span className="text-xs text-primary/70 ml-1">(sen)</span>}
                </p>
              </div>
              <span className="font-bold text-emerald-400 shrink-0">
                {p.word_count} <span className="text-xs font-normal text-slate-400">kelime</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
