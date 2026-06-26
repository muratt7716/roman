import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ProjectCard } from '@/components/project/ProjectCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { SearchInput } from '@/components/shared/SearchInput'
import { BookOpen, Compass } from 'lucide-react'
import type { ProjectWithOwner } from '@/types'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Evrenleri Keşfet — Kalem Birliği' }
export const dynamic = 'force-dynamic'

const GENRES = ['Tümü', 'Fantastik', 'Bilim Kurgu', 'Romantik', 'Gerilim', 'Macera', 'Tarihi', 'Distopya']

interface Props {
  searchParams: Promise<{ genre?: string; status?: string; q?: string }>
}

export default async function ExplorePage({ searchParams }: Props) {
  const { genre, status, q } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('projects')
    .select('*, owner:profiles!projects_owner_id_fkey(*), roles:project_roles(*), member_count:project_members(count)')
    .in('visibility', ['open', 'published'])
    .order('created_at', { ascending: false })
    .limit(24)

  if (genre && genre !== 'Tümü') query = query.eq('genre', genre)
  if (status === 'recruiting') query = query.eq('collaboration_status', 'recruiting')
  if (q) query = query.ilike('title', `%${q}%`)

  const { data: projects } = await query

  const normalizedProjects = (projects ?? []).map((p: any) => ({
    ...p,
    member_count: p.member_count?.[0]?.count ?? 0,
  })) as ProjectWithOwner[]

  return (
    <div className="relative min-h-screen bg-background text-foreground pb-24 selection:bg-primary/30 selection:text-white">
      
      {/* Premium ambient light background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-0 left-[15%] w-[550px] h-[550px] rounded-full bg-violet-600/4 blur-[130px]" />
        <div className="absolute bottom-[20%] right-[10%] w-[450px] h-[450px] rounded-full bg-indigo-500/3 blur-[110px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        
        {/* ── HEADER ── */}
        <div className="space-y-4 text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center border border-white/[0.08] shadow-[0_0_20px_rgba(124,58,237,0.25)]">
              <Compass className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-display font-semibold text-white tracking-tight">Kurgu Dünyaları</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Yazarlar tarafından oluşturulan, yeni üyelerini ve okurlarını bekleyen özgün evrenler.
              </p>
            </div>
          </div>
        </div>

        {/* ── SEARCH + FILTERS ── */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <SearchInput placeholder="Proje adı ara..." />
        </div>

        {/* ── FILTERS SECTION (Premium custom rounded badges) ── */}
        <div className="flex flex-wrap items-center gap-2 p-2 bg-white/[0.02] border border-white/[0.06] rounded-2xl max-w-4xl">
          {GENRES.map(g => {
            const active = (g === 'Tümü' && !genre) || genre === g
            return (
              <Link
                key={g}
                href={g === 'Tümü' ? '/explore' : `/explore?genre=${encodeURIComponent(g)}`}
                className={cn(
                  'px-4 py-2 rounded-xl text-xs font-semibold tracking-wide uppercase transition-all duration-300 border',
                  active
                    ? 'bg-primary border-primary text-white shadow-[0_0_15px_rgba(124,58,237,0.4)]'
                    : 'border-transparent text-muted-foreground hover:text-white hover:bg-white/[0.03]'
                )}
              >
                {g}
              </Link>
            )
          })}
          
          <Link
            href={status === 'recruiting' ? '/explore' : '/explore?status=recruiting'}
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-semibold tracking-wide uppercase transition-all duration-300 border flex items-center gap-1.5',
              status === 'recruiting'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                : 'border-transparent text-muted-foreground hover:text-white hover:bg-white/[0.03]'
            )}
          >
            {status === 'recruiting' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
            Yazar Aranıyor
          </Link>
        </div>

        {/* ── COUNT DISPLAY ── */}
        {normalizedProjects.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/[0.2]" />
            Toplam <span className="text-white font-bold">{normalizedProjects.length}</span> kurgu dünyası bulundu
          </div>
        )}

        {/* ── PROJECTS GRID ── */}
        {normalizedProjects.length === 0 ? (
          <div className="max-w-md mx-auto pt-10">
            <EmptyState
              icon={BookOpen}
              title="Kurgu Bulunamadı"
              description="Seçilen filtre kriterlerine uygun herhangi bir aktif kurgu veya roman projesi bulunmamaktadır."
              action={{ label: 'Tüm Dünyaları Gör', href: '/explore' }}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {normalizedProjects.map(project => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
