'use client'

import { useState } from 'react'
import { Plus, X, Clock, ChevronUp, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { TimelineEvent } from '@/types'

interface Props {
  projectId: string
  currentUserId: string
  initialEvents: TimelineEvent[]
}

const ARC_COLORS: Record<string, string> = {
  'Başlangıç': 'border-sky-500 bg-sky-500/10',
  'Yükseliş': 'border-violet-500 bg-violet-500/10',
  'Doruk': 'border-amber-500 bg-amber-500/10',
  'Çözüm': 'border-emerald-500 bg-emerald-500/10',
}

function arcColor(arc: string | null): string {
  if (!arc) return 'border-border bg-surface-2'
  return ARC_COLORS[arc] ?? 'border-primary/40 bg-primary/5'
}

export function TimelineView({ projectId, currentUserId, initialEvents }: Props) {
  const supabase = createClient()
  const [events, setEvents] = useState<TimelineEvent[]>(initialEvents)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', event_date: '', arc: '' })

  async function addEvent() {
    if (!form.title.trim()) return
    const { data } = await supabase
      .from('timeline_events')
      .insert({
        project_id: projectId,
        created_by: currentUserId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        event_date: form.event_date.trim() || null,
        arc: form.arc.trim() || null,
        order_index: events.length,
      })
      .select()
      .single()
    if (data) {
      setEvents(prev => [...prev, data as TimelineEvent])
      setForm({ title: '', description: '', event_date: '', arc: '' })
      setShowForm(false)
    }
  }

  async function deleteEvent(id: string) {
    await supabase.from('timeline_events').delete().eq('id', id)
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  async function moveEvent(idx: number, dir: -1 | 1) {
    const target = idx + dir
    if (target < 0 || target >= events.length) return
    const next = [...events]
    const a = next[idx]
    const b = next[target]
    next[idx] = { ...b, order_index: a.order_index }
    next[target] = { ...a, order_index: b.order_index }
    setEvents(next)
    await Promise.all([
      supabase.from('timeline_events').update({ order_index: a.order_index }).eq('id', b.id),
      supabase.from('timeline_events').update({ order_index: b.order_index }).eq('id', a.id),
    ])
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Clock className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-display font-bold">Zaman Çizelgesi</h1>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-primary text-white gap-2">
          <Plus className="w-4 h-4" /> Olay Ekle
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="glass rounded-xl p-6 mb-8 space-y-4">
          <h2 className="font-medium">Yeni Olay</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5 col-span-2">
              <Label>Olay Adı *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="örn. Kahramanın Yolculuğu Başlar" className="bg-surface-2 border-border" />
            </div>
            <div className="space-y-1.5">
              <Label>Tarih / Dönem</Label>
              <Input value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} placeholder="örn. Yıl 347, 3. Gün" className="bg-surface-2 border-border" />
            </div>
            <div className="space-y-1.5">
              <Label>Hikâye Yayı</Label>
              <select
                value={form.arc}
                onChange={e => setForm(f => ({ ...f, arc: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Seçin (opsiyonel)</option>
                <option>Başlangıç</option>
                <option>Yükseliş</option>
                <option>Doruk</option>
                <option>Çözüm</option>
              </select>
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label>Açıklama</Label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
                placeholder="Olayın kısa açıklaması..."
                className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-sm resize-none outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={addEvent} disabled={!form.title.trim()} className="bg-primary text-white">Ekle</Button>
            <Button variant="ghost" onClick={() => setShowForm(false)}>İptal</Button>
          </div>
        </div>
      )}

      {/* Timeline */}
      {events.length === 0 ? (
        <div className="text-center py-20 glass rounded-xl">
          <Clock className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Henüz olay eklenmedi.</p>
        </div>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-4">
            {events.map((event, idx) => (
              <div key={event.id} className="flex gap-4">
                {/* Node */}
                <div className="relative z-10 w-10 h-10 rounded-full border-2 border-primary bg-background flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {idx + 1}
                </div>
                {/* Card */}
                <div className={`flex-1 rounded-xl border p-4 mb-2 ${arcColor(event.arc)}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{event.title}</p>
                        {event.arc && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary">{event.arc}</span>
                        )}
                      </div>
                      {event.event_date && (
                        <p className="text-xs text-muted-foreground mt-0.5">{event.event_date}</p>
                      )}
                      {event.description && (
                        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{event.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => moveEvent(idx, -1)}
                        disabled={idx === 0}
                        className="p-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Yukarı taşı"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveEvent(idx, 1)}
                        disabled={idx === events.length - 1}
                        className="p-1 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Aşağı taşı"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteEvent(event.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
