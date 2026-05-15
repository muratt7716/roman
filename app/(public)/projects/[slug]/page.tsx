import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Users, BookOpen, Calendar, PenLine, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ApplicationForm } from '@/components/project/ApplicationCard'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('projects').select('title, synopsis').eq('slug', slug).single()
  return {
    title: data ? `${data.title} — Kalem Birliği` : 'Proje — Kalem Birliği',
    description: data?.synopsis ?? undefined,
  }
}

export default async function ProjectDetailPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('*, owner:profiles!projects_owner_id_fkey(*), roles:project_roles(*), members:project_members(*, profile:profiles(*))')
    .eq('slug', slug)
    .single()

  if (!project) notFound()

  const { data: { user } } = await supabase.auth.getUser()

  const isOwner = user?.id === project.owner_id
  const isMember = project.members?.some((m: any) => m.user_id === user?.id)
  const openRoles = project.roles ?? []

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">

      {/* Sahip / üye için yönetim bandı */}
      {(isOwner || isMember) && (
        <div className="flex items-center justify-between gap-4 mb-6 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20">
          <p className="text-sm text-primary font-medium">
            {isOwner ? 'Bu senin projen' : 'Bu projede üyesin'}
          </p>
          <div className="flex items-center gap-2">
            <Link
              href={`/projects/${project.id}/write`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              <PenLine className="w-3.5 h-3.5" /> Yazı Odası
            </Link>
            {isOwner && (
              <Link
                href={`/projects/${project.id}/overview`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 border border-border text-xs font-medium hover:bg-white/5 transition-colors"
              >
                <Settings className="w-3.5 h-3.5" /> Yönet
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sol: Proje Detayları */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-4">
            {project.cover_image_url && (
              <img src={project.cover_image_url} alt={project.title} className="w-full h-56 object-cover rounded-xl" />
            )}
            <div className="flex flex-wrap gap-2">
              {project.genre && (
                <span className="px-2.5 py-1 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">
                  {project.genre}
                </span>
              )}
              <span className={`px-2.5 py-1 rounded-full text-xs border ${
                project.collaboration_status === 'recruiting'
                  ? 'bg-success/10 text-green-400 border-success/20'
                  : 'bg-surface-2 text-muted-foreground border-border'
              }`}>
                {project.collaboration_status === 'recruiting' ? 'Üye Aranıyor' : 'Aktif'}
              </span>
            </div>
            <h1 className="text-4xl font-bold">{project.title}</h1>
          </div>

          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={project.owner?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary/20 text-primary">
                {project.owner?.display_name?.[0] ?? project.owner?.username?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{project.owner?.display_name ?? project.owner?.username}</p>
              <p className="text-xs text-muted-foreground">Proje Sahibi</p>
            </div>
          </div>

          {project.synopsis && (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Özet</h2>
              <p className="text-muted-foreground leading-relaxed">{project.synopsis}</p>
            </div>
          )}

          {project.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {project.tags.map((tag: string) => (
                <span key={tag} className="px-2.5 py-1 rounded-full text-xs bg-surface-2 text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {project.members?.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5" /> Ekip ({project.members.length})
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {project.members.map((member: any) => (
                  <div key={member.id} className="flex items-center gap-2 glass rounded-lg p-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={member.profile?.avatar_url ?? undefined} />
                      <AvatarFallback className="text-xs bg-primary/20 text-primary">
                        {member.profile?.display_name?.[0] ?? member.profile?.username?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{member.profile?.display_name ?? member.profile?.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sağ: Başvuru Paneli */}
        <div className="space-y-4">
          <div className="glass rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" /> Kelime Sayısı
              </span>
              <span className="font-medium">{project.current_word_count?.toLocaleString() ?? 0}</span>
            </div>
            {project.target_word_count && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>İlerleme</span>
                  <span>{Math.round((project.current_word_count / project.target_word_count) * 100)}%</span>
                </div>
                <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${Math.min(100, (project.current_word_count / project.target_word_count) * 100)}%` }}
                  />
                </div>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> Oluşturulma
              </span>
              <span className="font-medium">
                {new Date(project.created_at).toLocaleDateString('tr-TR')}
              </span>
            </div>
          </div>

          {openRoles.length > 0 && !isOwner && !isMember && (
            <div className="glass rounded-xl p-4 space-y-4">
              <h3 className="font-semibold">Açık Roller</h3>
              {user ? (
                openRoles.map((role: any) => (
                  <div key={role.id} className="border border-border rounded-lg p-3 space-y-3">
                    <div>
                      <p className="font-medium text-sm">{role.name}</p>
                      {role.description && <p className="text-xs text-muted-foreground">{role.description}</p>}
                    </div>
                    <ApplicationForm projectId={project.id} role={role} userId={user.id} />
                  </div>
                ))
              ) : (
                <div className="text-center space-y-3 py-2">
                  <p className="text-sm text-muted-foreground">Başvurmak için giriş yapmalısın.</p>
                  <a href="/login" className="block text-center py-2 px-4 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition-colors">
                    Giriş Yap
                  </a>
                </div>
              )}
            </div>
          )}

          {project.visibility === 'published' && (
            <Link
              href={`/projects/${project.slug}/read`}
              className="block text-center py-2.5 px-4 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <BookOpen className="w-4 h-4 inline mr-2" />
              Projeyi Oku
            </Link>
          )}

          {isMember && (
            <div className="glass rounded-xl p-4 text-center space-y-2">
              <p className="text-sm font-medium text-success">Bu projenin üyesisin</p>
              <a href={`/projects/${project.id}/write`} className="block text-center py-2 px-4 bg-primary/20 text-primary rounded-lg text-sm hover:bg-primary/30 transition-colors border border-primary/30">
                Yazma Odasına Git
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
