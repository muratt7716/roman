import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { BookOpen, Calendar, Clock, Eye, EyeOff, Sparkles, GraduationCap } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { SubmissionList } from '@/components/classroom/SubmissionList'
import { StudentAssignmentView } from '@/components/classroom/StudentAssignmentView'
import { cn } from '@/lib/utils'

interface PageProps {
  params: Promise<{ classroomId: string; assignmentId: string }>
}

export const metadata: Metadata = { title: 'Ödev Detayı — Kalem Birliği' }
export const dynamic = 'force-dynamic'

export default async function AssignmentPage({ params }: PageProps) {
  const { classroomId, assignmentId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch classroom, assignment and membership
  const [
    { data: classroom },
    { data: assignment },
    { data: myMembership }
  ] = await Promise.all([
    supabase.from('classrooms').select('*').eq('id', classroomId).single(),
    supabase.from('classroom_assignments').select('*').eq('id', assignmentId).eq('classroom_id', classroomId).single(),
    supabase.from('classroom_members').select('role').eq('classroom_id', classroomId).eq('user_id', user.id).single(),
  ])

  if (!classroom || !assignment || !myMembership) notFound()

  const isTeacher = myMembership.role === 'teacher'
  const isPast = assignment.due_date ? new Date(assignment.due_date) < new Date() : false

  if (isTeacher) {
    // ----------------------------------------------------
    // TEACHER MODE: assignment details + submissions list
    // ----------------------------------------------------
    const { data: submissions } = await supabase
      .from('assignment_submissions')
      .select('*, student:profiles(id, username, display_name, avatar_url)')
      .eq('assignment_id', assignmentId)
      .order('submitted_at', { ascending: false })

    const subs = submissions ?? []

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        
        {/* Back navigation */}
        <Link
          href={`/classroom/${classroomId}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors uppercase tracking-wider cursor-pointer"
        >
          ← Sınıf Paneline Dön
        </Link>

        {/* Assignment Brief Card */}
        <div className="glass-card rounded-2xl p-6 border border-white/[0.05] space-y-4 bg-gradient-to-br from-white/[0.01] to-transparent">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">
              Yazma Görevi (Ödev)
            </span>
            
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                {assignment.visibility === 'class_visible' ? (
                  <>
                    <Eye className="w-3.5 h-3.5 text-sky-400" /> Sınıfa Açık
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-slate-500" /> Gizli
                  </>
                )}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-display font-black text-white">{assignment.title}</h1>
            
            {assignment.due_date && (
              <p className={cn('text-xs flex items-center gap-1.5 pt-1', isPast ? 'text-red-400' : 'text-slate-400')}>
                <Calendar className="w-4 h-4 text-violet-400" />
                Son Teslim Tarihi: {new Date(assignment.due_date).toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            )}
          </div>

          {assignment.description && (
            <div className="text-sm leading-relaxed text-slate-300 pt-4 border-t border-white/[0.04] whitespace-pre-wrap">
              {assignment.description}
            </div>
          )}
        </div>

        {/* Submissions Section */}
        <div className="space-y-4">
          <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-400" />
            Öğrenci Teslimleri
          </h2>
          
          <SubmissionList initialSubmissions={subs} classroomId={classroomId} />
        </div>

      </div>
    )
  } else {
    // ----------------------------------------------------
    // STUDENT MODE: highly stylized gamified guest briefing
    // ----------------------------------------------------
    const { data: submission } = await supabase
      .from('assignment_submissions')
      .select('*')
      .eq('assignment_id', assignmentId)
      .eq('student_id', user.id)
      .maybeSingle()

    const hasSubmitted = submission?.status === 'submitted' || submission?.status === 'graded'

    // Countdown / Friendly Alert calculation
    let timeLeftText = 'Süresiz Görev 🧭'
    let timeLeftColor = 'text-slate-400 bg-slate-500/5 border-slate-500/10'

    if (assignment.due_date && !hasSubmitted) {
      const diffMs = new Date(assignment.due_date).getTime() - Date.now()
      if (diffMs < 0) {
        timeLeftText = 'Görev Süresi Sona Erdi! ⏰'
        timeLeftColor = 'text-red-400 bg-red-500/10 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.05)]'
      } else {
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
        const diffDays = Math.floor(diffHours / 24)
        if (diffDays > 0) {
          timeLeftText = `Kalan Süre: ${diffDays} Gün ${diffHours % 24} Saat ⏳`
          timeLeftColor = 'text-sky-400 bg-sky-500/10 border-sky-500/20 shadow-[0_0_15px_rgba(14,165,233,0.05)]'
        } else {
          timeLeftText = `Son Saatler: ${diffHours} Saat Kaldı! ⚡`
          timeLeftColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.05)]'
        }
      }
    }

    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-8 relative">
        
        {/* Background neon orbs */}
        <div className="absolute top-10 left-10 w-48 h-48 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        {/* Back Link */}
        <Link
          href={`/classroom/${classroomId}`}
          className="inline-flex items-center gap-2 text-xs font-semibold text-sky-400 hover:text-white transition-colors uppercase tracking-widest relative z-10 cursor-pointer"
        >
          ← Sınıf Lobisine Dön
        </Link>

        {/* Gamified Briefing Card */}
        <div className="relative glass-card rounded-3xl p-6 md:p-8 border border-sky-500/15 bg-slate-950/40 overflow-hidden space-y-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 border-b border-white/[0.04] pb-5">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-sky-400" />
                AKTİF QUEST (GÖREV)
              </span>
            </div>
            
            <div className={cn(
              "text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-xl border shrink-0 text-center",
              timeLeftColor
            )}>
              {timeLeftText}
            </div>
          </div>

          <div className="space-y-3 relative z-10">
            <h1 className="text-2xl md:text-3xl font-display font-black text-white leading-tight">
              {assignment.title}
            </h1>
            
            {assignment.due_date && (
              <p className={cn('text-xs flex items-center gap-1.5', isPast ? 'text-red-400' : 'text-slate-400')}>
                <Clock className="w-4 h-4 text-sky-400" />
                Teslim Hedefi: {new Date(assignment.due_date).toLocaleDateString('tr-TR', {
                  day: 'numeric',
                  month: 'long',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            )}
          </div>

          {/* Render student interactive action views */}
          <div className="relative z-10 pt-4 border-t border-white/[0.04]">
            <StudentAssignmentView
              assignment={assignment}
              classroomId={classroomId}
              initialSubmission={submission}
            />
          </div>
        </div>

      </div>
    )
  }
}
