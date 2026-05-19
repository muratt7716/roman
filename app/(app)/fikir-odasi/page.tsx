import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Lightbulb, MessageCircle, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { NewIdeaForm } from '@/components/idea/NewIdeaForm'

export const metadata: Metadata = { title: 'Fikir Odası — Kalem Birliği' }
export const dynamic = 'force-dynamic'

export default async function IdeaRoomListPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: threads } = await supabase
    .from('idea_threads')
    .select('*, author:profiles!idea_threads_user_id_fkey(*)')
    .in('status', ['active', 'team_forming'])
    .order('created_at', { ascending: false })

  // Mesaj sayılarını ayrı çek
  const threadIds = (threads ?? []).map((t: any) => t.id)
  const { data: counts } = threadIds.length > 0
    ? await supabase
        .from('idea_messages')
        .select('thread_id')
        .in('thread_id', threadIds)
    : { data: [] }

  const msgCount: Record<string, number> = {}
  for (const m of counts ?? []) {
    msgCount[m.thread_id] = (msgCount[m.thread_id] ?? 0) + 1
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-primary" /> Fikir Odası
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Aklındaki fikri at, topluluk geliştirsin. İlham alınca ekip kur.
          </p>
        </div>
        <NewIdeaForm />
      </div>

      {/* Thread listesi */}
      <div className="space-y-3">
        {(threads ?? []).length === 0 && (
          <div className="text-center py-20 space-y-3">
            <Lightbulb className="w-10 h-10 mx-auto text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">Henüz fikir yok. İlk fikri sen at!</p>
          </div>
        )}

        {(threads ?? []).map((thread: any) => (
          <Link key={thread.id} href={`/fikir-odasi/${thread.id}`}>
            <div className="glass rounded-xl p-4 space-y-3 hover:ring-1 hover:ring-white/15 hover:bg-white/[0.02] transition-all cursor-pointer">
              <div className="flex items-start gap-3">
                <Avatar className="w-9 h-9 shrink-0">
                  <AvatarImage src={thread.author?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs bg-primary/20 text-primary">
                    {(thread.author?.display_name ?? thread.author?.username ?? '?')[0]}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm">{thread.title}</p>
                    {thread.status === 'team_forming' && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium shrink-0">
                        <Users className="w-3 h-3" /> Ekip Aranıyor
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {thread.author?.display_name ?? thread.author?.username}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                    {thread.seed}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-muted-foreground pl-12">
                <span className="flex items-center gap-1">
                  <MessageCircle className="w-3.5 h-3.5" />
                  {msgCount[thread.id] ?? 0} mesaj
                </span>
                <span className="ml-auto">
                  {new Date(thread.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
