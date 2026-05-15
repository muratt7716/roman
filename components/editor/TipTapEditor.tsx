'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Highlight from '@tiptap/extension-highlight'
import Typography from '@tiptap/extension-typography'
import CharacterCount from '@tiptap/extension-character-count'
import Placeholder from '@tiptap/extension-placeholder'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Link from '@tiptap/extension-link'
import Subscript from '@tiptap/extension-subscript'
import Superscript from '@tiptap/extension-superscript'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Heading1, Heading2, Heading3,
  Quote, Minus, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Highlighter, Subscript as SubIcon, Superscript as SupIcon,
  Undo2, Redo2, Link as LinkIcon, Check, Loader2, Maximize2, Minimize2,
  Type,
} from 'lucide-react'

interface Props {
  chapterId: string
  projectId: string
  initialContent: string
  onWordCountChange?: (count: number) => void
}

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

const FONT_FAMILIES = [
  { label: 'Varsayılan', value: '' },
  { label: 'Serif (Lora)', value: 'Lora, Georgia, serif' },
  { label: 'Sans (Inter)', value: 'Inter, sans-serif' },
  { label: 'Mono', value: 'JetBrains Mono, monospace' },
]

const TEXT_COLORS = [
  { label: 'Varsayılan', value: '' },
  { label: 'Kırmızı', value: '#f87171' },
  { label: 'Turuncu', value: '#fb923c' },
  { label: 'Sarı', value: '#fbbf24' },
  { label: 'Yeşil', value: '#34d399' },
  { label: 'Mavi', value: '#60a5fa' },
  { label: 'Mor', value: '#a78bfa' },
]

