import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, BookOpen, Bell, Users, PenLine, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ProjectCard } from '@/components/project/ProjectCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ProjectWithOwner } from '@/types'

export const metadata: Metadata = { title: 'Dashboard — Kalem Birliği' }
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: ownedProjects } = await supabase
    .from('projects')
    .select('*, owner:profiles!projects_owner_id_fkey(*), roles:project_roles(*)')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(6)

  const { data: membershipData } = await supabase
    .from('project_members')
    .select('project:projects(*, owner:profiles!projects_owner_id_fkey(*), roles:project_roles(*))')
    .eq('user_id', user.id)
    .limit(6)

  const memberProjects = (membershipData ?? [])
    .map((m: any) => m.project)
    .filter(Boolean) as ProjectWithOwner[]

  const projectIds = (ownedProjects ?? []).map(p => p.id)
  const { data: pendingApplications } = projectIds.length > 0
    ? await supabase
        .from('applications')
        .select('*, applicant:profiles!applications_applicant_id_fkey(*), role:project_roles(*)')
        .in('project_id', projectIds)
        .eq('status', 'pending')
        .limit(5)
    : { data: [] }

  const owned = (ownedProjects ?? []) as ProjectWithOwner[]
  const pending = (pendingApplications ?? []) as any[]

  const totalWords = owned.reduce((s, p) => s + (p.current_word_count ?? 0), 0)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-12">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Projelerini yönet ve ilerlemeyi takip et.</p>
        </div>
        <Link
          href="/projects/new"
          className={cn(buttonVariants(), 'bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(124,58,237,0.35)] hover:shadow-[0_0_28px_rgba(124,58,237,0.5)] transition-shadow shrink-0')}
        >
          <Plus className="w-4 h-4 mr-1.5" /> Yeni Proje
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Projem', value: owned.length, icon: BookOpen, color: 'text-violet-400' },
          { label: 'Katıldığım', value: memberProjects.length, icon: Users, color: 'text-sky-400' },
          { label: 'Bekleyen', value: pending.length, icon: Bell, color: 'text-amber-400' },
          { label: 'Toplam Kelime', value: totalWords > 999 ? `${(totalWords/1000).toFixed(1)}K` : totalWords, icon: BookOpen, color: 'text-emerald-400' },
        ].map(stat => (
          <div key={stat.label} className="glass-card rounded-2xl p-5">
            <stat.icon className={`w-4 h-4 ${stat.color} mb-3`} />
            <p className="text-2xl font-display font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Bekleyen Başvurular */}
      {pending.length > 0 && (
        <section className="glass-card rounded-2xl p-6 space-y-4 border-l-2 border-primary">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">Bekleyen Başvurular</h2>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">{pending.length}</span>
          </div>
          <div className="space-y-3">
            {pending.map((app: any) => (
              <div key={app.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary shrink-0">
                    {app.applicant?.display_name?.[0] ?? app.applicant?.username?.[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{app.applicant?.display_name ?? app.applicant?.username}</p>
                    <p className="text-xs text-muted-foreground">{app.role?.name} rolü için başvurdu</p>
                  </div>
                </div>
                <Link href={`/projects/${app.project_id}/overview`} className="text-xs text-primary hover:text-accent transition-colors shrink-0 font-medium">
                  İncele →
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Kendi Projeleri */}
      <section className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-violet-400" />
          </div>
          <h2 className="text-xl font-display font-semibold">Projelerim</h2>
        </div>
        {owned.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Henüz proje yok"
            description="İlk projeyi oluştur ve ekibini kur."
            action={{ label: 'Proje Oluştur', href: '/projects/new' }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {owned.map(p => (
              <div key={p.id} className="space-y-2">
                <ProjectCard project={p} />
                <div className="flex gap-2 px-1">
                  <Link
                    href={`/projects/${p.id}/write`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 text-xs font-medium transition-colors"
                  >
                    <PenLine className="w-3.5 h-3.5" /> Yaz
                  </Link>
                  <Link
                    href={`/projects/${p.id}/overview`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-surface-2 border border-border text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5" /> Yönet
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Üye Olunan Projeler */}
      {memberProjects.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/15 flex items-center justify-center">
              <Users className="w-4 h-4 text-sky-400" />
            </div>
            <h2 className="text-xl font-display font-semibold">Katıldığım Projeler</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {memberProjects.map(p => (
              <div key={p.id} className="space-y-2">
                <ProjectCard project={p} />
                <Link
                  href={`/projects/${p.id}/write`}
                  className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 text-xs font-medium transition-colors w-full"
                >
                  <PenLine className="w-3.5 h-3.5" /> Yazı Odasına Git
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
