import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Users, CheckCircle, XCircle, Clock, BarChart2, Globe, Lock } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DeleteProjectButton } from '@/components/project/DeleteProjectButton'
import { CoverImageUpload } from '@/components/project/CoverImageUpload'

export const metadata: Metadata = { title: 'Proje Genel Bakış — Kalem Birliği' }
export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function ProjectOverviewPage({ params }: Props) {
  const { slug: id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('*, roles:project_roles(*), members:project_members(*, profile:profiles(*), role:project_roles(*))')
    .eq('id', id)
    .single()

  if (!project) notFound()

  const isOwner = project.owner_id === user.id

  const { data: applications } = await supabase
    .from('applications')
    .select('*, applicant:profiles!applications_applicant_id_fkey(*), role:project_roles(*)')
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  const pending = (applications ?? []).filter((a: any) => a.status === 'pending')

  // Katkı analitiği: her üyenin yazdığı kelime sayısı (bölüm başına en son versiyon)
  const { data: chapters } = await supabase
    .from('chapters')
    .select('id, word_count, created_by')
    .eq('project_id', id)

  const chapterIds = (chapters ?? []).map((c: any) => c.id)

  const { data: versions } = chapterIds.length > 0
    ? await supabase
        .from('chapter_versions')
        .select('chapter_id, author_id, word_count, created_at')
        .in('chapter_id', chapterIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  // Bölüm başına en son versiyonu bul, o versiyonun yazarına ata
  const latestPerChapter = new Map<string, { author_id: string; word_count: number }>()
  for (const v of versions ?? []) {
    if (!latestPerChapter.has(v.chapter_id)) {
      latestPerChapter.set(v.chapter_id, { author_id: v.author_id, word_count: v.word_count })
    }
  }

  // Versiyon yoksa chapters.created_by'ı kullan
  for (const c of chapters ?? []) {
    if (!latestPerChapter.has(c.id)) {
      latestPerChapter.set(c.id, { author_id: c.created_by, word_count: c.word_count ?? 0 })
    }
  }

  const wordsByMember: Record<string, number> = {}
  for (const { author_id, word_count } of latestPerChapter.values()) {
    wordsByMember[author_id] = (wordsByMember[author_id] ?? 0) + word_count
  }
  const totalWords = (chapters ?? []).reduce((s: number, c: any) => s + (c.word_count ?? 0), 0)

  async function updateApplication(formData: FormData) {
    'use server'
    const appId = formData.get('appId') as string
    const action = formData.get('action') as string
    const supabase = await createClient()

    if (action === 'accept') {
      const { data: app } = await supabase
        .from('applications')
        .select('*, role:project_roles(*), project:projects(title)')
        .eq('id', appId)
        .single()

      if (app) {
        await Promise.all([
          supabase.from('applications').update({ status: 'accepted' }).eq('id', appId),
          supabase.from('project_members').upsert({
            project_id: app.project_id,
            user_id: app.applicant_id,
            role_id: app.role_id,
          }, { onConflict: 'project_id,user_id', ignoreDuplicates: true }),
          supabase.from('notifications').insert({
            user_id: app.applicant_id,
            type: 'acceptance',
            payload: {
              project_id: app.project_id,
              project_title: (app.project as any)?.title,
              role_name: (app.role as any)?.name,
            },
          }),
        ])
      }
    } else {
      const { data: app } = await supabase
        .from('applications')
        .select('applicant_id, project_id, project:projects(title)')
        .eq('id', appId)
        .single()
      if (app) {
        await Promise.all([
          supabase.from('applications').update({ status: 'rejected' }).eq('id', appId),
          supabase.from('notifications').insert({
            user_id: app.applicant_id,
            type: 'rejection',
            payload: {
              project_id: app.project_id,
              project_title: (app.project as any)?.title,
            },
          }),
        ])
      }
    }
  }

  async function publishProject(formData: FormData) {
    'use server'
    const projectId = formData.get('projectId') as string
    const action = formData.get('action') as string
    const supabase = await createClient()
    if (action === 'publish') {
      await supabase.from('projects').update({ visibility: 'published', collaboration_status: 'completed' }).eq('id', projectId)
    } else {
      await supabase.from('projects').update({ visibility: 'open', collaboration_status: 'recruiting' }).eq('id', projectId)
    }
  }

  const isPublished = project.visibility === 'published'

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      {/* Başlık + Yayınlama */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 flex-1">
          <h1 className="text-2xl font-bold">{project.title}</h1>
          <p className="text-muted-foreground text-sm">{project.synopsis}</p>
        </div>
        {isOwner && (
          <form action={publishProject}>
            <input type="hidden" name="projectId" value={project.id} />
            <input type="hidden" name="action" value={isPublished ? 'unpublish' : 'publish'} />
            <button
              type="submit"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isPublished
                  ? 'bg-surface-2 text-muted-foreground hover:bg-border'
                  : 'bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30'
              }`}
            >
              {isPublished ? <><Lock className="w-4 h-4" /> Taslağa Al</> : <><Globe className="w-4 h-4" /> Projeyi Yayınla</>}
            </button>
          </form>
        )}
      </div>

      {isPublished && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          <Globe className="w-4 h-4 shrink-0" />
          Bu proje yayınlandı — herkes okuyabilir.
          <a href={`/projects/${project.slug}`} className="ml-auto underline hover:no-underline text-xs">Okuma sayfasını gör →</a>
        </div>
      )}

      {/* Kapak Görseli */}
      {isOwner && (
        <section className="glass rounded-xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Kapak Görseli</h2>
          <CoverImageUpload
            projectId={project.id}
            currentUrl={project.cover_image_url ?? null}
          />
        </section>
      )}

      {/* İstatistikler */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Üye', value: project.members?.length ?? 0 },
          { label: 'Kelime', value: totalWords.toLocaleString('tr') },
          { label: 'Bekleyen', value: pending.length },
        ].map(stat => (
          <div key={stat.label} className="glass rounded-xl p-4 text-center">
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Katkı Analitiği */}
      {totalWords > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-primary" /> Katkı Analizi
          </h2>
          <div className="glass rounded-xl p-5 space-y-4">
            {(project.members ?? [])
              .map((m: any) => ({
                member: m,
                words: wordsByMember[m.user_id] ?? 0,
              }))
              .sort((a: any, b: any) => b.words - a.words)
              .map(({ member, words }: any) => {
                const pct = totalWords > 0 ? (words / totalWords) * 100 : 0
                return (
                  <div key={member.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={member.profile?.avatar_url ?? undefined} />
                          <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                            {member.profile?.display_name?.[0] ?? member.profile?.username?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span>{member.profile?.display_name ?? member.profile?.username}</span>
                        <span className="text-xs text-muted-foreground">{member.role?.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{words.toLocaleString('tr')} kelime · %{pct.toFixed(1)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        </section>
      )}

      {/* Bekleyen Başvurular */}
      {isOwner && pending.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> Bekleyen Başvurular ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((app: any) => (
              <div key={app.id} className="glass rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={app.applicant?.avatar_url ?? undefined} />
                      <AvatarFallback className="text-xs bg-primary/20 text-primary">
                        {app.applicant?.display_name?.[0] ?? app.applicant?.username?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{app.applicant?.display_name ?? app.applicant?.username}</p>
                      <p className="text-xs text-muted-foreground">{app.role?.name} için başvurdu</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <form action={updateApplication}>
                      <input type="hidden" name="appId" value={app.id} />
                      <input type="hidden" name="action" value="accept" />
                      <button type="submit" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/15 text-green-400 hover:bg-success/25 text-xs font-medium transition-colors">
                        <CheckCircle className="w-3.5 h-3.5" /> Kabul Et
                      </button>
                    </form>
                    <form action={updateApplication}>
                      <input type="hidden" name="appId" value={app.id} />
                      <input type="hidden" name="action" value="reject" />
                      <button type="submit" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs font-medium transition-colors">
                        <XCircle className="w-3.5 h-3.5" /> Reddet
                      </button>
                    </form>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{app.intro}</p>
                {app.writing_sample && (
                  <div className="bg-surface-2 rounded-lg p-3 text-sm text-muted-foreground italic">
                    &quot;{app.writing_sample.slice(0, 200)}{app.writing_sample.length > 200 ? '...' : ''}&quot;
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Tehlikeli Bölge */}
      {isOwner && (
        <section className="border border-destructive/20 rounded-2xl p-5 space-y-3">
          <h2 className="text-sm font-semibold text-destructive uppercase tracking-wider">Tehlikeli Bölge</h2>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Projeyi Sil</p>
              <p className="text-xs text-muted-foreground mt-0.5">Tüm bölümler, versiyon geçmişi ve ekip verileri kalıcı olarak silinir.</p>
            </div>
            <DeleteProjectButton projectId={project.id} projectTitle={project.title} />
          </div>
        </section>
      )}

      {/* Ekip */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" /> Ekip ({project.members?.length ?? 0})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(project.members ?? []).map((member: any) => (
            <div key={member.id} className="flex items-center gap-3 glass rounded-xl p-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={member.profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-primary/20 text-primary">
                  {member.profile?.display_name?.[0] ?? member.profile?.username?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{member.profile?.display_name ?? member.profile?.username}</p>
                <p className="text-xs text-muted-foreground">{member.role?.name}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-xs font-medium">{(wordsByMember[member.user_id] ?? 0).toLocaleString('tr')}</p>
                <p className="text-[10px] text-muted-foreground">kelime</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
