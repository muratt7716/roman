import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Check, X, User, Clock, Lightbulb } from 'lucide-react'
import { SuggestionReviewActions } from '@/components/editor/SuggestionReviewActions'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string; chapterId: string; suggestionId: string }>
}

export default async function SuggestionReviewPage({ params }: Props) {
  const { slug: projectId, chapterId, suggestionId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: chapter }, { data: suggestion }, { data: latestVersion }] = await Promise.all([
    supabase.from('chapters').select('*, project:projects(owner_id)').eq('id', chapterId).single(),
    supabase
      .from('chapter_suggestions')
      .select('*, author:profiles!chapter_suggestions_author_id_fkey(*)')
      .eq('id', suggestionId)
      .single(),
    supabase
      .from('chapter_versions')
      .select('content, word_count, created_at')
      .eq('chapter_id', chapterId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
  ])

  if (!chapter || !suggestion) notFound()

  const isOwner = (chapter.project as any)?.owner_id === user.id
  const isChapterAuthor = chapter.created_by === user.id
  const canReview = isOwner || isChapterAuthor

  function countWords(html: string) {
    return html.replace(/<[^>]+>/g, '').trim().split(/\s+/).filter(Boolean).length
  }

  const originalWords = latestVersion ? countWords(latestVersion.content) : 0
  const suggestedWords = countWords(suggestion.content)
  const wordDiff = suggestedWords - originalWords

  const author = suggestion.author as any

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Başlık */}
      <div className="shrink-0 px-6 py-3 border-b border-border bg-surface flex items-center gap-4 flex-wrap">
        <Link
          href={`/projects/${projectId}/write/${chapterId}`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Geri
        </Link>

        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <span className="text-sm font-medium">{chapter.title}</span>
          <span className="text-muted-foreground text-sm">— Öneri İnceleme</span>
        </div>

        {/* Öneri meta */}
        <div className="ml-auto flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <User className="w-3.5 h-3.5" />
            {author?.display_name ?? author?.username ?? 'Bilinmiyor'}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            {new Date(suggestion.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </div>
          {wordDiff !== 0 && (
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${wordDiff > 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
              {wordDiff > 0 ? `+${wordDiff}` : wordDiff} kelime
            </span>
          )}

          {suggestion.status !== 'pending' && (
            <span className={`text-xs font-medium px-3 py-1 rounded-full border ${
              suggestion.status === 'accepted'
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-surface-2 text-muted-foreground border-border'
            }`}>
              {suggestion.status === 'accepted' ? '✓ Kabul Edildi' : '✗ Reddedildi'}
            </span>
          )}
        </div>
      </div>

      {/* Açıklama notu */}
      {suggestion.note && (
        <div className="shrink-0 px-6 py-3 bg-amber-500/[0.06] border-b border-amber-500/15">
          <p className="text-sm text-amber-300/90 max-w-4xl mx-auto">
            <span className="font-medium text-amber-400">Not: </span>
            {suggestion.note}
          </p>
        </div>
      )}

      {/* Yan yana içerik */}
      <div className="flex-1 overflow-hidden grid grid-cols-2 divide-x divide-border">
        {/* Sol: Orijinal */}
        <div className="flex flex-col overflow-hidden">
          <div className="shrink-0 px-6 py-2.5 border-b border-border flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-sky-400" />
            <span className="text-xs font-medium text-sky-400 uppercase tracking-wider">Mevcut Versiyon</span>
            <span className="ml-auto text-xs text-muted-foreground">{originalWords.toLocaleString('tr')} kelime</span>
          </div>
          <div className="flex-1 overflow-y-auto px-8 py-6">
            <div className="max-w-xl mx-auto">
              {latestVersion?.content ? (
                <div
                  className="font-serif text-base leading-[1.9] text-foreground/80
                    [&_p]:mb-[1.2em] [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-3
                    [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2
                    [&_blockquote]:border-l-2 [&_blockquote]:border-sky-400/40 [&_blockquote]:pl-4 [&_blockquote]:italic
                    [&_strong]:font-semibold [&_em]:italic"
                  dangerouslySetInnerHTML={{ __html: latestVersion.content }}
                />
              ) : (
                <p className="text-muted-foreground italic">İçerik yok.</p>
              )}
            </div>
          </div>
        </div>

        {/* Sağ: Öneri */}
        <div className="flex flex-col overflow-hidden">
          <div className="shrink-0 px-6 py-2.5 border-b border-border flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">Öneri</span>
            <span className="ml-auto text-xs text-muted-foreground">{suggestedWords.toLocaleString('tr')} kelime</span>
          </div>
          <div className="flex-1 overflow-y-auto px-8 py-6">
            <div className="max-w-xl mx-auto">
              <div
                className="font-serif text-base leading-[1.9] text-foreground/90
                  [&_p]:mb-[1.2em] [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-3
                  [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2
                  [&_blockquote]:border-l-2 [&_blockquote]:border-amber-400/40 [&_blockquote]:pl-4 [&_blockquote]:italic
                  [&_strong]:font-semibold [&_em]:italic"
                dangerouslySetInnerHTML={{ __html: suggestion.content }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Alt: Kabul / Reddet */}
      {canReview && suggestion.status === 'pending' && (
        <SuggestionReviewActions
          suggestionId={suggestionId}
          chapterId={chapterId}
          projectId={projectId}
          suggestionContent={suggestion.content}
          suggestorId={suggestion.author_id}
          suggestorName={author?.display_name ?? author?.username ?? 'Biri'}
          wordCount={suggestedWords}
        />
      )}
    </div>
  )
}
