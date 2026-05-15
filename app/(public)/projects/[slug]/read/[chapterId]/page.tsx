import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string; chapterId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, chapterId } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('chapters').select('title').eq('id', chapterId).single()
  return { title: data ? `${data.title} — Kalem Birliği` : 'Bölüm — Kalem Birliği' }
}

export default async function ChapterReadPage({ params }: Props) {
  const { slug, chapterId } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('id, title, slug, visibility')
    .eq('slug', slug)
    .single()

  if (!project || project.visibility !== 'published') notFound()

  const [{ data: chapter }, { data: latestVersion }, { data: allChapters }] = await Promise.all([
    supabase.from('chapters').select('*').eq('id', chapterId).single(),
    supabase.from('chapter_versions').select('content').eq('chapter_id', chapterId).order('created_at', { ascending: false }).limit(1).single(),
    supabase.from('chapters').select('id, title, order_index').eq('project_id', project.id).eq('status', 'final').order('order_index'),
  ])

  if (!chapter) notFound()

  const chapterList = allChapters ?? []
  const currentIdx = chapterList.findIndex((c: any) => c.id === chapterId)
  const prevChapter = currentIdx > 0 ? chapterList[currentIdx - 1] : null
  const nextChapter = currentIdx < chapterList.length - 1 ? chapterList[currentIdx + 1] : null

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-10">
        <Link href={`/projects/${slug}/read`} className="hover:text-foreground transition-colors flex items-center gap-1.5">
          <BookOpen className="w-4 h-4" /> {project.title}
        </Link>
        <span>/</span>
        <span className="text-foreground">{chapter.title}</span>
      </div>

      <h1 className="text-3xl font-display font-bold mb-10">{chapter.title}</h1>

      {/* Content */}
      {latestVersion?.content ? (
        <div
          className="prose font-serif text-lg leading-relaxed"
          dangerouslySetInnerHTML={{ __html: latestVersion.content }}
        />
      ) : (
        <p className="text-muted-foreground italic">Bu bölümün içeriği henüz mevcut değil.</p>
      )}

      {/* Chapter navigation */}
      <div className="flex items-center justify-between mt-16 pt-8 border-t border-border gap-4">
        {prevChapter ? (
          <Link
            href={`/projects/${slug}/read/${prevChapter.id}`}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            <div>
              <p className="text-[10px] uppercase tracking-wider">Önceki Bölüm</p>
              <p className="font-medium text-foreground">{prevChapter.title}</p>
            </div>
          </Link>
        ) : <div />}

        {nextChapter ? (
          <Link
            href={`/projects/${slug}/read/${nextChapter.id}`}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group text-right"
          >
            <div>
              <p className="text-[10px] uppercase tracking-wider">Sonraki Bölüm</p>
              <p className="font-medium text-foreground">{nextChapter.title}</p>
            </div>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        ) : (
          <Link href={`/projects/${slug}/read`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            İçindekilere dön →
          </Link>
        )}
      </div>
    </div>
  )
}
