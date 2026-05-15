import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { ProjectCard } from '@/components/project/ProjectCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { BookOpen, Compass } from 'lucide-react'
import type { ProjectWithOwner } from '@/types'

export const metadata: Metadata = { title: 'Projeleri Keşfet — Kalem Birliği' }
export const dynamic = 'force-dynamic'

const GENRES = ['Tümü', 'Fantastik', 'Bilim Kurgu', 'Romantik', 'Gerilim', 'Macera', 'Tarihi', 'Distopya']

interface Props {
  searchParams: Promise<{ genre?: string; status?: string }>
}

export default async function ExplorePage({ searchParams }: Props) {
  const { genre, status } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('projects')
    .select('*, owner:profiles!projects_owner_id_fkey(*), roles:project_roles(*), member_count:project_members(count)')
    .in('visibility', ['open', 'published'])
    .order('created_at', { ascending: false })
    .limit(24)

  if (genre && genre !== 'Tümü') query = query.eq('genre', genre)
  if (status === 'recruiting') query = query.eq('collaboration_status', 'recruiting')

  const { data: projects } = await query

  const normalizedProjects = (projects ?? []).map((p: any) => ({
    ...p,
    member_count: p.member_count?.[0]?.count ?? 0,
  })) as ProjectWithOwner[]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
            <Compass className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold">Keşfet</h1>
        </div>
        <p className="text-muted-foreground">Birlikte yazılacak hikâyeler seni bekliyor.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {GENRES.map(g => {
          const active = (g === 'Tümü' && !genre) || genre === g
          return (
            <a
              key={g}
              href={g === 'Tümü' ? '/explore' : `/explore?genre=${encodeURIComponent(g)}`}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 ${
                active
                  ? 'bg-primary text-white border-primary shadow-[0_0_16px_rgba(124,58,237,0.4)]'
                  : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-white/4'
              }`}
            >
              {g}
            </a>
          )
        })}
        <a
          href={status === 'recruiting' ? '/explore' : '/explore?status=recruiting'}
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 flex items-center gap-1.5 ${
            status === 'recruiting'
              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              : 'border-border text-muted-foreground hover:border-emerald-500/30 hover:text-foreground'
          }`}
        >
          {status === 'recruiting' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
          Üye Aranıyor
        </a>
      </div>

      {/* Count */}
      {normalizedProjects.length > 0 && (
        <p className="text-sm text-muted-foreground">
          <span className="text-foreground font-medium">{normalizedProjects.length}</span> proje bulundu
        </p>
      )}

      {/* Grid */}
      {normalizedProjects.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Henüz proje yok"
          description="Bu filtrede hiç proje bulunamadı."
          action={{ label: 'Tümünü Gör', href: '/explore' }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {normalizedProjects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  )
}
