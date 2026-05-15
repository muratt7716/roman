import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ExportButtons } from '@/components/editor/ExportButtons'
import { ArrowLeft, BookOpen } from 'lucide-react'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function ExportPage({ params }: Props) {
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
    .select('id, title, order_index, word_count')
    .eq('project_id', id)
    .order('order_index')

  // Her bölümün son versiyonunu çek
  const chapterIds = (chapters ?? []).map(c => c.id)
  const chaptersWithContent: { title: string; content: string; word_count: number; order_index: number }[] = []

  for (const ch of (chapters ?? [])) {
    const { data: version } = await supabase
      .from('chapter_versions')
      .select('content')
      .eq('chapter_id', ch.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    chaptersWithContent.push({
      title: ch.title,
      content: version?.content ?? '',
      word_count: ch.word_count,
      order_index: ch.order_index,
    })
  }

  const totalWords = chaptersWithContent.reduce((s, c) => s + c.word_count, 0)

  return (
    <>
      {/* Print-only styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-page { padding: 0 !important; max-width: 100% !important; }
          .chapter-content { color: black !important; }
          .chapter-content p { margin-bottom: 1em; }
          h1, h2, h3 { color: black !important; }
          .chapter-break { page-break-before: always; }
          .chapter-break:first-child { page-break-before: auto; }
        }
      `}</style>

      <div className="print-page max-w-3xl mx-auto px-6 py-12 space-y-10">
        {/* Başlık + butonlar */}
        <div className="no-print space-y-6">
          <Link
            href={`/projects/${id}/write`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Yazı Odasına Dön
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-display font-bold">{project.title}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                <BookOpen className="inline w-3.5 h-3.5 mr-1" />
                {chaptersWithContent.length} bölüm · {totalWords.toLocaleString('tr')} kelime
              </p>
            </div>
            <ExportButtons projectTitle={project.title} chapters={chaptersWithContent} />
          </div>

          <div className="border-t border-border" />
        </div>

        {/* Kitap içeriği */}
        <div className="space-y-16">
          {chaptersWithContent.map((ch, i) => (
            <article
              key={i}
              className={`space-y-6 ${i > 0 ? 'chapter-break' : ''}`}
            >
              <header className="space-y-1 border-b border-border/50 pb-6">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground no-print">
                  Bölüm {i + 1}
                </p>
                <h2 className="text-2xl font-display font-bold">{ch.title}</h2>
                <p className="text-xs text-muted-foreground no-print">
                  {ch.word_count.toLocaleString('tr')} kelime
                </p>
              </header>

              {ch.content ? (
                <div
                  className="chapter-content prose prose-invert max-w-none font-serif text-base leading-[1.9] text-foreground/90
                    [&_p]:mb-[1.2em] [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-3
                    [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2
                    [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_blockquote]:italic
                    [&_strong]:font-semibold [&_em]:italic"
                  dangerouslySetInnerHTML={{ __html: ch.content }}
                />
              ) : (
                <p className="text-muted-foreground italic no-print">Bu bölümde henüz içerik yok.</p>
              )}
            </article>
          ))}
        </div>
      </div>
    </>
  )
}
