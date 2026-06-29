'use client'

import { useState } from 'react'
import { Star, Eye, EyeOff, Trash2 } from 'lucide-react'
import type { MagazineEntry } from '@/types'

interface Props {
  entry: MagazineEntry
  magazineId: string
  sectionId: string
  onUpdate: (entryId: string, changes: Partial<MagazineEntry>) => void
  onRemove: (entryId: string) => void
}

export function EntryCard({ entry, magazineId, sectionId, onUpdate, onRemove }: Props) {
  const [loading, setLoading] = useState(false)

  async function patch(changes: Record<string, unknown>) {
    setLoading(true)
    await fetch(`/api/magazine/${magazineId}/sections/${sectionId}/entries/${entry.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(changes),
    })
    onUpdate(entry.id, changes as Partial<MagazineEntry>)
    setLoading(false)
  }

  async function remove() {
    setLoading(true)
    await fetch(`/api/magazine/${magazineId}/sections/${sectionId}/entries/${entry.id}`, { method: 'DELETE' })
    onRemove(entry.id)
    setLoading(false)
  }

  const studentName = entry.submission?.student?.display_name ?? entry.submission?.student?.username ?? 'Öğrenci'
  const assignmentTitle = entry.submission?.assignment?.title ?? 'Ödev'

  return (
    <div className={`p-3 rounded-xl border transition-colors ${entry.is_featured ? 'border-amber-500/40 bg-amber-500/5' : 'border-white/[0.06] bg-white/[0.02]'}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{assignmentTitle}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {entry.display_name ?? 'Anonim'} · {studentName}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => patch({ is_featured: !entry.is_featured })}
            disabled={loading}
            title="Öne Çıkan"
            className={`p-1.5 rounded-lg transition-colors ${entry.is_featured ? 'text-amber-400 bg-amber-500/10' : 'text-slate-500 hover:text-amber-400'}`}
          >
            <Star className="w-3.5 h-3.5" fill={entry.is_featured ? 'currentColor' : 'none'} />
          </button>
          <button
            onClick={() => patch({ display_name: entry.display_name ? null : studentName })}
            disabled={loading}
            title={entry.display_name ? 'Anonime çevir' : 'İsimli yayımla'}
            className="p-1.5 rounded-lg text-slate-500 hover:text-white transition-colors"
          >
            {entry.display_name ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <button onClick={remove} disabled={loading} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
