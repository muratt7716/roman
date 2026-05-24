'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PenLine, Lock, Sparkles, Star, MessageCircle } from 'lucide-react'
import type { ClassroomAssignment, AssignmentSubmission } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  assignment: ClassroomAssignment
  classroomId: string
  initialSubmission: AssignmentSubmission | null
}

export function StudentAssignmentView({ assignment, classroomId, initialSubmission }: Props) {
  const [submission, setSubmission] = useState(initialSubmission)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function startWriting() {
    setLoading(true)
    const res = await fetch(
      `/api/classroom/${classroomId}/assignments/${assignment.id}/start`,
      { method: 'POST' }
    )
    if (res.ok) {
      const { submission_id, project_id, chapter_id } = await res.json()
      router.push(`/projects/${project_id}/write/${chapter_id}?submission_id=${submission_id}`)
    }
    setLoading(false)
  }

  function continueWriting() {
    if (!submission?.project_id) return
    router.push(`/projects/${submission.project_id}/write`)
  }

  const isLocked = submission?.status === 'submitted' || submission?.status === 'graded'
  const grade = submission?.grade ?? 0

  // Gamified grading brackets
  let gradeBadge = 'YAZAR 🌱'
  let gradeBg = 'from-violet-500/10 to-purple-500/5 border-purple-500/20'
  let gradeText = 'text-purple-400'
  let starsCount = 1

  if (grade >= 90) {
    gradeBadge = 'EFSANEVİ YAZAR 👑'
    gradeBg = 'from-amber-500/20 to-yellow-500/5 border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.15)]'
    gradeText = 'text-amber-400'
    starsCount = 3
  } else if (grade >= 75) {
    gradeBadge = 'BÜYÜCÜ YAZAR ⚡'
    gradeBg = 'from-indigo-500/20 to-violet-500/5 border-indigo-500/35 shadow-[0_0_20px_rgba(99,102,241,0.1)]'
    gradeText = 'text-indigo-400'
    starsCount = 2
  } else if (grade >= 50) {
    gradeBadge = 'HİKAYECİ 📝'
    gradeBg = 'from-emerald-500/10 to-teal-500/5 border-emerald-500/20'
    gradeText = 'text-emerald-400'
    starsCount = 1
  }

  return (
    <div className="space-y-6">
      {assignment.description && (
        <div className="glass-card rounded-2xl p-5 text-sm leading-relaxed text-slate-300 border border-white/[0.04] bg-gradient-to-br from-white/[0.01] to-transparent shadow-inner relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
          <p className="whitespace-pre-wrap">{assignment.description}</p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
        {!submission && (
          <button
            onClick={startWriting}
            disabled={loading}
            className="group relative flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.55)] transition-all duration-300 disabled:opacity-50 active:scale-95 overflow-hidden cursor-pointer"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <PenLine className="w-4.5 h-4.5 group-hover:rotate-12 transition-transform" />
            <span>{loading ? 'Yazı Odası Hazırlanıyor...' : 'Maceraya Başla (Yazmaya Başla)'}</span>
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          </button>
        )}

        {submission?.status === 'draft' && (
          <button
            onClick={continueWriting}
            className="group relative flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl bg-white/[0.07] border border-white/[0.1] text-white hover:text-primary text-sm font-semibold hover:bg-white/[0.12] hover:border-primary/40 shadow-sm hover:shadow-[0_0_20px_rgba(124,58,237,0.15)] transition-all duration-300 active:scale-95 cursor-pointer"
          >
            <PenLine className="w-4.5 h-4.5 text-primary group-hover:translate-x-0.5 transition-transform" />
            <span>Yazmaya Devam Et</span>
          </button>
        )}

        {isLocked && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.05] text-xs text-muted-foreground">
            <Lock className="w-4 h-4 text-violet-400/80 animate-pulse" />
            <span>
              {submission.status === 'submitted' 
                ? 'Görev teslim edildi — öğretmen büyülü değerlendirmesini hazırlıyor! 🔮' 
                : 'Görev değerlendirildi. Raporu aşağıda bulabilirsin! 👇'}
            </span>
          </div>
        )}
      </div>

      {submission?.status === 'graded' && (
        <div className={cn(
          "relative rounded-2xl p-6 border bg-gradient-to-br transition-all duration-500 overflow-hidden",
          gradeBg
        )}>
          {/* Decorative glowing orb inside card */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            {/* Left side: Grade circle & Badges */}
            <div className="flex items-center gap-5">
              <div className="relative w-20 h-20 rounded-full flex items-center justify-center bg-black/45 border-2 border-dashed border-white/10 shrink-0">
                {/* Score */}
                <div className="text-center">
                  <p className={cn("text-3xl font-display font-black leading-none tracking-tight", gradeText)}>{grade}</p>
                  <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Skor</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  {Array.from({ length: starsCount }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">{gradeBadge}</h4>
                <p className="text-xs text-muted-foreground">Öğretmen değerlendirme raporu</p>
              </div>
            </div>

            {/* Right side: Teacher comment block */}
            {submission.teacher_comment && (
              <div className="flex-1 md:max-w-md relative bg-black/35 rounded-2xl p-4 border border-white/[0.05] flex gap-3 items-start">
                <MessageCircle className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Öğretmenin Notu</p>
                  <p className="text-xs leading-relaxed text-slate-200 italic">"{submission.teacher_comment}"</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
