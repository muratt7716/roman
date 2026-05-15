import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SuggestionEditorClient } from '@/components/editor/SuggestionEditorClient'
import { ArrowLeft, Lightbulb } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string; chapterId: string }>
}

export default async function SuggestPage({ params }: Props) {
  const { slug: projectId, chapterId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: chapter }, { data: latestVersion }] = await Promise.all([
    supabase.from('chapters').select('*').eq('id', chapterId).single(),
    supabase.from('chapter_versions')
      .select('content')
      .eq('chapter_id', chapterId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single(),
  ])

  if (!chapter) notFound()

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Başlık */}
      <div className="shrink-0 px-6 py-3 border-b border-border bg-surface flex items-center gap-4">
        <Link
          href={`/projects/${projectId}/write/${chapterId}`}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Geri Dön
        </Link>
        <div className="flex items-center gap-2 ml-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/15 flex items-center justify-center">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div>
            <span className="text-sm font-medium">Öneri Taslağı</span>
            <span className="text-muted-foreground text-sm"> — {chapter.title}</span>
          </div>
        </div>
        <div className="ml-auto text-xs text-amber-400/70 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
          Orijinal metin korunur
        </div>
      </div>

      <SuggestionEditorClient
        chapterId={chapterId}
        projectId={projectId}
        chapterTitle={chapter.title}
        initialContent={latestVersion?.content ?? ''}
        authorId={user.id}
      />
    </div>
  )
}
