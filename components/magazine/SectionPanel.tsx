'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { EntryCard } from './EntryCard'
import { MAGAZINE_SECTION_LABELS, type MagazineSection, type MagazineEntry } from '@/types'

interface Submission {
  id: string
  student: { display_name: string | null; username: string } | null
  assignment: { title: string } | null
  project_id: string | null
}

interface Props {
  section: MagazineSection
  magazineId: string
  availableSubmissions: Submission[]
  onEntryUpdate: (sectionId: string, entryId: string, changes: Partial<MagazineEntry>) => void
  onEntryRemove: (sectionId: string, entryId: string) => void
  onEntryAdd: (sectionId: string, entry: MagazineEntry) => void
  onSectionRemove: (sectionId: string) => void
}

export function SectionPanel({ section, magazineId, availableSubmissions, onEntryUpdate, onEntryRemove, onEntryAdd, onSectionRemove }: Props) {
  const [expanded, setExpanded] = useState(true)
  const [adding, setAdding] = useState(false)
  const [selectedSubmission, setSelectedSubmission] = useState('')

  const usedIds = new Set((section.entries ?? []).map(e => e.submission_id))
  const available = availableSubmissions.filter(s => s.project_id && !usedIds.has(s.id))

  async function addEntry() {
    if (!selectedSubmission) return
    setAdding(true)
    const res = await fetch(`/api/magazine/${magazineId}/sections/${section.id}/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submission_id: selectedSubmission, sort_order: (section.entries?.length ?? 0) }),
    })
    const data = await res.json()
    if (res.ok) {
      const sub = availableSubmissions.find(s => s.id === selectedSubmission)
      onEntryAdd(section.id, {
        ...data.entry,
        submission: sub ? { id: sub.id, student_id: '', project_id: sub.project_id, status: '', student: sub.student ?? undefined, assignment: sub.assignment ?? undefined } : undefined,
      })
      setSelectedSubmission('')
    }
    setAdding(false)
  }

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.01] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.04]">
        <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-2 text-sm font-semibold text-white hover:text-primary transition-colors">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {MAGAZINE_SECTION_LABELS[section.type]}
          <span className="text-xs text-slate-500 font-normal">({section.entries?.length ?? 0} yazı)</span>
        </button>
        <button onClick={() => onSectionRemove(section.id)} className="p-1.5 rounded text-slate-600 hover:text-red-400 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {expanded && (
        <div className="p-3 space-y-2">
          {(section.entries ?? []).map(entry => (
            <EntryCard
              key={entry.id}
              entry={entry}
              magazineId={magazineId}
              sectionId={section.id}
              onUpdate={(eid, changes) => onEntryUpdate(section.id, eid, changes)}
              onRemove={eid => onEntryRemove(section.id, eid)}
            />
          ))}

          {available.length > 0 && (
            <div className="flex gap-2 pt-1">
              <select
                value={selectedSubmission}
                onChange={e => setSelectedSubmission(e.target.value)}
                className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50"
              >
                <option value="">Yazı seç...</option>
                {available.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.assignment?.title ?? 'Ödev'} — {s.student?.display_name ?? s.student?.username ?? 'Öğrenci'}
                  </option>
                ))}
              </select>
              <button onClick={addEntry} disabled={!selectedSubmission || adding}
                className="flex items-center gap-1 px-3 py-2 rounded-xl bg-primary/20 text-primary border border-primary/30 text-xs font-medium transition-all hover:bg-primary/30 disabled:opacity-50">
                <Plus className="w-3.5 h-3.5" />
                Ekle
              </button>
            </div>
          )}

          {available.length === 0 && (section.entries?.length ?? 0) === 0 && (
            <p className="text-xs text-slate-500 text-center py-3">Tüm teslimler kullanıldı veya henüz teslim yok.</p>
          )}
        </div>
      )}
    </div>
  )
}
