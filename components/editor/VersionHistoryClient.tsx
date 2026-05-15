'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw, X, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

interface Version {
  id: string
  content: string
  word_count: number
  created_at: string
  chapter: { id: string; title: string } | null
  author: { display_name: string | null; username: string } | null
}

interface Props {
  versions: Version[]
  projectId: string
}

function stripHtml(html: string) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

export function VersionHistoryClient({ versions, projectId }: Props) {
  const [selected, setSelected] = useState<Version | null>(null)
  const [restoring, setRestoring] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function restore(v: Version) {
    if (!v.chapter) return
    setRestoring(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { toast.error('Oturum gerekli'); setRestoring(false); return }

    const wc = v.content.trim() ? stripHtml(v.content).split(/\s+/).length : 0
    const { error } = await supabase.from('chapter_versions').insert({
      chapter_id: v.chapter.id,
      author_id: user.id,
      content: v.content,
      word_count: wc,
    })
    if (error) { toast.error('Geri alma başarısız: ' + error.message); setRestoring(false); return }

    await supabase.from('chapters').update({ word_count: wc }).eq('id', v.chapter.id)
    toast.success(`"${v.chapter.title}" bu versiyona geri alındı`)
    setSelected(null)
    setRestoring(false)
    router.refresh()
  }

  return (
    <>
      <div className="space-y-3">
        {versions.map(v => (
          <div key={v.id} className="glass rounded-xl p-4 space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium">
                  {v.chapter?.title ?? 'Bilinmeyen Bölüm'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {v.author?.display_name ?? v.author?.username ?? 'Bilinmeyen'}
                  {' · '}{v.word_count.toLocaleString('tr')} kelime
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <time className="text-xs text-muted-foreground">
                  {new Date(v.created_at).toLocaleString('tr', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </time>
                <button
                  onClick={() => setSelected(v)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
                  aria-label="Versiyonu gör"
                  title="Önizle / Geri Al"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {stripHtml(v.content).slice(0, 200)}
            </p>
          </div>
        ))}
      </div>

      {/* Version preview modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-black/70 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div
            className="w-full max-w-2xl max-h-[75vh] flex flex-col glass rounded-2xl border border-border shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div>
                <p className="font-semibold">{selected.chapter?.title ?? 'Bölüm'}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {selected.author?.display_name ?? selected.author?.username}
                  {' · '}
                  {new Date(selected.created_at).toLocaleString('tr', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {' · '}{selected.word_count.toLocaleString('tr')} kelime
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <div
                className="prose prose-invert max-w-none font-serif text-base leading-relaxed text-foreground/90
                  [&_p]:mb-4 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:font-semibold
                  [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: selected.content || '<p class="text-muted-foreground italic">Bu versiyonda içerik yok.</p>' }}
              />
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-border flex justify-end shrink-0">
              <button
                onClick={() => restore(selected)}
                disabled={restoring}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {restoring ? (
                  <span className="w-4 h-4 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                Bu versiyona geri al
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
