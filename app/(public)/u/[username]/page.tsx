import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ProjectCard } from '@/components/project/ProjectCard'
import { InviteButton } from '@/components/writers/InviteButton'
import { BookOpen, Users, PenLine, ExternalLink } from 'lucide-react'
import type { ProjectWithOwner } from '@/types'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ username: string }>
}

const STATUS_CONFIG = {
  open:   { label: 'İşbirliğine Açık', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  active: { label: 'Aktif Yazıyor',    color: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
  busy:   { label: 'Meşgul',           color: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  return { title: `${username} — Kalem Birliği` }
}

export default async function UserProfilePage({ params }: Props) {
  const { username } = await params
  const supabase = await createClient()

  const { data: { user: currentUser } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  const [
    { data: ownedProjects },
    { data: memberships },
  ] = await Promise.all([
    supabase
      .from('projects')
      .select('*, owner:profiles!projects_owner_id_fkey(*), roles:project_roles(*)')
      .eq('owner_id', profile.id)
      .in('visibility', ['open', 'published'])
      .order('updated_at', { ascending: false }),
    supabase
      .from('project_members')
      .select('project:projects(id, title, genre), role:project_roles(name)')
      .eq('user_id', profile.id),
  ])

  const uniqueRoles = [...new Set(
    (memberships ?? []).map((m: any) => m.role?.name).filter(Boolean)
  )] as string[]

  const isOwnProfile = currentUser?.id === profile.id
  const statusCfg = STATUS_CONFIG[(profile as any).writing_status as keyof typeof STATUS_CONFIG]

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      {/* Profil Header */}
      <div className="glass-card rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <Avatar className="w-20 h-20 ring-4 ring-primary/20 shrink-0">
            <AvatarImage src={profile.avatar_url ?? undefined} />
            <AvatarFallback className="text-2xl bg-primary/20 text-primary font-display font-bold">
              {profile.display_name?.[0] ?? profile.username[0]}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-display font-bold">{profile.display_name ?? profile.username}</h1>
                <p className="text-muted-foreground">@{profile.username}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {statusCfg && (
                  <span className={`text-xs font-medium px-3 py-1 rounded-full border ${statusCfg.color}`}>
                    {statusCfg.label}
                  </span>
                )}
                {!isOwnProfile && currentUser && (
                  <InviteButton targetUserId={profile.id} targetUsername={profile.username} />
                )}
                {isOwnProfile && (
                  <Link href="/settings" className="text-xs px-3 py-1.5 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors">
                    Profili Düzenle
                  </Link>
                )}
              </div>
            </div>

            {profile.bio && (
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">{profile.bio}</p>
            )}

            {profile.portfolio_url && (
              <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-accent transition-colors">
                <ExternalLink className="w-3.5 h-3.5" /> Portfolyo
              </a>
            )}
          </div>
        </div>

        {/* İstatistikler */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/[0.06]">
          <div className="text-center">
            <p className="text-2xl font-display font-bold text-violet-400">{ownedProjects?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Proje Sahibi</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-display font-bold text-sky-400">{memberships?.length ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Katkı Sağladığı</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-display font-bold text-amber-400">{uniqueRoles.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Farklı Rol</p>
          </div>
        </div>

        {/* Üstlenilen Roller */}
        {uniqueRoles.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {uniqueRoles.map(role => (
              <span key={role} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary/80 border border-primary/20">
                {role}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Projeleri */}
      {ownedProjects && ownedProjects.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-violet-400" />
            </div>
            <h2 className="text-xl font-display font-semibold">Projeleri</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {(ownedProjects as ProjectWithOwner[]).map(p => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        </section>
      )}

      {/* Katıldığı Projeler */}
      {memberships && memberships.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/15 flex items-center justify-center">
              <Users className="w-4 h-4 text-sky-400" />
            </div>
            <h2 className="text-xl font-display font-semibold">Katkı Sağladığı Projeler</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {memberships.map((m: any, i: number) => m.project && (
              <Link
                key={i}
                href={`/projects/${m.project.id}/overview`}
                className="flex items-center gap-2 px-3 py-2 rounded-xl glass border border-white/[0.06] hover:border-primary/30 transition-colors text-sm"
              >
                <PenLine className="w-3.5 h-3.5 text-primary/60" />
                <span>{m.project.title}</span>
                {m.role?.name && <span className="text-xs text-muted-foreground">· {m.role.name}</span>}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
