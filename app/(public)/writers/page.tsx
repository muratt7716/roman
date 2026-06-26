import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { InviteButton } from '@/components/writers/InviteButton'
import { SearchInput } from '@/components/shared/SearchInput'
import { Users, BookOpen, PenLine, Star, Sparkles, Award } from 'lucide-react'
import type { Profile } from '@/types'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Yazarlar Topluluğu — Kalem Birliği' }
export const dynamic = 'force-dynamic'

const STATUS_CONFIG = {
  open:   { label: 'İşbirliğine Açık', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.15)]' },
  active: { label: 'Aktif Yazıyor',    color: 'bg-sky-500/10 text-sky-400 border-sky-500/20 shadow-[0_0_12px_rgba(14,165,233,0.15)]' },
  busy:   { label: 'Meşgul',           color: 'bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-[0_0_12px_rgba(249,115,22,0.15)]' },
}

interface Props {
  searchParams: Promise<{ status?: string; q?: string }>
}

export default async function WritersPage({ searchParams }: Props) {
  const { status, q } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  let query = supabase
    .from('profiles')
    .select(`
      *,
      owned_projects:projects!projects_owner_id_fkey(id, genre),
      memberships:project_members(project_id, role:project_roles(name))
    `)
    .order('reputation_score', { ascending: false })
    .limit(60)

  if (status && ['open', 'active', 'busy'].includes(status)) {
    query = query.eq('writing_status', status)
  }
  if (q) query = query.or(`display_name.ilike.%${q}%,username.ilike.%${q}%`)

  const { data: rawWriters } = await query

  const writers = (rawWriters ?? []).map((w: any) => ({
    ...w,
    owned_count: w.owned_projects?.length ?? 0,
    contrib_count: (w.memberships?.length ?? 0),
    roles: [...new Set((w.memberships ?? []).map((m: any) => m.role?.name).filter(Boolean))] as string[],
    genres: [...new Set((w.owned_projects ?? []).map((p: any) => p.genre).filter(Boolean))] as string[],
  }))

  return (
    <div className="relative min-h-screen bg-background text-foreground pb-24 selection:bg-primary/30 selection:text-white">
      
      {/* Soft Ambient light background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-0 right-[20%] w-[500px] h-[500px] rounded-full bg-violet-600/4 blur-[120px]" />
        <div className="absolute bottom-[10%] left-[10%] w-[450px] h-[450px] rounded-full bg-indigo-500/3 blur-[110px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        
        {/* ── HEADER SECTION ── */}
        <div className="space-y-4 text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center border border-white/[0.08] shadow-[0_0_20px_rgba(124,58,237,0.25)]">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-display font-semibold text-white tracking-tight">Yazarlar Birliği</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Ortak kurgular tasarlayan, kelimeleriyle evrenlere hayat veren yaratıcı yazarlar.
              </p>
            </div>
          </div>
        </div>

        {/* ── SEARCH ── */}
        <SearchInput placeholder="Yazar adı veya kullanıcı adı ara..." />

        {/* ── FILTERING SECTION (Premium custom badges) ── */}
        <div className="flex flex-wrap items-center gap-2.5 p-2 bg-white/[0.02] border border-white/[0.06] rounded-2xl max-w-2xl">
          <Link
            href="/writers"
            className={cn(
              'px-4 py-2 rounded-xl text-xs font-semibold tracking-wide uppercase transition-all duration-300 border',
              !status 
                ? 'bg-primary border-primary text-white shadow-[0_0_15px_rgba(124,58,237,0.4)]' 
                : 'border-transparent text-muted-foreground hover:text-white hover:bg-white/[0.03]'
            )}
          >
            Tüm Yazarlar
          </Link>
          {(Object.entries(STATUS_CONFIG) as [string, { label: string; color: string }][]).map(([key, cfg]) => (
            <Link
              key={key}
              href={`/writers?status=${key}`}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-semibold tracking-wide uppercase transition-all duration-300 border flex items-center gap-1.5',
                status === key
                  ? cfg.color + ' border-transparent'
                  : 'border-transparent text-muted-foreground hover:text-white hover:bg-white/[0.03]'
              )}
            >
              {key === 'open' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
              {key === 'active' && <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />}
              {key === 'busy' && <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />}
              {cfg.label}
            </Link>
          ))}
        </div>

        {/* ── WRITERS COUNT ── */}
        {writers.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-white/[0.2]" />
            Toplam <span className="text-white font-bold">{writers.length}</span> aktif yazar listeleniyor
          </div>
        )}

        {/* ── WRITERS DIRECTORY GRID (Stunning glass nodes) ── */}
        {writers.length === 0 ? (
          <div className="bg-white/[0.01] border border-white/[0.05] rounded-2xl py-24 text-center text-muted-foreground text-sm font-medium">
            Bu kategoride kayıtlı yazar bulunamadı.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {writers.map((w: any) => {
              const statusCfg = STATUS_CONFIG[w.writing_status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.open
              const isOwnProfile = user?.id === w.id
              return (
                <div 
                  key={w.id} 
                  className="rounded-2xl border border-white/[0.05] bg-gradient-to-b from-white/[0.03] to-transparent p-5 flex flex-col justify-between min-h-[300px] hover:border-white/[0.12] hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] hover:translate-y-[-2px] transition-all duration-300 group"
                >
                  <div className="space-y-4">
                    {/* Header: Avatar + username + status tag */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Link href={`/u/${w.username}`}>
                          <Avatar className="w-11 h-11 ring-2 ring-transparent group-hover:ring-primary/45 transition-all duration-300">
                            <AvatarImage src={w.avatar_url ?? undefined} className="object-cover" />
                            <AvatarFallback className="bg-primary/20 text-primary text-sm font-semibold">
                              {w.display_name?.[0] ?? w.username[0]}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                        <div className="min-w-0">
                          <Link href={`/u/${w.username}`} className="text-sm font-semibold text-white group-hover:text-primary transition-colors truncate block">
                            {w.display_name ?? w.username}
                          </Link>
                          <span className="text-[10px] text-muted-foreground/80 font-mono truncate block">@{w.username}</span>
                        </div>
                      </div>
                    </div>

                    {/* Writing Status Badge + Reputation */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={cn('text-[9px] font-semibold px-2 py-0.5 rounded-full border', statusCfg.color)}>
                        {statusCfg.label}
                      </span>
                      <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full border border-amber-500/25 bg-amber-500/5 text-amber-400 flex items-center gap-0.5">
                        <Award className="w-2.5 h-2.5" />
                        {w.reputation_score ?? 0} Prestij
                      </span>
                    </div>

                    {/* Bio */}
                    {w.bio ? (
                      <p className="text-xs text-muted-foreground/90 line-clamp-2 leading-relaxed h-8 font-sans">
                        {w.bio}
                      </p>
                    ) : (
                      <p className="text-xs italic text-muted-foreground/45 h-8 font-sans">
                        Yazmaya hazır, yeni ortak kurgu projeleri arıyor...
                      </p>
                    )}

                    {/* Mini Stats display */}
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-2.5 text-center transition-colors hover:bg-white/[0.02]">
                        <p className="text-base font-display font-bold text-violet-400">{w.owned_count}</p>
                        <p className="text-[9px] text-muted-foreground/70 uppercase font-semibold mt-0.5">Proje Sahibi</p>
                      </div>
                      <div className="bg-white/[0.01] border border-white/[0.04] rounded-xl p-2.5 text-center transition-colors hover:bg-white/[0.02]">
                        <p className="text-base font-display font-bold text-sky-400">{w.contrib_count}</p>
                        <p className="text-[9px] text-muted-foreground/70 uppercase font-semibold mt-0.5">Katkı</p>
                      </div>
                    </div>

                    {/* Roles Badges list */}
                    {w.roles.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {w.roles.slice(0, 3).map((role: string) => (
                          <span key={role} className="text-[9px] px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/15 font-medium">
                            {role}
                          </span>
                        ))}
                        {w.roles.length > 3 && (
                          <span className="text-[9px] px-2 py-0.5 rounded-md bg-white/5 text-muted-foreground border border-white/[0.04] font-medium">
                            +{w.roles.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center gap-2 border-t border-white/[0.03] pt-4 mt-4">
                    <Link
                      href={`/u/${w.username}`}
                      className="flex-1 text-center text-xs py-2 rounded-xl border border-white/[0.06] bg-white/[0.01] hover:bg-white/[0.04] text-muted-foreground hover:text-white transition-all duration-300 font-medium"
                    >
                      Profili İncele
                    </Link>
                    {!isOwnProfile && user && (
                      <InviteButton targetUserId={w.id} targetUsername={w.username} className="flex-1 justify-center text-xs py-2 h-auto rounded-xl shadow-[0_0_12px_rgba(124,58,237,0.2)]" />
                    )}
                    {!user && (
                      <Link
                        href="/login"
                        className="flex-1 text-center text-xs py-2 rounded-xl border border-primary/20 bg-primary/5 text-primary hover:bg-primary/15 transition-all duration-300 font-medium"
                      >
                        Giriş Yap
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
