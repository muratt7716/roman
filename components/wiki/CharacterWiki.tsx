'use client'

import { useState } from 'react'
import { Plus, X, Users, ChevronDown, ChevronUp, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CharacterProfile } from '@/types'

interface Props {
  projectId: string
  currentUserId: string
  initialCharacters: CharacterProfile[]
}

const TRAIT_COLORS = [
  'bg-violet-400/15 text-violet-300',
  'bg-pink-400/15 text-pink-300',
  'bg-amber-400/15 text-amber-300',
  'bg-emerald-400/15 text-emerald-300',
  'bg-sky-400/15 text-sky-300',
]

type FormData = { name: string; role: string; description: string; traits: string[]; arc_notes: string }
const EMPTY_FORM: FormData = { name: '', role: '', description: '', traits: [], arc_notes: '' }

export function CharacterWiki({ projectId, currentUserId, initialCharacters }: Props) {
  const supabase = createClient()
  const [characters, setCharacters] = useState<CharacterProfile[]>(initialCharacters)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<CharacterProfile | null>(null)
  const [traitInput, setTraitInput] = useState('')
  const [form, setForm] = useState<FormData>(EMPTY_FORM)

  function openAdd() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setTraitInput('')
    setShowForm(true)
  }

  function openEdit(char: CharacterProfile) {
    setEditing(char)
    setForm({ name: char.name, role: char.role ?? '', description: char.description ?? '', traits: [...char.traits], arc_notes: char.arc_notes ?? '' })
    setTraitInput('')
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
    setForm(EMPTY_FORM)
    setTraitInput('')
  }

  async function saveCharacter() {
    if (!form.name.trim()) return
    const payload = {
      name: form.name.trim(),
      role: form.role.trim() || null,
      description: form.description.trim() || null,
      traits: form.traits,
      arc_notes: form.arc_notes.trim() || null,
    }

    if (editing) {
      const { data } = await supabase
        .from('character_profiles')
        .update(payload)
        .eq('id', editing.id)
        .select()
        .single()
      if (data) setCharacters(prev => prev.map(c => c.id === editing.id ? data as CharacterProfile : c))
    } else {
      const { data } = await supabase
        .from('character_profiles')
        .insert({ project_id: projectId, created_by: currentUserId, ...payload })
        .select()
        .single()
      if (data) setCharacters(prev => [...prev, data as CharacterProfile])
    }
    closeForm()
  }

  async function deleteCharacter(id: string) {
    await supabase.from('character_profiles').delete().eq('id', id)
    setCharacters(prev => prev.filter(c => c.id !== id))
  }

  function addTrait() {
    const t = traitInput.trim()
    if (t && !form.traits.includes(t) && form.traits.length < 8) {
      setForm(f => ({ ...f, traits: [...f.traits, t] }))
      setTraitInput('')
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-display font-bold">Karakter Vitrini</h1>
        </div>
        <Button onClick={openAdd} className="bg-primary text-white gap-2">
          <Plus className="w-4 h-4" /> Karakter Ekle
        </Button>
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <div className="glass rounded-xl p-6 mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">{editing ? 'Karakteri Düzenle' : 'Yeni Karakter'}</h2>
            <button onClick={closeForm} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>İsim *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Karakter adı" className="bg-surface-2 border-border" />
            </div>
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <Input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="örn. Protagonist" className="bg-surface-2 border-border" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Açıklama</Label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="Karakterin kısa açıklaması..."
              className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-sm resize-none outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Özellikler</Label>
            <div className="flex gap-2">
              <Input
                value={traitInput}
                onChange={e => setTraitInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTrait()}
                placeholder="Cesur, Gizemli... Enter"
                className="bg-surface-2 border-border flex-1"
              />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {form.traits.map((t, i) => (
                <span key={t} className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${TRAIT_COLORS[i % TRAIT_COLORS.length]}`}>
                  {t}
                  <button onClick={() => setForm(f => ({ ...f, traits: f.traits.filter(x => x !== t) }))}><X className="w-2.5 h-2.5" /></button>
                </span>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Karakter Yayı Notları</Label>
            <textarea
              value={form.arc_notes}
              onChange={e => setForm(f => ({ ...f, arc_notes: e.target.value }))}
              rows={2}
              placeholder="Karakterin hikâye boyunca geçireceği değişimler..."
              className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-sm resize-none outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={saveCharacter} disabled={!form.name.trim()} className="bg-primary text-white">
              {editing ? 'Güncelle' : 'Ekle'}
            </Button>
            <Button variant="ghost" onClick={closeForm}>İptal</Button>
          </div>
        </div>
      )}

      {/* Character grid */}
      {characters.length === 0 ? (
        <div className="text-center py-20 glass rounded-xl">
          <Users className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Henüz karakter eklenmedi.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {characters.map(char => (
            <div key={char.id} className="glass rounded-xl overflow-hidden">
              <div className="flex items-start gap-4 p-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-xl font-display font-bold text-primary shrink-0">
                  {char.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{char.name}</p>
                      {char.role && <p className="text-xs text-primary">{char.role}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setExpanded(expanded === char.id ? null : char.id)} className="p-1 text-muted-foreground hover:text-foreground">
                        {expanded === char.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <button onClick={() => openEdit(char)} className="p-1 text-muted-foreground hover:text-primary transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteCharacter(char.id)} className="p-1 text-muted-foreground hover:text-destructive">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {char.traits.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {char.traits.slice(0, 4).map((t, i) => (
                        <span key={t} className={`text-[10px] px-1.5 py-0.5 rounded-full ${TRAIT_COLORS[i % TRAIT_COLORS.length]}`}>{t}</span>
                      ))}
                      {char.traits.length > 4 && <span className="text-[10px] text-muted-foreground">+{char.traits.length - 4}</span>}
                    </div>
                  )}
                </div>
              </div>
              {expanded === char.id && (
                <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                  {char.description && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Açıklama</p>
                      <p className="text-sm leading-relaxed">{char.description}</p>
                    </div>
                  )}
                  {char.arc_notes && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Karakter Yayı</p>
                      <p className="text-sm leading-relaxed text-muted-foreground">{char.arc_notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
