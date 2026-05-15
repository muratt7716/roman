import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Clock, FileText } from 'lucide-react'
import { VersionHistoryClient } from '@/components/editor/VersionHistoryClient'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

interface VersionRow {
  id: string
  content: string
  word_count: number
  created_at: string
  chapter: { id: string; title: string } | null
  author: { display_name: string | null; username: string } | null
}

export default async function HistoryPage({ params }: Props) {
  const { slug: id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: chapters } = await supabase
    .from('chapters')
    .select('id, title')
    .eq('project_id', id)
    .order('order_index')

  const chapterIds = (chapters ?? []).map((c: { id: string }) => c.id)

  const { data: versions } = chapterIds.length > 0
    ? await supabase
        .from('chapter_versions')
        .select('id, content, word_count, created_at, chapter:chapters!chapter_id(id, title), author:profiles!author_id(display_name, username)')
        .in('chapter_id', chapterIds)
        .order('created_at', { ascending: false })
        .limit(50)
    : { data: [] }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Clock className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-display font-bold">Versiyon Geçmişi</h1>
      </div>

      {(!versions || versions.length === 0) ? (
        <div className="text-center py-20 glass rounded-xl">
          <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Henüz kaydedilmiş versiyon yok.</p>
          <p className="text-xs text-muted-foreground mt-1">Yazı odasında yazdığında versiyonlar burada görünecek.</p>
        </div>
      ) : (
        <VersionHistoryClient versions={versions as VersionRow[]} projectId={id} />
      )}
    </div>
  )
}
