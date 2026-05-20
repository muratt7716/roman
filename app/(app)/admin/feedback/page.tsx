'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, Clock, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

const TYPE_LABELS: Record<string, string> = {
  bug: '🐛 Hata',
  suggestion: '💡 Öneri',
  feature: '✨ Özellik',
  other: '💬 Diğer',
}

const STATUS_CYCLE: Record<string, string> = {
  new: 'reviewed',
  reviewed: 'done',
  done: 'new',
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  new: <Circle className="w-4 h-4 text-red-400" />,
  reviewed: <Clock className="w-4 h-4 text-amber-400" />,
  done: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
}

const STATUS_LABELS: Record<string, string> = {
  new: 'Yeni',
  reviewed: 'İncelendi',
  done: 'Tamamlandı',
}

type FeedbackItem = {
  id: string
  type: string
  message: string
  status: string
  created_at: string
  profiles: { display_name: string | null; username: string } | null
}

export default function AdminFeedbackPage() {
  const [items, setItems] = useState<FeedbackItem[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('feedback')
      .select('*, profiles(display_name, username)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setItems((data ?? []) as FeedbackItem[])
        setLoading(false)
      })
  }, [])

  async function cycleStatus(id: string, current: string) {
    const next = STATUS_CYCLE[current] ?? 'new'
    const supabase = createClient()
    await supabase.from('feedback').update({ status: next }).eq('id', id)
    setItems(prev => prev.map(f => f.id === id ? { ...f, status: next } : f))
  }

  const filtered = filter === 'all' ? items : items.filter(f => f.status === filter)
  const counts = { all: items.length, new: 0, reviewed: 0, done: 0 }
  items.forEach(f => { if (f.status in counts) counts[f.status as keyof typeof counts]++ })

  const FILTERS = [
    { key: 'all', label: 'Tümü' },
    { key: 'new', label: 'Yeni' },
    { key: 'reviewed', label: 'İncelendi' },
    { key: 'done', label: 'Tamamlandı' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Geri Bildirim</h1>
        <p className="text-sm text-muted-foreground mt-1">Kullanıcı geri bildirimleri</p>
      </div>

      <div className="flex items-center gap-2">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs transition-colors',
              filter === key
                ? 'bg-white/[0.08] text-white'
                : 'text-muted-foreground hover:text-white'
            )}
          >
            {label}
            <span className="ml-1.5 text-[10px] opacity-60">{counts[key as keyof typeof counts]}</span>
          </button>
        ))}
      </div>

      {loading && (
        <div className="text-sm text-muted-foreground py-8 text-center">Yükleniyor...</div>
      )}

      <div className="space-y-2">
        {!loading && filtered.length === 0 && (
          <div className="text-sm text-muted-foreground py-8 text-center">Geri bildirim bulunamadı.</div>
        )}
        {filtered.map(fb => (
          <div key={fb.id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3 flex items-start gap-3">
            <button
              onClick={() => cycleStatus(fb.id, fb.status)}
              title={`Durum: ${STATUS_LABELS[fb.status]} — tıkla değiştir`}
              className="mt-0.5 shrink-0 hover:opacity-70 transition-opacity"
            >
              {STATUS_ICONS[fb.status] ?? STATUS_ICONS.new}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs bg-white/[0.05] rounded-md px-2 py-0.5">
                  {TYPE_LABELS[fb.type] ?? fb.type}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {fb.profiles?.display_name ?? fb.profiles?.username ?? 'Anonim'} · {new Date(fb.created_at).toLocaleDateString('tr-TR')}
                </span>
              </div>
              <p className="text-sm text-white/80 mt-1.5 whitespace-pre-wrap">{fb.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
