'use client'

import { useState, useRef } from 'react'
import { Plus, X, Lightbulb } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { BrainstormNote } from '@/types'

const NOTE_COLORS = ['#7C3AED', '#DB2777', '#D97706', '#059669', '#2563EB', '#7C3AED']

const TYPE_LABELS: Record<string, string> = {
  sticky: 'Not',
  plot: 'Olay Örgüsü',
  character: 'Karakter',
  lore: 'Lore',
  relationship: 'İlişki',
}

interface Props {
  projectId: string
  currentUserId: string
  initialNotes: BrainstormNote[]
}

export function BrainstormBoard({ projectId, currentUserId, initialNotes }: Props) {
  const supabase = createClient()
  const [notes, setNotes] = useState<BrainstormNote[]>(initialNotes)
  const [dragging, setDragging] = useState<string | null>(null)
  const dragOffset = useRef({ x: 0, y: 0 })
  const boardRef = useRef<HTMLDivElement>(null)

  async function addNote() {
    const { data } = await supabase
      .from('brainstorm_notes')
      .insert({
        project_id: projectId,
        author_id: currentUserId,
        type: 'sticky',
        title: 'Yeni Not',
        content: {},
        position_x: 80 + Math.random() * 200,
        position_y: 80 + Math.random() * 200,
        color: NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)],
      })
      .select()
      .single()
    if (data) setNotes(prev => [...prev, data as BrainstormNote])
  }

  async function deleteNote(id: string) {
    await supabase.from('brainstorm_notes').delete().eq('id', id)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  async function updateNoteTitle(id: string, title: string) {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, title } : n))
    await supabase.from('brainstorm_notes').update({ title }).eq('id', id)
  }

  async function updateNoteText(id: string, text: string) {
    const content = { text }
    setNotes(prev => prev.map(n => n.id === id ? { ...n, content } : n))
    await supabase.from('brainstorm_notes').update({ content }).eq('id', id)
  }

  async function updateNoteType(id: string, type: string) {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, type: type as BrainstormNote['type'] } : n))
    await supabase.from('brainstorm_notes').update({ type }).eq('id', id)
  }

  function onDragStart(e: React.MouseEvent, id: string, posX: number, posY: number) {
    setDragging(id)
    dragOffset.current = {
      x: e.clientX - posX,
      y: e.clientY - posY,
    }
  }

  function onMouseMove(e: React.MouseEvent) {
    if (!dragging || !boardRef.current) return
    const rect = boardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left - dragOffset.current.x
    const y = e.clientY - rect.top - dragOffset.current.y
    setNotes(prev => prev.map(n => n.id === dragging ? { ...n, position_x: x, position_y: y } : n))
  }

  async function onMouseUp() {
    if (!dragging) return
    const note = notes.find(n => n.id === dragging)
    if (note) {
      await supabase.from('brainstorm_notes').update({ position_x: note.position_x, position_y: note.position_y }).eq('id', dragging)
    }
    setDragging(null)
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-surface shrink-0">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-primary" />
          <h1 className="font-display font-semibold">Beyin Fırtınası</h1>
        </div>
        <button
          onClick={addNote}
          className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
        >
          <Plus className="w-4 h-4" /> Not Ekle
        </button>
      </div>

      <div
        ref={boardRef}
        className="flex-1 relative overflow-hidden select-none cursor-default"
        style={{ background: 'radial-gradient(circle at 50% 50%, hsl(240 8% 7%) 0%, hsl(240 8% 5%) 100%)' }}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {notes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
            Tuval boş — "Not Ekle" ile başla
          </div>
        )}

        {notes.map(note => (
          <div
            key={note.id}
            style={{
              position: 'absolute',
              left: note.position_x,
              top: note.position_y,
              borderColor: note.color + '60',
              boxShadow: `0 0 20px ${note.color}20`,
            }}
            className="w-52 glass rounded-xl border cursor-grab active:cursor-grabbing"
            onMouseDown={e => onDragStart(e, note.id, note.position_x, note.position_y)}
          >
            <div className="flex items-center justify-between px-3 pt-3 pb-1" style={{ borderBottom: `1px solid ${note.color}30` }}>
              <select
                value={note.type}
                onChange={e => { e.stopPropagation(); updateNoteType(note.id, e.target.value) }}
                onMouseDown={e => e.stopPropagation()}
                className="text-[10px] bg-transparent outline-none text-muted-foreground cursor-pointer"
                style={{ color: note.color }}
              >
                {Object.entries(TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={() => deleteNote(note.id)}
                className="text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="p-3 space-y-2">
              <input
                value={note.title ?? ''}
                onChange={e => updateNoteTitle(note.id, e.target.value)}
                onMouseDown={e => e.stopPropagation()}
                placeholder="Başlık..."
                className="w-full bg-transparent text-sm font-medium outline-none placeholder:text-muted-foreground"
              />
              <textarea
                value={(note.content as { text?: string })?.text ?? ''}
                onChange={e => updateNoteText(note.id, e.target.value)}
                onMouseDown={e => e.stopPropagation()}
                placeholder="Notunu yaz..."
                rows={3}
                className="w-full bg-transparent text-xs text-muted-foreground outline-none resize-none placeholder:text-muted-foreground/50 leading-relaxed"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
