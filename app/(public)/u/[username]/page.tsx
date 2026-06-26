import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ProjectCard } from '@/components/project/ProjectCard'
import { InviteButton } from '@/components/writers/InviteButton'
import { BookOpen, Users, PenLine, ExternalLink, Award, Sparkles, FolderGit } from 'lucide-react'
import { FollowButton } from '@/components/reader/FollowButton'
import { BadgesGrid } from '@/components/profile/BadgesGrid'
import type { ProjectWithOwner, UserBadge } from '@/types'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ username: string }>
}

const STATUS_CONFIG = {
  open:   { label: 'İşbirliğine Açık', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]' },
  active: { label: 'Aktif Yazıyor',    color: 'bg-sky-500/10 text-sky-400 border-sky-500/20 shadow-[0_0_15px_rgba(14,165,233,0.15)]' },
  busy:   { label: 'Meşgul',           color: 'bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.15)]' },
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  return { title: `${username} Profili — Kalem Birliği` }
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
    { count: followerCount },
    { count: _followingCount },
    { data: isFollowingRow },
    { data: badges },
    { data: writingGoal },
    { count: sprintCount },
  ] = await Promise.all([
    supabase
      .from('projects')
      .select('*, owner:profiles!projects_owner_id_fkey(*), roles:project_roles(*)')
      .eq('owner_id', profile.id)
      .in('visibility', ['open', 'published'])
      .order('updated_at', { ascending: false }),
    supabase
      .from('project_members')
      .select('project:projects(id, slug, title, genre, visibility), role:project_roles(name)')
      .eq('user_id', profile.id),
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', profile.id),
    supabase
      .from('follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', profile.id),
    currentUser
      ? supabase
          .from('follows')
          .select('follower_id')
          .eq('follower_id', currentUser.id)
          .eq('following_id', profile.id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }) as any,
    supabase
      .from('user_badges')
      .select('*')
      .eq('user_id', profile.id),
    supabase
      .from('user_writing_goals')
      .select('streak_best')
      .eq('user_id', profile.id)
      .maybeSingle(),
    supabase
      .from('sprint_participants')
      .select('sprint_id', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .not('finished_at', 'is', null),
  ])

  const isFollowing = !!isFollowingRow
  const earnedBadges = (badges ?? []) as UserBadge[]
  const streakBest = writingGoal?.streak_best ?? 0

  const uniqueRoles = [...new Set(
    (memberships ?? []).map((m: any) => m.role?.name).filter(Boolean)
  )] as string[]

  const isOwnProfile = currentUser?.id === profile.id
  const statusCfg = STATUS_CONFIG[(profile as any).writing_status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.open

  return (
    <div className="relative min-h-screen bg-background text-foreground pb-24 selection:bg-primary/30 selection:text-white">
      
      {/* Premium Ambient Background Spheres */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-0 left-[25%] w-[500px] h-[500px] rounded-full bg-violet-600/5 blur-[120px]" />
        <div className="absolute top-[20%] right-[15%] w-[400px] h-[400px] rounded-full bg-indigo-500/3 blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.005)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.005)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-12">
        
        {/* ── PROFILE HEADER SECTION (Ultra-Premium glass layout) ── */}
        <div className="w-full rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.04] to-transparent p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.5)] backdrop-blur-xl relative overflow-hidden">
          
          {/* Subtle gold decoration bar */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-violet-600 via-primary to-pink-500" />
          
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6 relative z-10 text-center md:text-left">
            
            {/* Avatar Container with glowing border */}
            <div className="relative shrink-0 group">
              <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-primary to-pink-500 opacity-20 blur-sm group-hover:opacity-40 transition-opacity duration-300" />
              <Avatar className="w-24 h-24 ring-4 ring-black/40 relative z-10 shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
                <AvatarImage src={profile.avatar_url ?? undefined} className="object-cover" />
                <AvatarFallback className="text-3xl bg-primary/20 text-primary font-display font-bold">
                  {profile.display_name?.[0] ?? profile.username[0]}
                </AvatarFallback>
              </Avatar>
            </div>

            <div className="flex-1 min-w-0 space-y-4 w-full">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <h1 className="text-3xl font-display font-bold text-white tracking-tight flex items-center gap-2 justify-center md:justify-start">
                    {profile.display_name ?? profile.username}
                    <Sparkles className="w-4 h-4 text-violet-400 animate-pulse hidden sm:inline-block" />
                  </h1>
                  <p className="text-sm text-muted-foreground/80 font-mono">@{profile.username}</p>
                </div>
                
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  {statusCfg && (
                    <span className={cn('text-[11px] font-semibold px-3.5 py-1 rounded-full border', statusCfg.color)}>
                      {statusCfg.label}
                    </span>
                  )}
                  
                  {/* Dynamic Prestige Score badge */}
                  <span className="text-[11px] font-semibold px-3 py-1 rounded-full border border-amber-500/25 bg-amber-500/10 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)] flex items-center gap-1">
                    <Award className="w-3.5 h-3.5" />
                    {(profile as any).reputation_score ?? 0} Prestij
                  </span>

                  {!isOwnProfile && currentUser && (
                    <div className="flex items-center gap-2">
                      <FollowButton
                        authorId={profile.id}
                        initialFollowing={isFollowing}
                        followerCount={followerCount ?? 0}
                      />
                      <InviteButton targetUserId={profile.id} targetUsername={profile.username} className="text-xs py-1.5 h-auto px-4 shadow-[0_0_15px_rgba(124,58,237,0.25)]" />
                    </div>
                  )}
                  {isOwnProfile && (
                    <Link 
                      href="/settings" 
                      className="text-xs px-4 py-2 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] text-muted-foreground hover:text-white transition-all duration-300"
                    >
                      Profili Düzenle
                    </Link>
                  )}
                </div>
              </div>

              {profile.bio ? (
                <p className="text-sm sm:text-base text-muted-foreground/90 leading-relaxed max-w-2xl mx-auto md:mx-0 font-sans">
                  {profile.bio}
                </p>
              ) : (
                <p className="text-xs italic text-muted-foreground/60 max-w-2xl mx-auto md:mx-0">
                  Bu yazar henüz bir biyografi eklememiş. Yeni kurgusal seriler yolda!
                </p>
              )}

              {profile.portfolio_url && (
                <div className="pt-1 flex justify-center md:justify-start">
                  <a 
                    href={profile.portfolio_url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-accent font-semibold border border-primary/20 bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-all duration-300"
                  >
                    <ExternalLink className="w-3 h-3" /> Yazarın Portfolyosu
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* ── STATS CARDS SECTION (Glassmorphic metrics layout) ── */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-8 pt-8 border-t border-white/[0.05]">
            <div className="text-center bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.02] hover:border-white/[0.06] p-3 sm:p-4 rounded-xl transition-all duration-300 group">
              <p className="text-2xl sm:text-3xl font-display font-bold text-violet-400 group-hover:scale-105 transition-transform duration-300">{ownedProjects?.length ?? 0}</p>
              <p className="text-[9px] sm:text-xs text-muted-foreground/80 mt-1 uppercase tracking-wider font-semibold">Proje</p>
            </div>
            <div className="text-center bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.02] hover:border-white/[0.06] p-3 sm:p-4 rounded-xl transition-all duration-300 group">
              <p className="text-2xl sm:text-3xl font-display font-bold text-sky-400 group-hover:scale-105 transition-transform duration-300">{memberships?.length ?? 0}</p>
              <p className="text-[9px] sm:text-xs text-muted-foreground/80 mt-1 uppercase tracking-wider font-semibold">Katkı</p>
            </div>
            <div className="text-center bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.02] hover:border-white/[0.06] p-3 sm:p-4 rounded-xl transition-all duration-300 group">
              <p className="text-2xl sm:text-3xl font-display font-bold text-pink-400 group-hover:scale-105 transition-transform duration-300">{followerCount ?? 0}</p>
              <p className="text-[9px] sm:text-xs text-muted-foreground/80 mt-1 uppercase tracking-wider font-semibold">Takipçi</p>
            </div>
            <div className="text-center bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.02] hover:border-white/[0.06] p-3 sm:p-4 rounded-xl transition-all duration-300 group">
              <p className="text-2xl sm:text-3xl font-display font-bold text-amber-400 group-hover:scale-105 transition-transform duration-300">{streakBest}</p>
              <p className="text-[9px] sm:text-xs text-muted-foreground/80 mt-1 uppercase tracking-wider font-semibold">🔥 Seri</p>
            </div>
            <div className="text-center bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.02] hover:border-white/[0.06] p-3 sm:p-4 rounded-xl transition-all duration-300 group">
              <p className="text-2xl sm:text-3xl font-display font-bold text-emerald-400 group-hover:scale-105 transition-transform duration-300">{sprintCount ?? 0}</p>
              <p className="text-[9px] sm:text-xs text-muted-foreground/80 mt-1 uppercase tracking-wider font-semibold">⚡ Sprint</p>
            </div>
          </div>

          {/* Role Badges */}
          {uniqueRoles.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2 justify-center md:justify-start">
              {uniqueRoles.map(role => (
                <span key={role} className="text-[10px] px-3 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 font-medium">
                  {role}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── BADGES SECTION ── */}
        {earnedBadges.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
                <Award className="w-4 h-4 text-amber-400" />
              </div>
              <h2 className="text-2xl font-display font-semibold text-white">Kazanılan Rozetler</h2>
            </div>
            <BadgesGrid badges={earnedBadges} />
          </section>
        )}

        {/* ── OWNED PROJECTS GRID (Highly visually pleasing layout) ── */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20 shadow-[0_0_12px_rgba(124,58,237,0.15)]">
              <BookOpen className="w-4.5 h-4.5 text-violet-400" />
            </div>
            <h2 className="text-2xl font-display font-semibold text-white">Yazara Ait Evrenler & Romanlar</h2>
          </div>

          {ownedProjects && ownedProjects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {(ownedProjects as ProjectWithOwner[]).map(p => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          ) : (
            <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl p-12 text-center flex flex-col items-center justify-center max-w-xl mx-auto space-y-4">
              <div className="w-12 h-12 rounded-full bg-white/[0.02] border border-white/[0.08] flex items-center justify-center">
                <FolderGit className="w-6 h-6 text-muted-foreground/60" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">Henüz yayınlanmış bir proje bulunmuyor</h3>
                <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">Bu yazar şu an için ortak projelerin kurgu aşamasında veya hazırlık evresinde çalışıyor olabilir.</p>
              </div>
            </div>
          )}
        </section>

        {/* ── CONTRIBUTIONS SECTION (Timeline badges) ── */}
        {memberships && memberships.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/10 flex items-center justify-center border border-sky-500/20 shadow-[0_0_12px_rgba(14,165,233,0.15)]">
                <Users className="w-4.5 h-4.5 text-sky-400" />
              </div>
              <h2 className="text-2xl font-display font-semibold text-white">Katkıda Bulunduğu Ortak Hikâyeler</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {memberships.map((m: any, i: number) => {
                if (!m.project) return null
                const isPublic = ['open', 'published'].includes(m.project.visibility)
                const href = isPublic ? `/projects/${m.project.slug}/read` : undefined
                const Inner = (
                  <>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                        <PenLine className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-sm text-white group-hover:text-primary transition-colors truncate block">{m.project.title}</span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide block mt-0.5">{m.project.genre || 'Tür Belirtilmemiş'}</span>
                      </div>
                    </div>
                    {m.role?.name && (
                      <span className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-muted-foreground/90 shrink-0">
                        {m.role.name}
                      </span>
                    )}
                  </>
                )
                return href ? (
                  <Link
                    key={i}
                    href={href}
                    className="flex items-center justify-between px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.05] hover:border-primary/30 transition-all duration-300 group hover:translate-y-[-1px]"
                  >
                    {Inner}
                  </Link>
                ) : (
                  <div
                    key={i}
                    className="flex items-center justify-between px-4 py-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.05] opacity-60"
                  >
                    {Inner}
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
