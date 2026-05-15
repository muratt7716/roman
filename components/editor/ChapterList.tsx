'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronUp, ChevronDown, FileText, Clock, CheckCircle, Lightbulb } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Chapter } from '@/types'

const STATUS_CONFIG = {
  draft:  { label: 'Taslak',     icon: FileText,      color: 'text-muted-foreground bg-surface-2',         ring: 'hover:ring-white/20' },
  review: { label: 'İncelemede', icon: Clock,         color: 'text-amber-400 bg-amber-400/10',             ring: 'hover:ring-amber-400/30' },
  final:  { label: 'Final',      icon: CheckCircle,   color: 'text-emerald-400 bg-emerald-400/10',         ring: 'hover:ring-emerald-400/30' },
}

const STATUS_CYCLE: Record<string, string> = { draft: 'review', review: 'final', final: 'draft' }

interface Props {
  chapters: Chapter[]
  projectId: string
  suggestionCounts?: Record<string, number>
}

export function ChapterList({ chapters: initial, projectId, suggestionCounts = {} }: Props) {
  const [chapters, setChapters] = useState<Chapter[]>(initial)
  const [moving, setMoving] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function cycleStatus(id: string, current: string) {
    const next = STATUS_CYCLE[current] as Chapter['status']
    setChapters(prev => prev.map(c => c.id === id ? { ...c, status: next } : c))
    await supabase.from('chapters').update({ status: next }).eq('id', id)
  }

  async function move(id: string, direction: 'up' | 'down') {
    const idx = chapters.findIndex(c => c.id === id)
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === chapters.length - 1) return

    setMoving(id)

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    const a = chapters[idx]
    const b = chapters[swapIdx]

    // Optimistic update
    const updated = [...chapters]
    updated[idx] = { ...a, order_index: b.order_index }
    updated[swapIdx] = { ...b, order_index: a.order_index }
    updated.sort((x, y) => x.order_index - y.order_index)
    setChapters(updated)

    await Promise.all([
      supabase.from('chapters').update({ order_index: b.order_index }).eq('id', a.id),
      supabase.from('chapters').update({ order_index: a.order_index }).eq('id', b.id),
    ])

    setMoving(null)
    router.refresh()
  }

  if (chapters.length === 0) return null

  return (
    <div className="space-y-2">
      {chapters.map((chapter, idx) => {
        const status = STATUS_CONFIG[chapter.status]
        const StatusIcon = status.icon
        const isMoving = moving === chapter.id

        return (
          <div
            key={chapter.id}
            className={`flex items-center gap-3 glass rounded-xl transition-all duration-200 ${isMoving ? 'opacity-50 scale-[0.99]' : ''}`}
          >
            {/* Sıralama butonları */}
            <div className="flex flex-col pl-3 py-1 shrink-0">
              <button
                type="button"
                onClick={() => move(chapter.id, 'up')}
                disabled={idx === 0 || !!moving}
                className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                aria-label="Yukarı taşı"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => move(chapter.id, 'down')}
                disabled={idx === chapters.length - 1 || !!moving}
                className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                aria-label="Aşağı taşı"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>

            {/* Bölüm satırı */}
            <Link
              href={`/projects/${projectId}/write/${chapter.id}`}
              className="flex items-center gap-4 flex-1 p-4 pl-0 hover:text-primary transition-colors group"
            >
              <span className="text-2xl font-display font-bold text-muted-foreground/40 w-8 shrink-0">
                {String(idx + 1).padStart(2, '0')}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium group-hover:text-primary transition-colors truncate">{chapter.title}</p>
                <p className="text-xs text-muted-foreground">{chapter.word_count.toLocaleString('tr')} kelime</p>
              </div>
            </Link>
            {/* Durum rozeti — Link dışında */}
            <button
              type="button"
              onClick={() => cycleStatus(chapter.id, chapter.status)}
              title="Durumu değiştir"
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium transition-all ring-1 ring-transparent ${status.color} ${status.ring} shrink-0`}
            >
              <StatusIcon className="w-3 h-3" />
              {status.label}
            </button>
            {/* Öneri rozeti — Link dışında, iç içe anchor önlemek için */}
            {suggestionCounts[chapter.id] > 0 && (
              <Link
                href={`/projects/${projectId}/write/${chapter.id}/suggestions-list`}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25 transition-colors mr-3 shrink-0"
              >
                <Lightbulb className="w-3 h-3" />
                {suggestionCounts[chapter.id]}
              </Link>
            )}
          </div>
        )
      })}
    </div>
  )
}
