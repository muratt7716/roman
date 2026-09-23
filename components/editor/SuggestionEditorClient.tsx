'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Loader2, Send, Bold, Italic, Heading2, Heading3, Quote, List, ListOrdered } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface Props {
  chapterId: string
  projectId: string
  chapterTitle: string
  initialContent: string
  authorId: string
}

function ToolBtn({ onClick, active, children }: { onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick() }}
      className={`p-1.5 rounded transition-colors ${active ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-surface-2'}`}
    >
      {children}
    </button>
  )
}

export function SuggestionEditorClient({ chapterId, projectId, chapterTitle, initialContent, authorId }: Props) {
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
    content: initialContent || '<p></p>',
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-[50vh] font-serif text-lg leading-relaxed',
      },
    },
  })

  async function submit() {
    if (!editor) return
    const content = editor.getHTML()
    if (content === '<p></p>' || content.trim() === '') {
      toast.error('Öneri içeriği boş olamaz')
      return
    }
    setSubmitting(true)

    const { data: suggestion, error } = await supabase
      .from('chapter_suggestions')
      .insert({ chapter_id: chapterId, author_id: authorId, content, note: note.trim() || null })
      .select()
      .single()

    if (error) {
      toast.error('Öneri gönderilemedi')
      setSubmitting(false)
      return
    }

    // Bölümü yazana ve proje sahibine bildirim — alıcıları sunucu, öneri
    // satırından türetir (eskiden yalnızca chapter.created_by'a gidiyordu)
    await fetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'suggestion', suggestion_id: suggestion.id }),
    }).catch(() => null)

    toast.success('Önerin gönderildi!')
    router.push(`/projects/${projectId}/write/${chapterId}`)
    router.refresh()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-4 py-2 border-b border-border flex-wrap shrink-0">
        <ToolBtn onClick={() => editor?.chain().focus().toggleBold().run()} active={editor?.isActive('bold')}>
          <Bold className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().toggleItalic().run()} active={editor?.isActive('italic')}>
          <Italic className="w-4 h-4" />
        </ToolBtn>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} active={editor?.isActive('heading', { level: 2 })}>
          <Heading2 className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} active={editor?.isActive('heading', { level: 3 })}>
          <Heading3 className="w-4 h-4" />
        </ToolBtn>
        <div className="w-px h-4 bg-border mx-1" />
        <ToolBtn onClick={() => editor?.chain().focus().toggleBulletList().run()} active={editor?.isActive('bulletList')}>
          <List className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().toggleOrderedList().run()} active={editor?.isActive('orderedList')}>
          <ListOrdered className="w-4 h-4" />
        </ToolBtn>
        <ToolBtn onClick={() => editor?.chain().focus().toggleBlockquote().run()} active={editor?.isActive('blockquote')}>
          <Quote className="w-4 h-4" />
        </ToolBtn>
      </div>

      {/* Editor alanı */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-2xl mx-auto">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Alt panel: not + gönder */}
      <div className="shrink-0 border-t border-border bg-surface px-6 py-4 space-y-3">
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Neden bu değişikliği öneriyorsun? <span className="text-muted-foreground font-normal">(isteğe bağlı)</span>
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="örn: Girişi daha çarpıcı hale getirmeye çalıştım, tempoya bakabilirsin..."
              className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={submit}
              disabled={submitting}
              className="bg-primary hover:bg-primary/90 text-white gap-2 shadow-[0_0_16px_rgba(124,58,237,0.3)]"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Öneriyi Gönder
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
