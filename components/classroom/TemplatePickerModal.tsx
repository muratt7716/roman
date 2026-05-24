'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Bookmark, X, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AssignmentTemplate } from '@/types'
import type { PlatformTemplate } from '@/lib/assignmentTemplates'

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (title: string, description: string) => void
  currentTitle?: string
  currentDescription?: string
}

export function TemplatePickerModal({ open, onClose, onSelect, currentTitle, currentDescription }: Props) {
  const [tab, setTab] = useState<'platform' | 'mine'>('platform')
  const [search, setSearch] = useState('')
  const [platformTemplates, setPlatformTemplates] = useState<PlatformTemplate[]>([])
  const [myTemplates, setMyTemplates] = useState<AssignmentTemplate[]>([])
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  useEffect(() => {
    if (!open) return
    fetch('/api/classroom/templates')
      .then(r => r.json())
      .then(d => {
        setPlatformTemplates(d.platform ?? [])
        setMyTemplates(d.mine ?? [])
      })
  }, [open])

  async function saveCurrentAsTemplate() {
    if (!currentTitle || currentTitle.trim().length < 3) {
      setSaveMsg('Başlık en az 3 karakter olmalı.')
      return
    }
    setSaving(true)
    const res = await fetch('/api/classroom/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: currentTitle, description: currentDescription }),
    })
    const data = await res.json()
    if (res.ok) {
      setMyTemplates(prev => [data.template, ...prev])
      setSaveMsg('Şablon kaydedildi!')
    } else {
      setSaveMsg(data.error ?? 'Hata oluştu.')
    }
    setSaving(false)
    setTimeout(() => setSaveMsg(''), 3000)
  }

  const filtered = (tab === 'platform' ? platformTemplates : myTemplates).filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase())
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[80vh] flex flex-col glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
          <h2 className="font-display font-bold text-white text-lg">Şablon Seç</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3">
          {(['platform', 'mine'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                tab === t ? 'bg-primary/20 text-primary' : 'text-slate-400 hover:text-white'
              )}
            >
              {t === 'platform' ? '📚 Platform Şablonları' : '🔖 Şablonlarım'}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-5 pt-3 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Şablon ara..."
              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-primary/40"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-2">
          {filtered.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">Şablon bulunamadı.</p>
          )}
          {filtered.map(t => (
            <button
              key={t.id}
              onClick={() => { onSelect(t.title, t.description ?? ''); onClose() }}
              className="w-full text-left p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] hover:border-primary/20 transition-all group"
            >
              <p className="font-semibold text-white text-sm group-hover:text-primary transition-colors">{t.title}</p>
              {t.description && (
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{t.description}</p>
              )}
            </button>
          ))}
        </div>

        {/* Save current as template */}
        {tab === 'mine' && (
          <div className="px-5 py-3 border-t border-white/[0.05] flex items-center gap-3">
            <button
              onClick={saveCurrentAsTemplate}
              disabled={saving}
              className="flex items-center gap-2 text-xs font-semibold text-violet-400 hover:text-violet-300 transition-colors disabled:opacity-50"
            >
              <Bookmark className="w-4 h-4" />
              {saving ? 'Kaydediliyor...' : 'Mevcut formu şablon olarak kaydet'}
            </button>
            {saveMsg && <span className="text-xs text-emerald-400">{saveMsg}</span>}
          </div>
        )}
      </div>
    </div>
  )
}
