import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react'
import { ViewTracker } from '@/components/reader/ViewTracker'
import { ReactionBar } from '@/components/reader/ReactionBar'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string; chapterId: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, chapterId } = await params
  const supabase = await createClient()
  const [{ data: chapter }, { data: project }] = await Promise.all([
    supabase.from('chapters').select('title').eq('id', chapterId).single(),
    supabase.from('projects').select('title, cover_image_url').eq('slug', slug).single(),
  ])
  if (!chapter || !project) return { title: 'Bölüm — Kalem Birliği' }

  const description = `"${project.title}" · ${chapter.title} — Kalem Birliği'nde oku.`
  return {
    title: `${chapter.title} · ${project.title} — Kalem Birliği`,
    description,
    openGraph: {
      title: `${chapter.title} · ${project.title}`,
      description,
      type: 'article',
      ...(project.cover_image_url ? { images: [{ url: project.cover_image_url, width: 1200, height: 630, alt: project.title }] } : {}),
    },
    twitter: {
      card: project.cover_image_url ? 'summary_large_image' : 'summary',
      title: `${chapter.title} · ${project.title}`,
      description,
      ...(project.cover_image_url ? { images: [project.cover_image_url] } : {}),
    },
  }
}

export default async function ChapterReadPage({ params }: Props) {
  const { slug, chapterId } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('id, title, slug, visibility, collaboration_status, completed_at')
    .eq('slug', slug)
    .single()

  if (!project || project.visibility !== 'published') notFound()

  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: chapter },
    { data: latestVersion },
    { data: allChapters },
    { data: reactions },
  ] = await Promise.all([
    supabase.from('chapters').select('*').eq('id', chapterId).single(),
    supabase.from('chapter_versions').select('content').eq('chapter_id', chapterId).order('created_at', { ascending: false }).limit(1).single(),
    supabase.from('chapters').select('id, title, order_index').eq('project_id', project.id).eq('status', 'final').order('order_index'),
    supabase.from('chapter_reactions').select('reaction, user_id').eq('chapter_id', chapterId),
  ])

  const reactionCounts = { fire: 0, drop: 0, bolt: 0 }
  const userReactions: string[] = []
  for (const r of reactions ?? []) {
    if (r.reaction in reactionCounts) reactionCounts[r.reaction as keyof typeof reactionCounts]++
    if (user && r.user_id === user.id) userReactions.push(r.reaction)
  }

  if (!chapter) notFound()

  const chapterList = allChapters ?? []
  const currentIdx = chapterList.findIndex((c: any) => c.id === chapterId)
  const prevChapter = currentIdx > 0 ? chapterList[currentIdx - 1] : null
  const nextChapter = currentIdx < chapterList.length - 1 ? chapterList[currentIdx + 1] : null

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <ViewTracker chapterId={chapterId} />
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-10">
        <Link href={`/projects/${slug}/read`} className="hover:text-foreground transition-colors flex items-center gap-1.5">
          <BookOpen className="w-4 h-4" /> {project.title}
        </Link>
        <span>/</span>
        <span className="text-foreground">{chapter.title}</span>
      </div>

      <h1 className="text-3xl font-display font-bold mb-4">{chapter.title}</h1>

      {/* Seri ilerleme göstergesi — okur hikâyenin neresinde olduğunu görsün */}
      {currentIdx >= 0 && chapterList.length > 0 && (
        <div className="mb-10 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">
              Bölüm {currentIdx + 1} / {chapterList.length}
            </span>
            {project.collaboration_status === 'completed' && project.completed_at ? (
              <span className="text-amber-400 font-medium">● Tamamlandı</span>
            ) : (
              <span className="text-emerald-400 font-medium">● Devam ediyor</span>
            )}
          </div>
          <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-violet-400"
              style={{ width: `${Math.round(((currentIdx + 1) / chapterList.length) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Content */}
      {latestVersion?.content ? (
        <div
          className="prose font-serif text-lg leading-relaxed"
          dangerouslySetInnerHTML={{ __html: latestVersion.content }}
        />
      ) : (
        <p className="text-muted-foreground italic">Bu bölümün içeriği henüz mevcut değil.</p>
      )}

      <ReactionBar
        chapterId={chapterId}
        initialCounts={reactionCounts}
        initialUserReactions={userReactions}
      />

      {/* Chapter navigation */}
      <div className="flex items-center justify-between mt-8 pt-8 border-t border-border gap-4">
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
