'use client'

import { useState } from 'react'
import { MessageSquarePlus, Trash2, X, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export interface ReviewComment {
  id: string
  submission_id: string
  author_id: string
  paragraph_index: number
  content: string
  created_at: string
}

interface Props {
  submissionId: string
  blocks: string[]
  initialComments: ReviewComment[]
  canComment: boolean
  currentUserId: string
  teacherName: string
}

/**
 * Teslim edilen metni paragraf paragraf gösterir; öğretmen her paragrafa
 * yorum bırakabilir, öğrenci yorumları paragrafın altında görür.
 */
export function SubmissionReview({ submissionId, blocks, initialComments, canComment, currentUserId, teacherName }: Props) {
  const [comments, setComments] = useState<ReviewComment[]>(initialComments)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function addComment(paragraphIndex: number) {
    const content = draft.trim()
    if (!content) return
    setSaving(true)
    const { data, error } = await supabase
      .from('submission_comments')
      .insert({ submission_id: submissionId, author_id: currentUserId, paragraph_index: paragraphIndex, content })
      .select()
      .single()
    setSaving(false)
    if (!error && data) {
      setComments(prev => [...prev, data as ReviewComment])
      setDraft('')
      setActiveIndex(null)
    } else {
      alert('Yorum kaydedilemedi. Şema güncel mi kontrol et.')
    }
  }

  async function deleteComment(id: string) {
    const { error } = await supabase.from('submission_comments').delete().eq('id', id)
    if (!error) setComments(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div className="space-y-1">
      {blocks.map((html, i) => {
        const blockComments = comments.filter(c => c.paragraph_index === i)
        const isActive = activeIndex === i

        return (
          <div key={i} className={cn('group relative rounded-xl transition-colors', (isActive || blockComments.length > 0) && 'bg-white/[0.02]')}>
            <div className="flex items-start gap-2 px-3 py-1.5">
              <div
                className="flex-1 min-w-0 prose prose-invert max-w-none font-serif text-base leading-[1.9] [&>*]:my-0"
                dangerouslySetInnerHTML={{ __html: html }}
              />
              {canComment && (
                <button
                  onClick={() => { setActiveIndex(isActive ? null : i); setDraft('') }}
                  className={cn(
                    'shrink-0 p-1.5 rounded-lg transition-all mt-1',
                    isActive
                      ? 'text-primary bg-primary/15'
                      : 'text-muted-foreground/40 opacity-0 group-hover:opacity-100 hover:text-primary hover:bg-primary/10'
                  )}
                  title="Bu paragrafa yorum ekle"
                >
                  <MessageSquarePlus className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Paragraf yorumları */}
            {blockComments.length > 0 && (
              <div className="mx-3 mb-2 space-y-1.5">
                {blockComments.map(c => (
                  <div key={c.id} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">{teacherName}</p>
                      <p className="text-xs text-slate-200 leading-relaxed mt-0.5">{c.content}</p>
                    </div>
                    {c.author_id === currentUserId && (
                      <button
                        onClick={() => deleteComment(c.id)}
                        className="shrink-0 p-1 rounded text-muted-foreground/50 hover:text-rose-400 transition-colors"
                        title="Yorumu sil"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Yorum yazma alanı */}
            {isActive && canComment && (
              <div className="mx-3 mb-3 flex items-start gap-2">
                <textarea
                  autoFocus
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  rows={2}
                  maxLength={1000}
                  placeholder="Bu paragraf hakkında geri bildirim..."
                  className="flex-1 bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-white resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => addComment(i)}
                    disabled={saving || !draft.trim()}
                    className="p-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors disabled:opacity-40"
                    title="Gönder"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { setActiveIndex(null); setDraft('') }}
                    className="p-2 rounded-lg text-muted-foreground hover:text-white transition-colors"
                    title="Vazgeç"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
