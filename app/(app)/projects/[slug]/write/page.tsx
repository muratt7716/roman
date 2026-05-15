import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PenLine, Download } from 'lucide-react'
import { NewChapterButton } from '@/components/editor/NewChapterButton'
import { ChapterList } from '@/components/editor/ChapterList'
import type { Chapter } from '@/types'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function WritePage({ params }: Props) {
  const { slug: id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('id, title')
    .eq('id', id)
    .single()

  if (!project) notFound()

  const { data: chapters } = await supabase
    .from('chapters')
    .select('*')
    .eq('project_id', id)
    .order('order_index')

  const list = (chapters ?? []) as Chapter[]
  const totalWords = list.reduce((sum, c) => sum + c.word_count, 0)

  // Bekleyen öneri sayıları
  const chapterIds = list.map(c => c.id)
  const { data: suggestionRows } = chapterIds.length > 0
    ? await supabase
        .from('chapter_suggestions')
        .select('chapter_id')
        .in('chapter_id', chapterIds)
        .eq('status', 'pending')
    : { data: [] }

  const suggestionCounts: Record<string, number> = {}
  for (const row of suggestionRows ?? []) {
    suggestionCounts[row.chapter_id] = (suggestionCounts[row.chapter_id] ?? 0) + 1
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-bold">Yazı Odası</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {list.length} bölüm · {totalWords.toLocaleString('tr')} kelime
          </p>
        </div>
        <div className="flex items-center gap-2">
          {list.length > 0 && (
            <Link
              href={`/projects/${id}/write/export`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:border-white/20 text-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              Dışa Aktar
            </Link>
          )}
          <NewChapterButton projectId={id} chapterCount={list.length} />
        </div>
      </div>

      {list.length === 0 ? (
        <div className="text-center py-20 glass rounded-xl">
          <PenLine className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Henüz bölüm yok.</p>
          <p className="text-xs text-muted-foreground mt-1">İlk bölümü oluşturmak için yukarıdaki butonu kullan.</p>
        </div>
      ) : (
        <ChapterList chapters={list} projectId={id} suggestionCounts={suggestionCounts} />
      )}
    </div>
  )
}
