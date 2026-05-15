import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { BookOpen, ArrowLeft, Clock } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('projects').select('title').eq('slug', slug).single()
  return { title: data ? `${data.title} — Oku · Kalem Birliği` : 'Oku — Kalem Birliği' }
}

export default async function ReadPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('id, title, slug, synopsis, visibility, owner:profiles!projects_owner_id_fkey(display_name, username)')
    .eq('slug', slug)
    .single()

  if (!project || project.visibility !== 'published') notFound()

  const { data: chapters } = await supabase
    .from('chapters')
    .select('id, title, order_index, word_count, status')
    .eq('project_id', project.id)
    .eq('status', 'final')
    .order('order_index')

  const totalWords = (chapters ?? []).reduce((s: number, c: any) => s + c.word_count, 0)

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <Link href={`/projects/${slug}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
        <ArrowLeft className="w-4 h-4" /> Proje sayfasına dön
      </Link>

      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-display font-bold">{project.title}</h1>
        <p className="text-muted-foreground text-sm">
          {(project.owner as any)?.display_name ?? (project.owner as any)?.username} tarafından
          · {totalWords.toLocaleString('tr')} kelime
          · {(chapters ?? []).length} bölüm
        </p>
      </div>

      {project.synopsis && (
        <div className="glass rounded-xl p-5 mb-8">
          <p className="text-sm leading-relaxed text-muted-foreground italic">{project.synopsis}</p>
        </div>
      )}

      {(!chapters || chapters.length === 0) ? (
        <div className="text-center py-16 glass rounded-xl">
          <BookOpen className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Henüz yayınlanmış bölüm yok.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">İçindekiler</h2>
          {(chapters as any[]).map((chapter, idx) => (
            <Link
              key={chapter.id}
              href={`/projects/${slug}/read/${chapter.id}`}
              className="flex items-center gap-4 p-4 glass rounded-xl hover:bg-white/5 transition-colors group"
            >
              <span className="text-2xl font-display font-bold text-muted-foreground/30 w-8 shrink-0">
                {String(idx + 1).padStart(2, '0')}
              </span>
              <div className="flex-1">
                <p className="font-medium group-hover:text-primary transition-colors">{chapter.title}</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {Math.ceil(chapter.word_count / 200)} dk
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
