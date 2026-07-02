import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import {
  Users, Plus, GraduationCap, Trophy, BookOpen,
  Sparkles, Star, Crown, Zap, Flame, Trash2, Calendar, BarChart2
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { JoinCodeDisplay } from '@/components/classroom/JoinCodeDisplay'
import { AssignmentCard } from '@/components/classroom/AssignmentCard'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PageProps {
  params: Promise<{ classroomId: string }>
}

export const metadata: Metadata = { title: 'Sınıf Detayı — Kalem Birliği' }
export const dynamic = 'force-dynamic'

export default async function ClassroomPage({ params }: PageProps) {
  const { classroomId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch classroom data, members, and assignments in parallel
  const [{ data: classroom }, { data: members }, { data: assignments }] = await Promise.all([
    supabase.from('classrooms').select('*').eq('id', classroomId).single(),
    supabase.from('classroom_members').select('*, profile:profiles!left(id, username, display_name, avatar_url)').eq('classroom_id', classroomId),
    supabase.from('classroom_assignments').select('*').eq('classroom_id', classroomId).order('created_at', { ascending: false }),
  ])

  if (!classroom) notFound()

  let myMembership = members?.find((m) => m.user_id === user.id) ?? null

  // Resilience: owner may lack a membership row if RLS blocked the insert
  if (!myMembership && classroom.owner_id === user.id) {
    await supabase.from('classroom_members').insert({ classroom_id: classroomId, user_id: user.id, role: 'teacher' })
    const { data: refreshed } = await supabase
      .from('classroom_members')
      .select('*, profile:profiles!left(id, username, display_name, avatar_url)')
      .eq('classroom_id', classroomId)
    myMembership = refreshed?.find((m: { user_id: string }) => m.user_id === user.id) ?? null
    if (!myMembership) {
      myMembership = { user_id: user.id, classroom_id: classroomId, role: 'teacher', joined_at: new Date().toISOString(), student_id: null, profile: null } as any
    }
  }

  // Fallback: if profile join dropped the row, query membership directly (no profile join)
  if (!myMembership) {
    const { data: myRow } = await supabase
      .from('classroom_members')
      .select('user_id, role, classroom_id, joined_at')
      .eq('classroom_id', classroomId)
      .eq('user_id', user.id)
      .single()
    if (myRow) myMembership = { ...myRow, profile: null } as any
  }

  if (!myMembership) notFound()

  const isTeacher = myMembership.role === 'teacher'

  if (isTeacher) {
    // Teacher View
    const students = members?.filter((m) => m.role === 'student') ?? []

    const submissionsCount = await Promise.all(
      (assignments ?? []).map(async (ass) => {
        const { count } = await supabase
          .from('assignment_submissions')
          .select('*', { count: 'exact', head: true })
          .eq('assignment_id', ass.id)
        return { assignmentId: ass.id, count: count ?? 0 }
      })
    )
    const subCountMap = new Map(submissionsCount.map((c) => [c.assignmentId, c.count]))

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-10">

        <Link
          href="/classroom"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors uppercase tracking-wider cursor-pointer"
        >
          ← Sınıflarıma Dön
        </Link>

        {/* Classroom Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/[0.04]">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">
                Öğretmen Görünümü 🎓
              </span>
            </div>
            <h1 className="text-3xl font-display font-black text-white">{classroom.name}</h1>
            {classroom.description && (
              <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">{classroom.description}</p>
            )}
          </div>

          <div className="shrink-0 flex flex-col items-end gap-3">
            <div className="max-w-xs w-full">
              <JoinCodeDisplay code={classroom.join_code} />
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/classroom/${classroomId}/magazine`}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.06] text-slate-300 hover:text-white hover:border-white/[0.12] text-sm transition-all"
              >
                <BookOpen className="w-4 h-4 text-primary" />
                Dergi
              </Link>
              <Link
                href={`/classroom/${classroomId}/analytics`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 text-sm font-semibold transition-colors border border-violet-500/20"
              >
                <BarChart2 className="w-4 h-4" /> Sınıf İstatistikleri
              </Link>
            </div>
          </div>
        </div>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Assignments Column (Left 2/3) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-violet-400" />
                <h2 className="text-xl font-display font-bold text-white">Görevler & Ödevler</h2>
              </div>
              <Link
                href={`/classroom/${classroomId}/assignments/new`}
                className={cn(
                  buttonVariants({ variant: 'outline' }),
                  "border-violet-500/20 bg-violet-500/5 text-violet-400 hover:bg-violet-500/15 hover:border-violet-500/35 rounded-xl text-xs font-semibold uppercase tracking-wider px-4 py-2 transition-all duration-300 cursor-pointer"
                )}
              >
                <Plus className="w-4 h-4 mr-1" />
                Yeni Ödev Ver
              </Link>
            </div>

            {assignments === null || assignments.length === 0 ? (
              <div className="glass-card rounded-2xl p-8 text-center border border-white/[0.04]">
                <BookOpen className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-400">Bu sınıfta henüz bir ödev verilmedi.</p>
                <Link
                  href={`/classroom/${classroomId}/assignments/new`}
                  className="mt-4 inline-flex text-xs font-bold text-violet-400 hover:text-white transition-colors"
                >
                  İlk ödevi hemen ekle →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {assignments.map((ass) => {
                  const subCount = subCountMap.get(ass.id) ?? 0
                  return (
                    <div key={ass.id} className="relative space-y-1">
                      <AssignmentCard
                        assignment={ass}
                        classroomId={classroomId}
                        isTeacher={true}
                      />
                      <div className="flex items-center justify-between px-3 text-[10px] text-slate-500">
                        <span>Teslim: {subCount} / {students.length} Öğrenci</span>
                        <span className="capitalize">
                          Görünürlük: {ass.visibility === 'class_visible' ? 'Sınıfa Açık' : 'Gizli'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Members Column (Right 1/3) */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              <h2 className="text-xl font-display font-bold text-white">Sınıf Üyeleri</h2>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                {members?.filter(m => m.role !== 'parent').length ?? 0}
              </span>
            </div>

            <div className="glass-card rounded-2xl border border-white/[0.04] p-4.5 space-y-4 max-h-[500px] overflow-y-auto bg-slate-950/20">
              {members?.filter(m => m.role !== 'parent').map((member) => (
                <div key={member.user_id} className="flex items-center justify-between gap-3 py-2 border-b border-white/[0.03] last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {member.profile?.display_name?.[0] ?? member.profile?.username?.[0] ?? '?'}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white truncate max-w-[140px]">
                        {member.profile?.display_name ?? member.profile?.username ?? 'Katılımcı'}
                      </p>
                      <p className="text-[9px] text-slate-500 truncate max-w-[140px]">
                        @{member.profile?.username}
                      </p>
                    </div>
                  </div>

                  <span className={cn(
                    "text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border shrink-0",
                    member.role === 'teacher'
                      ? "bg-violet-500/10 text-violet-300 border-violet-500/20"
                      : "bg-sky-500/10 text-sky-300 border-sky-500/20"
                  )}>
                    {member.role === 'teacher' ? 'Öğretmen' : 'Öğrenci'}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    )
  } else {
    // ----------------------------------------------------
    // STUDENT VIEW
    // ----------------------------------------------------

    const assignmentIds = (assignments ?? []).map(a => a.id)
    const { data: submissions } = assignmentIds.length > 0
      ? await supabase
          .from('assignment_submissions')
          .select('*, project:projects(current_word_count)')
          .in('assignment_id', assignmentIds)
          .eq('student_id', user.id)
      : { data: [] }

    const submissionsMap = new Map((submissions ?? []).map(s => [s.assignment_id, s]))

    const totalWords = (submissions ?? []).reduce(
      (sum, s: any) => sum + (s.project?.current_word_count ?? 0), 0
    )
    const completedCount = (submissions ?? []).filter(
      s => s.status === 'submitted' || s.status === 'graded'
    ).length

    const { data: userGoals } = await supabase
      .from('user_writing_goals')
      .select('streak_current')
      .eq('user_id', user.id)
      .maybeSingle()

    const streak = userGoals?.streak_current ?? 0

    const totalXp = Math.floor(totalWords * 0.1) + (completedCount * 100)
    const levelThreshold = 300
    const currentLevel = Math.floor(totalXp / levelThreshold) + 1
    const currentLevelBaseXp = (currentLevel - 1) * levelThreshold
    const xpProgress = totalXp - currentLevelBaseXp
    const progressPercentage = Math.min(100, Math.floor((xpProgress / levelThreshold) * 100))

    const Ranks = [
      { maxLvl: 1, title: "Sözcük Çırağı 🌱", desc: "Kelimelerle dans etmeyi yeni öğreniyor." },
      { maxLvl: 2, title: "Cümle Sihirbazı 🔮", desc: "Tümceleri sihirli formüllerle süslüyor." },
      { maxLvl: 3, title: "Hikaye Kaşifi 🧭", desc: "Gizemli kurgu ormanlarını keşfe çıktı." },
      { maxLvl: 4, title: "Fikir Mimarı 🏰", desc: "Karakterlerin kaderini elleriyle inşa ediyor." },
      { maxLvl: 5, title: "Kelime Simyacısı 🧪", desc: "Sözcükleri saf altına çeviriyor!" },
      { maxLvl: 999, title: "Efsanevi Anlatıcı 👑", desc: "Kalıbına sığmayan, destansı bir kalem." }
    ]
    const activeRank = Ranks.find(r => currentLevel <= r.maxLvl) || Ranks[Ranks.length - 1]

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-12 relative">

        <div className="absolute top-10 left-10 w-48 h-48 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 right-10 w-64 h-64 bg-fuchsia-500/5 rounded-full blur-3xl pointer-events-none" />

        <Link
          href="/classroom"
          className="inline-flex items-center gap-2 text-xs font-semibold text-sky-400 hover:text-white transition-colors uppercase tracking-widest relative z-10 cursor-pointer"
        >
          ← Sınıflarıma Dön
        </Link>

        {/* Karşılama Başlığı */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/[0.04] relative z-10">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20">
                Sınıf: {classroom.name}
              </span>
            </div>
            <h1 className="text-3xl font-display font-black text-white tracking-tight">
              Merhaba! Bugün yazmaya hazır mısın? ✍️
            </h1>
            <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
              Öğretmeninin verdiği ödevleri tamamlayarak yazarlık seviyeni yükselt!
            </p>
          </div>
          <Link
            href={`/classroom/${classroomId}/magazine`}
            className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.06] text-slate-300 hover:text-white hover:border-white/[0.12] text-sm transition-all"
          >
            <BookOpen className="w-4 h-4 text-primary" />
            Dergi
          </Link>
        </div>

        {/* Metrik Kartları */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">

          {/* Yazarlık Seviyesi */}
          <div className="glass-card rounded-2xl p-6 border border-sky-500/25 shadow-[0_0_20px_rgba(14,165,233,0.05)] bg-slate-950/40 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl pointer-events-none" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Yazarlık Puanı</span>
                <span className="text-xs px-2 py-0.5 bg-sky-500/10 text-sky-300 rounded border border-sky-500/20 font-mono font-bold">
                  SEVİYE {currentLevel}
                </span>
              </div>

              <div className="space-y-2">
                <p className="text-xl font-display font-extrabold text-white flex items-center gap-2">
                  <Crown className="w-5 h-5 text-yellow-400 shrink-0" />
                  {activeRank.title}
                </p>
                <p className="text-[11px] text-slate-400 leading-normal">{activeRank.desc}</p>
              </div>
            </div>

            <div className="space-y-2 mt-6">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Mevcut Seviye İlerlemesi</span>
                <span className="font-mono text-slate-300 font-bold">{xpProgress} / {levelThreshold} puan</span>
              </div>
              <div className="w-full bg-slate-900 border border-white/[0.04] rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-600 h-full rounded-full shadow-[0_0_12px_rgba(14,165,233,0.4)]"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Yazma Serisi */}
          <div className="glass-card rounded-2xl p-6 border border-amber-500/20 bg-slate-950/40 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

            <div className="space-y-3">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest">Günlük Yazma Serisi</span>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Flame className={cn(
                    "w-12 h-12 transition-transform duration-500",
                    streak > 0 ? "text-amber-500 fill-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)] animate-bounce" : "text-slate-700"
                  )} />
                </div>
                <div>
                  <p className="text-3xl font-display font-black text-white">{streak} GÜN</p>
                  <p className="text-xs text-slate-400">Kesintisiz yazdığın gün sayısı</p>
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-500 leading-normal mt-4">
              {streak > 0
                ? "Harika! Her gün yazmaya devam et! ⚡"
                : "Bugün birkaç kelime yazarak serini başlat! 🚀"}
            </p>
          </div>

          {/* Başarı Özeti */}
          <div className="glass-card rounded-2xl p-6 border border-fuchsia-500/20 bg-slate-950/40 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-24 h-24 bg-fuchsia-500/5 rounded-full blur-2xl pointer-events-none" />

            <div className="space-y-4">
              <span className="text-[10px] font-bold text-fuchsia-400 uppercase tracking-widest">Başarı Özeti</span>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-2xl font-display font-black text-white">{totalWords}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">Toplam Kelime</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-display font-black text-white">{completedCount} / {assignments?.length ?? 0}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest">Teslim Edilen</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-fuchsia-400 font-bold uppercase tracking-wider mt-4">
              <Trophy className="w-3.5 h-3.5" />
              <span>Akademi Rozetleri Bekliyor</span>
            </div>
          </div>

        </div>

        {/* Ödev Listesi */}
        <div className="space-y-6 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-500/15 flex items-center justify-center">
              <Zap className="w-4 h-4 text-sky-400" />
            </div>
            <h2 className="text-xl font-display font-bold text-white tracking-wide">
              Aktif Ödevler
            </h2>
          </div>

          {assignments === null || assignments.length === 0 ? (
            <div className="glass-card rounded-3xl p-12 text-center border border-white/[0.04]">
              <BookOpen className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-400">Öğretmeniniz henüz bir ödev eklemedi.</p>
              <p className="text-xs text-slate-500 mt-1">Yeni bir ödev verildiğinde burada görünecektir.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {assignments.map((ass) => {
                const sub = submissionsMap.get(ass.id) ?? null
                return (
                  <AssignmentCard
                    key={ass.id}
                    assignment={ass}
                    classroomId={classroomId}
                    submission={sub}
                    isTeacher={false}
                  />
                )
              })}
            </div>
          )}
        </div>

      </div>
    )
  }
}
