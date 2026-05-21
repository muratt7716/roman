'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

const REACTIONS = [
  { key: 'fire', emoji: '🔥', label: 'Güçlü sahne' },
  { key: 'drop', emoji: '💧', label: 'Dokunan an' },
  { key: 'bolt', emoji: '⚡', label: 'Beklenmedi' },
] as const

interface Props {
  chapterId: string
  initialCounts: { fire: number; drop: number; bolt: number }
  initialUserReactions: string[]
}

export function ReactionBar({ chapterId, initialCounts, initialUserReactions }: Props) {
  const [counts, setCounts] = useState(initialCounts)
  const [userReactions, setUserReactions] = useState<string[]>(initialUserReactions)
  const [loading, setLoading] = useState<string | null>(null)

  async function toggle(reaction: string) {
    if (loading) return
    setLoading(reaction)
    try {
      const res = await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapter_id: chapterId, reaction }),
      })
      if (!res.ok) return
      const { active } = await res.json()
      setCounts(prev => ({
        ...prev,
        [reaction]: prev[reaction as keyof typeof prev] + (active ? 1 : -1),
      }))
      setUserReactions(prev =>
        active ? [...prev, reaction] : prev.filter(r => r !== reaction)
      )
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex items-center gap-3 py-6 border-t border-white/[0.06] mt-12">
      <span className="text-xs text-muted-foreground mr-1">Bu bölüm nasıldı?</span>
      {REACTIONS.map(({ key, emoji, label }) => {
        const active = userReactions.includes(key)
        return (
          <button
            key={key}
            onClick={() => toggle(key)}
            title={label}
            disabled={loading === key}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all duration-200',
              active
                ? 'border-primary/40 bg-primary/10 text-white scale-105'
                : 'border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:border-white/20 hover:text-white'
            )}
          >
            <span>{emoji}</span>
            <span className="text-xs font-medium">{counts[key as keyof typeof counts]}</span>
          </button>
        )
      })}
    </div>
  )
}
