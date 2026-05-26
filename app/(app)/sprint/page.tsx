import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { SprintCard } from '@/components/sprint/SprintCard'
import type { WritingSprint } from '@/types'

export const metadata: Metadata = { title: 'Yazı Sprintleri — Kalem Birliği' }
export const dynamic = 'force-dynamic'

const DURATIONS = [15, 25, 45] as const

export default async function SprintPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()

  const [{ data: sprints }, { data: myParticipations }] = await Promise.all([
    supabase
      .from('writing_sprints')
      .select('*, participant_count:sprint_participants(count)')
      .gte('ends_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('starts_at', { ascending: true })
      .limit(20),
    supabase
      .from('sprint_participants')
      .select('sprint_id')
      .eq('user_id', user.id),
  ])

  const joinedIds = new Set((myParticipations ?? []).map(p => p.sprint_id))

  const withStatus = (sprints ?? []).map(s => {
    const start = new Date(s.starts_at)
    const end   = new Date(s.ends_at)
    let status = s.status
    if (now >= start && now < end) status = 'active'
    else if (now >= end) status = 'finished'
    return {
      ...s,
      status,
      participant_count: (s.participant_count as unknown as { count: number }[])?.[0]?.count ?? 0,
    } as WritingSprint
  })

  const active   = withStatus.filter(s => s.status === 'active')
  const upcoming = withStatus.filter(s => s.status === 'scheduled')
  const finished = withStatus.filter(s => s.status === 'finished').slice(-5).reverse()

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 space-y-10">

      <div className="space-y-2">
        <h1 className="text-3xl font-display font-black text-white flex items-center gap-2.5">
          <Zap className="w-8 h-8 text-violet-400" />
          Yazı Sprintleri
        </h1>
        <p className="text-sm text-slate-400">Zamanlı yazma oturumları. Topluluğuyla birlikte yaz.</p>
      </div>

      {/* Aktif sprint */}
      {active.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">🔴 Şu An Canlı</h2>
          {active.map(s => (
            <SprintCard key={s.id} sprint={s} isJoined={joinedIds.has(s.id)} />
          ))}
        </section>
      )}

      {/* Yaklaşan sprintler */}
      {upcoming.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Yaklaşan Sprintler</h2>
          {upcoming.map(s => (
            <SprintCard key={s.id} sprint={s} isJoined={joinedIds.has(s.id)} />
          ))}
        </section>
      )}

      {/* Bireysel sprint başlat */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Bireysel Sprint</h2>
        <div className="glass-card rounded-2xl p-5 border border-white/[0.05] space-y-4">
          <p className="text-sm text-slate-300">Kendi tempo sprint&apos;ini başlat. Sıralamaya girmez, streak&apos;e sayılır.</p>
          <div className="flex gap-3">
            {DURATIONS.map(d => (
              <Link
                key={d}
                href={`/sprint/new?duration=${d}`}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm font-semibold text-white hover:bg-white/[0.1] hover:border-primary/30 transition-all cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-violet-400" /> {d} dk
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Geçmiş sprintler */}
      {finished.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Geçmiş Sprintler</h2>
          {finished.map(s => (
            <SprintCard key={s.id} sprint={s} isJoined={joinedIds.has(s.id)} />
          ))}
        </section>
      )}

      {active.length === 0 && upcoming.length === 0 && finished.length === 0 && (
        <div className="text-center py-16 text-slate-500 text-sm">
          Henüz sprint yok. Yakında topluluk sprintleri başlayacak.
        </div>
      )}
    </div>
  )
}
