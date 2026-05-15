import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeft, Lightbulb, Check, X, Clock } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string; chapterId: string }>
}

const STATUS_META = {
  pending:  { label: 'Bekliyor',      color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',   icon: Clock },
  accepted: { label: 'Kabul Edildi',  color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: Check },
  rejected: { label: 'Reddedildi',    color: 'text-muted-foreground bg-surface-2 border-border',     icon: X },
}

export default async function SuggestionsListPage({ params }: Props) {
  const { slug: projectId, chapterId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: chapter }, { data: suggestions }] = await Promise.all([
    supabase.from('chapters').select('title').eq('id', chapterId).single(),
    supabase
      .from('chapter_suggestions')
      .select('*, author:profiles!chapter_suggestions_author_id_fkey(*)')
      .eq('chapter_id', chapterId)
      .order('created_at', { ascending: false }),
  ])

  if (!chapter) notFound()

  function wordCount(html: string) {
    return html.replace(/<[^>]+>/g, '').trim().split(/\s+/).filter(Boolean).length
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
      <div className="space-y-1">
        <Link
          href={`/projects/${projectId}/write/${chapterId}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Editöre Dön
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold">Öneriler</h1>
            <p className="text-sm text-muted-foreground">{chapter.title}</p>
          </div>
        </div>
      </div>

      {(!suggestions || suggestions.length === 0) ? (
        <div className="text-center py-16 glass rounded-2xl">
          <Lightbulb className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">Henüz öneri yok.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map((s: any) => {
            const meta = STATUS_META[s.status as keyof typeof STATUS_META]
            const StatusIcon = meta.icon
            const author = s.author
            const wc = wordCount(s.content)

            return (
              <Link
                key={s.id}
                href={`/projects/${projectId}/write/${chapterId}/suggestions/${s.id}`}
                className="block glass-card rounded-2xl p-5 hover-lift transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={author?.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary text-xs">
                        {author?.display_name?.[0] ?? author?.username?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{author?.display_name ?? author?.username}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(s.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                        {' · '}{wc.toLocaleString('tr')} kelime
                      </p>
                    </div>
                  </div>
                  <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border shrink-0 ${meta.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    {meta.label}
                  </span>
                </div>

                {s.note && (
                  <p className="mt-3 text-sm text-muted-foreground leading-relaxed line-clamp-2 pl-12">
                    "{s.note}"
                  </p>
                )}

                <p className="mt-2 text-xs text-primary pl-12">Karşılaştır →</p>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
