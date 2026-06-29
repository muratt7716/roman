'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Send } from 'lucide-react'
import { SectionPanel } from './SectionPanel'
import type { ClassMagazine, MagazineSection, MagazineEntry } from '@/types'

interface Submission {
  id: string
  student: { display_name: string | null; username: string } | null
  assignment: { title: string } | null
  project_id: string | null
}

interface Props {
  magazine: ClassMagazine
  initialSections: MagazineSection[]
  submissions: Submission[]
  classroomId: string
}

export function MagazineEditor({ magazine, initialSections, submissions, classroomId }: Props) {
  const router = useRouter()
  const [sections, setSections] = useState<MagazineSection[]>(initialSections)
  const [publishing, setPublishing] = useState(false)

  function updateEntry(sectionId: string, entryId: string, changes: Partial<MagazineEntry>) {
    setSections(prev => prev.map(s =>
      s.id !== sectionId ? s : {
        ...s,
        entries: s.entries?.map(e => e.id !== entryId ? e : { ...e, ...changes })
      }
    ))
  }

  function removeEntry(sectionId: string, entryId: string) {
    setSections(prev => prev.map(s =>
      s.id !== sectionId ? s : { ...s, entries: s.entries?.filter(e => e.id !== entryId) }
    ))
  }

  function addEntry(sectionId: string, entry: MagazineEntry) {
    setSections(prev => prev.map(s =>
      s.id !== sectionId ? s : { ...s, entries: [...(s.entries ?? []), entry] }
    ))
  }

  async function removeSection(sectionId: string) {
    const res = await fetch(`/api/magazine/${magazine.id}/sections/${sectionId}`, { method: 'DELETE' })
    if (res.ok) setSections(prev => prev.filter(s => s.id !== sectionId))
    else toast.error('Bölüm silinemedi.')
  }

  async function publish() {
    const totalEntries = sections.reduce((n, s) => n + (s.entries?.length ?? 0), 0)
    if (totalEntries === 0) { toast.error('En az bir yazı ekle.'); return }
    setPublishing(true)
    const res = await fetch(`/api/magazine/${magazine.id}/publish`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) {
      toast.success('Dergi yayımlandı!')
      router.push(`/classroom/${classroomId}/magazine/${magazine.id}`)
      router.refresh()
    } else {
      toast.error(data.error || 'Yayımlanamadı.')
      setPublishing(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">
          {sections.reduce((n, s) => n + (s.entries?.length ?? 0), 0)} yazı · {sections.length} bölüm
        </p>
        <button
          onClick={publish}
          disabled={publishing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-semibold transition-all disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          {publishing ? 'Yayımlanıyor...' : 'Sayıyı Yayımla'}
        </button>
      </div>

      <div className="space-y-3">
        {sections.map(section => (
          <SectionPanel
            key={section.id}
            section={section}
            magazineId={magazine.id}
            availableSubmissions={submissions}
            onEntryUpdate={updateEntry}
            onEntryRemove={removeEntry}
            onEntryAdd={addEntry}
            onSectionRemove={removeSection}
          />
        ))}
      </div>
    </div>
  )
}
