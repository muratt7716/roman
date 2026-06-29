'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { MAGAZINE_SECTION_LABELS, type MagazineSectionType } from '@/types'

const SECTION_TYPES: MagazineSectionType[] = ['hikaye', 'siir', 'makale', 'senaryo', 'serbest']

export default function NewMagazinePage() {
  const params = useParams<{ classroomId: string }>()
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [sections, setSections] = useState<MagazineSectionType[]>(['hikaye'])
  const [loading, setLoading] = useState(false)

  function addSection(type: MagazineSectionType) {
    setSections(prev => [...prev, type])
  }

  function removeSection(i: number) {
    setSections(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || sections.length === 0) return
    setLoading(true)
    try {
      const res = await fetch(`/api/classroom/${params.classroomId}/magazine`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), sections }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success('Dergi oluşturuldu! Şimdi yazıları ekle.')
        router.push(`/classroom/${params.classroomId}/magazine/${data.magazine.id}/edit`)
      } else {
        toast.error(data.error || 'Bir sorun oluştu.')
      }
    } catch {
      toast.error('Bağlantı hatası.')
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "w-full bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all placeholder:text-slate-600 disabled:opacity-50"

  return (
    <div className="max-w-xl mx-auto px-4 py-12 space-y-8">
      <Link href={`/classroom/${params.classroomId}/magazine`} className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors uppercase tracking-wider font-semibold">
        <ArrowLeft className="w-4 h-4" /> Geri
      </Link>

      <div>
        <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" />
          Yeni Dergi Sayısı
        </h1>
        <p className="text-sm text-slate-400 mt-1">Başlık belirle, bölümleri ayarla, sonra yazıları ekle.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Sayı Başlığı *</label>
          <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="Örn: Bahar Sayısı 2026" className={inputClass} disabled={loading} />
        </div>

        <div className="space-y-3">
          <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Bölümler *</label>
          {sections.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="flex-1 px-4 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] text-sm text-white">
                {MAGAZINE_SECTION_LABELS[s]}
              </div>
              <button type="button" onClick={() => removeSection(i)} disabled={sections.length <= 1} className="p-2 rounded-lg text-slate-500 hover:text-red-400 transition-colors disabled:opacity-30">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2 pt-1">
            {SECTION_TYPES.map(type => (
              <button key={type} type="button" onClick={() => addSection(type)}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-white/[0.06] text-slate-400 hover:text-white hover:border-primary/40 transition-all">
                <Plus className="w-3 h-3" /> {MAGAZINE_SECTION_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        <button type="submit" disabled={loading || !title.trim() || sections.length === 0}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-semibold transition-all disabled:opacity-50">
          {loading ? 'Oluşturuluyor...' : 'Dergiyi Oluştur ve Düzenle →'}
        </button>
      </form>
    </div>
  )
}
