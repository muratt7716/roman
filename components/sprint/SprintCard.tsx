'use client'

import Link from 'next/link'
import { Zap, Users, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WritingSprint } from '@/types'

interface Props {
  sprint: WritingSprint
  isJoined?: boolean
}

export function SprintCard({ sprint, isJoined = false }: Props) {
  const now = new Date()
  const start = new Date(sprint.starts_at)
  const end = new Date(sprint.ends_at)

  const isActive = now >= start && now < end
  const isFinished = now >= end
  const minutesUntil = Math.max(0, Math.floor((start.getTime() - now.getTime()) / 60000))

  const timeLabel = isActive
    ? `Bitti: ${new Date(sprint.ends_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`
    : isFinished
      ? 'Sona Erdi'
      : minutesUntil <= 5
        ? `${minutesUntil} dk sonra başlıyor`
        : `${start.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`

  return (
    <Link
      href={`/sprint/${sprint.id}`}
      className={cn(
        'group relative glass-card rounded-2xl p-5 block border transition-all duration-300 overflow-hidden cursor-pointer hover:scale-[1.015]',
        isActive
          ? 'border-violet-500/40 shadow-[0_0_25px_rgba(124,58,237,0.15)] bg-gradient-to-br from-violet-500/5 to-transparent'
          : isFinished
            ? 'border-white/[0.04] opacity-70'
            : 'border-white/[0.05] hover:border-primary/25'
      )}
    >
      {isActive && (
        <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-violet-500" />
        </span>
      )}

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
              isActive ? 'bg-violet-500/20' : 'bg-white/[0.05]'
            )}
          >
            <Zap className={cn('w-4 h-4', isActive ? 'text-violet-400' : 'text-slate-400')} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-white text-sm line-clamp-1">{sprint.title}</p>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> {sprint.duration_minutes} dk · {timeLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <Users className="w-3.5 h-3.5" />
            {sprint.participant_count ?? 0} katılımcı
          </span>
          {isJoined && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Katıldın ✓
            </span>
          )}
          {isActive && !isJoined && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20 animate-pulse">
              Canlı
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
