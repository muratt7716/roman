import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { InviteButton } from '@/components/writers/InviteButton'
import { Users, BookOpen, PenLine, Star } from 'lucide-react'
import type { Profile } from '@/types'

export const metadata: Metadata = { title: 'Yazarlar — Kalem Birliği' }
export const dynamic = 'force-dynamic'

const STATUS_CONFIG = {
  open:   { label: 'İşbirliğine Açık', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  active: { label: 'Aktif Yazıyor',    color: 'bg-sky-500/15 text-sky-400 border-sky-500/30' },
  busy:   { label: 'Meşgul',           color: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
}

interface Props {
  searchParams: Promise<{ status?: string }>
}

export default async function WritersPage({ searchParams }: Props) {
  const { status } = await searchParams
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

  const { data: rawWriters } = await query

  const writers = (rawWriters ?? []).map((w: any) => ({
    ...w,
    owned_count: w.owned_projects?.length ?? 0,
    contrib_count: (w.memberships?.length ?? 0),
    roles: [...new Set((w.memberships ?? []).map((m: any) => m.role?.name).filter(Boolean))] as string[],
    genres: [...new Set((w.owned_projects ?? []).map((p: any) => p.genre).filter(Boolean))] as string[],
  }))

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-10">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-bold">Yazarlar</h1>
        </div>
        <p className="text-muted-foreground">Kalem Birliği topluluğunun yaratıcı yazarları.</p>
      </div>

      {/* Filtreler */}
      <div className="flex flex-wrap gap-2">
        <a
          href="/writers"
          className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 ${
            !status ? 'bg-primary text-white border-primary shadow-[0_0_16px_rgba(124,58,237,0.4)]' : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
          }`}
        >
          Tümü
        </a>
        {(Object.entries(STATUS_CONFIG) as [string, { label: string; color: string }][]).map(([key, cfg]) => (
          <a
            key={key}
            href={`/writers?status=${key}`}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 ${
              status === key
                ? cfg.color + ' shadow-sm'
                : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'
            }`}
          >
            {key === 'open' && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 align-middle animate-pulse" />}
            {cfg.label}
          </a>
        ))}
      </div>

      {/* Count */}
      {writers.length > 0 && (
        <p className="text-sm text-muted-foreground">
          <span className="text-foreground font-medium">{writers.length}</span> yazar bulundu
        </p>
      )}

      {/* Grid */}
      {writers.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">Bu filtrede yazar bulunamadı.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {writers.map((w: any) => {
            const statusCfg = STATUS_CONFIG[w.writing_status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.open
            const isOwnProfile = user?.id === w.id
            return (
              <div key={w.id} className="glass-card rounded-2xl p-5 flex flex-col gap-4 hover-lift group">
                {/* Top: avatar + status */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Link href={`/u/${w.username}`}>
                      <Avatar className="w-11 h-11 ring-2 ring-transparent group-hover:ring-primary/30 transition-all">
                        <AvatarImage src={w.avatar_url ?? undefined} />
                        <AvatarFallback className="bg-primary/20 text-primary text-sm font-semibold">
                          {w.display_name?.[0] ?? w.username[0]}
                        </AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="min-w-0">
                      <Link href={`/u/${w.username}`} className="text-sm font-semibold hover:text-primary transition-colors truncate block">
                        {w.display_name ?? w.username}
                      </Link>
                      <p className="text-xs text-muted-foreground truncate">@{w.username}</p>
                    </div>
                  </div>
                  {w.writing_status && (
                    <span className={`shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full border ${statusCfg.color}`}>
                      {statusCfg.label}
                    </span>
                  )}
                </div>

                {/* Bio */}
                {w.bio && (
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{w.bio}</p>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white/[0.03] rounded-xl p-2.5 text-center">
                    <p className="text-lg font-display font-bold text-violet-400">{w.owned_count}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Proje Sahibi</p>
                  </div>
                  <div className="bg-white/[0.03] rounded-xl p-2.5 text-center">
                    <p className="text-lg font-display font-bold text-sky-400">{w.contrib_count}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Katkı</p>
                  </div>
                </div>

                {/* Roller */}
                {w.roles.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {w.roles.slice(0, 3).map((role: string) => (
                      <span key={role} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary/80 border border-primary/20">
                        {role}
                      </span>
                    ))}
                    {w.roles.length > 3 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-muted-foreground">
                        +{w.roles.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Türler */}
                {w.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {w.genres.slice(0, 2).map((genre: string) => (
                      <span key={genre} className="text-[10px] px-2 py-0.5 rounded-full bg-surface-2 text-muted-foreground">
                        {genre}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-auto pt-1">
                  <Link
                    href={`/u/${w.username}`}
                    className="flex-1 text-center text-xs py-2 rounded-xl border border-border text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors"
                  >
                    Profil
                  </Link>
                  {!isOwnProfile && user && (
                    <InviteButton targetUserId={w.id} targetUsername={w.username} className="flex-1 justify-center text-xs py-2 h-auto" />
                  )}
                  {!user && (
                    <Link
                      href="/login"
                      className="flex-1 text-center text-xs py-2 rounded-xl border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
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
  )
}