export function TipTapEditor({ chapterId, projectId, initialContent, onWordCountChange }: Props) {
  const supabase = createClient()
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSaved = useRef<string>(initialContent)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [focusMode, setFocusMode] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showFontPicker, setShowFontPicker] = useState(false)

  const lastVersionWordCount = useRef<number>(0)

  const save = useCallback(async (content: string, wordCount: number) => {
    if (content === lastSaved.current) return

    setSaveStatus('saving')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaveStatus('error'); return }

    // Sadece anlamlı değişikliklerde yeni versiyon yarat (≥20 kelime fark veya ilk kayıt)
    const wordDiff = Math.abs(wordCount - lastVersionWordCount.current)
    const shouldCreateVersion = lastVersionWordCount.current === 0 || wordDiff >= 20

    const chapterUpdate = supabase.from('chapters').update({ word_count: wordCount }).eq('id', chapterId)

    let versionError: { message: string } | null = null
    if (shouldCreateVersion) {
      const { error } = await supabase.from('chapter_versions').insert({
        chapter_id: chapterId,
        author_id: user.id,
        content,
        word_count: wordCount,
      })
      versionError = error
    }
    await chapterUpdate

    if (versionError) {
      setSaveStatus('error')
      toast.error('Kayıt başarısız: ' + versionError.message)
      return
    }

    lastSaved.current = content
    if (shouldCreateVersion) lastVersionWordCount.current = wordCount
    setSaveStatus('saved')

    const { data: chapters } = await supabase.from('chapters').select('word_count').eq('project_id', projectId)
    if (chapters) {
      const total = chapters.reduce((sum, c) => sum + (c.word_count ?? 0), 0)
      await supabase.from('projects').update({ current_word_count: total }).eq('id', projectId)
    }

    if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
    savedTimerRef.current = setTimeout(() => setSaveStatus('idle'), 3000)
  }, [chapterId, projectId, supabase])

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Highlight.configure({ multicolor: true }),
      Typography,
      CharacterCount,
      Placeholder.configure({ placeholder: 'Yazmaya başla...' }),
      TextStyle,
      Color,
      Link.configure({ openOnClick: false }),
      Subscript,
      Superscript,
    ],
    content: initialContent || '<p></p>',
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[60vh] font-serif text-lg leading-[1.9] selection:bg-primary/30',
      },
    },
    onUpdate({ editor }) {
      const text = editor.getText()
      const wc = countWords(text)
      onWordCountChange?.(wc)
      setSaveStatus('saving')

      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => save(editor.getHTML(), wc), 30000)
    },
  })

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current)
      if (editor && !editor.isDestroyed) {
        save(editor.getHTML(), countWords(editor.getText()))
      }
    }
  }, [editor, save])

  // Focus mode: Escape key to exit
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setFocusMode(false) }
    if (focusMode) window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [focusMode])

  function addLink() {
    const url = window.prompt('URL gir:', 'https://')
    if (!url) return
    if (url === '') { editor?.chain().focus().extendMarkRange('link').unsetLink().run(); return }
    editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  if (!editor) return null

  const wc = editor.storage.characterCount?.words() ?? 0
  const cc = editor.storage.characterCount?.characters() ?? 0

  const Btn = ({ onClick, active, disabled, title, children }: {
    onClick: () => void; active?: boolean; disabled?: boolean; title?: string; children: React.ReactNode
  }) => (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={e => { e.preventDefault(); onClick() }}
      className={`p-1.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed
        ${active ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-surface-2'}`}
    >
      {children}
    </button>
  )

  const Sep = () => <div className="w-px h-4 bg-border mx-0.5 shrink-0" />

  return (
    <div className={`flex flex-col ${focusMode ? 'fixed inset-0 z-50 bg-[hsl(245_25%_4%)]' : 'h-full'}`}>
      {/* Toolbar */}
      <div className={`flex items-center gap-0.5 px-3 py-2 border-b border-border flex-wrap shrink-0 ${focusMode ? 'opacity-0 hover:opacity-100 transition-opacity duration-300' : ''}`}>

        {/* Undo / Redo */}
        <Btn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Geri Al (Ctrl+Z)">
          <Undo2 className="w-4 h-4" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="İleri Al (Ctrl+Y)">
          <Redo2 className="w-4 h-4" />
        </Btn>

        <Sep />

        {/* Temel biçimlendirme */}
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Kalın (Ctrl+B)">
          <Bold className="w-4 h-4" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="İtalik (Ctrl+I)">
          <Italic className="w-4 h-4" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Altı Çizili (Ctrl+U)">
          <UnderlineIcon className="w-4 h-4" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Üstü Çizili">
          <Strikethrough className="w-4 h-4" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive('subscript')} title="Alt Simge">
          <SubIcon className="w-4 h-4" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive('superscript')} title="Üst Simge">
          <SupIcon className="w-4 h-4" />
        </Btn>

        <Sep />

        {/* Başlıklar */}
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive('heading', { level: 1 })} title="Başlık 1">
          <Heading1 className="w-4 h-4" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Başlık 2">
          <Heading2 className="w-4 h-4" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Başlık 3">
          <Heading3 className="w-4 h-4" />
        </Btn>

        <Sep />

        {/* Listeler */}
        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Madde İşaretli Liste">
          <List className="w-4 h-4" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numaralı Liste">
          <ListOrdered className="w-4 h-4" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Alıntı">
          <Quote className="w-4 h-4" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Yatay Çizgi">
          <Minus className="w-4 h-4" />
        </Btn>

        <Sep />

        {/* Hizalama */}
        <Btn onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })} title="Sola Hizala">
          <AlignLeft className="w-4 h-4" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })} title="Ortala">
          <AlignCenter className="w-4 h-4" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })} title="Sağa Hizala">
          <AlignRight className="w-4 h-4" />
        </Btn>
        <Btn onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })} title="İki Yana Yasla">
          <AlignJustify className="w-4 h-4" />
        </Btn>

        <Sep />

        {/* Vurgulama */}
        <Btn onClick={() => editor.chain().focus().toggleHighlight({ color: '#fbbf2440' }).run()} active={editor.isActive('highlight')} title="Vurgula">
          <Highlighter className="w-4 h-4" />
        </Btn>

        {/* Metin rengi */}
        <div className="relative">
          <Btn onClick={() => { setShowColorPicker(v => !v); setShowFontPicker(false) }} title="Metin Rengi" active={showColorPicker}>
            <Type className="w-4 h-4" />
          </Btn>
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 z-30 glass border border-border rounded-xl p-2 flex gap-1 shadow-xl">
              {TEXT_COLORS.map(c => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  onMouseDown={e => {
                    e.preventDefault()
                    if (c.value === '') editor.chain().focus().unsetColor().run()
                    else editor.chain().focus().setColor(c.value).run()
                    setShowColorPicker(false)
                  }}
                  className="w-5 h-5 rounded-full border border-border hover:scale-110 transition-transform"
                  style={{ background: c.value || '#f8f8f2' }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Font */}
        <div className="relative">
          <Btn onClick={() => { setShowFontPicker(v => !v); setShowColorPicker(false) }} title="Yazı Tipi" active={showFontPicker}>
            <span className="text-[10px] font-bold px-0.5">Aa</span>
          </Btn>
          {showFontPicker && (
            <div className="absolute top-full left-0 mt-1 z-30 glass border border-border rounded-xl p-1.5 shadow-xl min-w-[160px]">
              {FONT_FAMILIES.map(f => (
                <button
                  key={f.value}
                  type="button"
                  onMouseDown={e => {
                    e.preventDefault()
                    if (f.value === '') editor.chain().focus().unsetFontFamily().run()
                    else editor.chain().focus().setFontFamily(f.value).run()
                    setShowFontPicker(false)
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-xs hover:bg-surface-2 transition-colors"
                  style={{ fontFamily: f.value || undefined }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Link */}
        <Btn onClick={addLink} active={editor.isActive('link')} title="Link Ekle">
          <LinkIcon className="w-4 h-4" />
        </Btn>

        <Sep />

        {/* Kayıt durumu */}
        <div className="flex items-center gap-1.5 text-xs ml-1">
          {saveStatus === 'saving' && (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" /> Kaydediliyor...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="flex items-center gap-1 text-emerald-400">
              <Check className="w-3 h-3" /> Kaydedildi
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="text-destructive">Kayıt hatası</span>
          )}
        </div>

        {/* Sağ taraf: istatistikler + focus modu */}
        <div className="ml-auto flex items-center gap-3 shrink-0">
          <span className="text-[11px] text-muted-foreground hidden sm:block">
            {wc.toLocaleString('tr')} kelime · {cc.toLocaleString('tr')} karakter
          </span>
          <button
            type="button"
            onClick={() => setFocusMode(v => !v)}
            title={focusMode ? 'Focus modundan çık (Esc)' : 'Focus modu'}
            className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
          >
            {focusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Editor area */}
      <div
        className="flex-1 overflow-y-auto"
        onClick={() => { setShowColorPicker(false); setShowFontPicker(false) }}
      >
        <div className={`mx-auto py-10 px-8 ${focusMode ? 'max-w-2xl' : 'max-w-2xl'}`}>
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Focus mode: kelime sayısı alt bar */}
      {focusMode && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs text-muted-foreground/50 pointer-events-none">
          {wc.toLocaleString('tr')} kelime · Esc ile çık
        </div>
      )}
    </div>
  )
}
