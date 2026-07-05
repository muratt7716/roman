import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ProjectCard } from '@/components/project/ProjectCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { Library, BookMarked } from 'lucide-react'
import type { ProjectWithOwner } from '@/types'

export const metadata: Metadata = {
  title: 'Kütüphane — Kalem Birliği',
  description: 'Kalem Birliği\'nde tamamlanmış romanlar. Burada bitirilen her hikâye ilk kez okurlarla buluşur.',
}
export const dynamic = 'force-dynamic'

export default async function LibraryPage() {
  const supabase = await createClient()

  const { data: projects } = await supabase
    .from('projects')
    .select('*, owner:profiles!projects_owner_id_fkey(*), roles:project_roles(*), member_count:project_members(count)')
    .eq('visibility', 'published')
    .eq('collaboration_status', 'completed')
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(48)

  const completed = (projects ?? []).map((p: any) => ({
    ...p,
    member_count: p.member_count?.[0]?.count ?? 0,
  })) as ProjectWithOwner[]

  return (
    <div className="relative min-h-screen bg-background text-foreground pb-24 selection:bg-primary/30 selection:text-white">

      {/* Ambient ışık */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-0 right-[15%] w-[550px] h-[550px] rounded-full bg-amber-500/4 blur-[130px]" />
        <div className="absolute bottom-[20%] left-[10%] w-[450px] h-[450px] rounded-full bg-violet-600/4 blur-[110px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-10">

        {/* ── HEADER ── */}
        <div className="space-y-4 max-w-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center border border-white/[0.08] shadow-[0_0_20px_rgba(245,158,11,0.25)]">
              <Library className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-display font-semibold text-white tracking-tight">Kütüphane</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Tamamlanmış romanlar — son sayfası yazılmış hikâyeler</p>
            </div>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            Kalem Birliği&apos;nde bitirilen her roman ilk kez burada yayımlanır.
            Baştan sona, kesintisiz okuyabileceğin tamamlanmış eserler.
          </p>
        </div>

        {/* ── COMPLETED NOVELS ── */}
        {completed.length === 0 ? (
          <EmptyState
            icon={BookMarked}
            title="Henüz tamamlanmış roman yok"
            description="İlk tamamlanan roman burada sergilenecek. Belki de o roman seninkidir?"
            action={{ label: 'Evrenleri Keşfet', href: '/explore' }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {completed.map(p => (
              <div key={p.id} className="relative">
                <div className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/90 text-black text-[10px] font-bold uppercase tracking-wider pointer-events-none">
                  <BookMarked className="w-3 h-3" /> Tamamlandı
                </div>
                <ProjectCard project={p} />
              </div>
            ))}
          </div>
        )}

        {/* ── CTA ── */}
        <div className="pt-8 border-t border-white/[0.05] text-center space-y-3">
          <p className="text-sm text-muted-foreground">Sen de romanını tamamla, burada sergile.</p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25 text-sm font-medium transition-colors"
          >
            Yazmaya Başla
          </Link>
        </div>
      </div>
    </div>
  )
}
