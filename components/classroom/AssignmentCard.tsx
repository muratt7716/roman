import Link from 'next/link'
import { Clock, CheckCircle2, Circle, Pencil, AlertCircle, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ClassroomAssignment, AssignmentSubmission } from '@/types'

interface Props {
  assignment: ClassroomAssignment
  classroomId: string
  submission?: AssignmentSubmission | null
  isTeacher?: boolean
}

const STATUS_META = {
  draft:     { label: 'Yazılıyor 📝', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.05)]', icon: Pencil },
  submitted: { label: 'Teslim Edildi ⏳', color: 'bg-sky-500/10 text-sky-400 border-sky-500/20 hover:border-sky-500/30 shadow-[0_0_15px_rgba(14,165,233,0.05)]', icon: CheckCircle2 },
  graded:    { label: 'Notlandı 🏆', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.05)]', icon: Sparkles },
}

export function AssignmentCard({ assignment, classroomId, submission, isTeacher = false }: Props) {
  const isPast = assignment.due_date ? new Date(assignment.due_date) < new Date() : false
  const status = submission?.status
  
  // Decide badge and glows
  let activeStyle = "hover:border-primary/25 hover:shadow-[0_0_15px_rgba(124,58,237,0.05)]"
  
  if (!isTeacher && status) {
    activeStyle = STATUS_META[status].color
  }

  return (
    <Link
      href={`/classroom/${classroomId}/assignments/${assignment.id}`}
      className={cn(
        "group relative glass-card rounded-xl p-4.5 block border border-white/[0.04] transition-all duration-300 hover:scale-[1.015] overflow-hidden cursor-pointer",
        activeStyle
      )}
    >
      {/* Visual Accent for completion */}
      {!isTeacher && status === 'graded' && (
        <div className="absolute right-0 top-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
      )}

      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="space-y-1.5 min-w-0">
          <p className="font-medium text-white group-hover:text-primary transition-colors text-sm line-clamp-1 leading-snug">
            {assignment.title}
          </p>
          
          {assignment.due_date && (
            <p className={cn(
              'text-[11px] flex items-center gap-1.5', 
              isPast ? 'text-red-400 font-medium' : 'text-slate-400'
            )}>
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>
                {new Date(assignment.due_date).toLocaleDateString('tr-TR', { 
                  day: 'numeric', 
                  month: 'short', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
              {isPast && !status && (
                <span className="text-[9px] bg-red-500/15 text-red-300 border border-red-500/25 px-1 py-0.2 rounded shrink-0">
                  Gecikti
                </span>
              )}
            </p>
          )}
        </div>

        {/* Status badges */}
        {!isTeacher && (
          <div className="shrink-0 pt-0.5">
            {status ? (
              <span className={cn(
                'flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
                status === 'graded' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' :
                status === 'submitted' ? 'bg-sky-500/10 text-sky-300 border-sky-500/20' :
                'bg-amber-500/10 text-amber-300 border-amber-500/20'
              )}>
                {status === 'graded' && <Sparkles className="w-2.5 h-2.5" />}
                {status === 'submitted' && <CheckCircle2 className="w-2.5 h-2.5" />}
                {status === 'draft' && <Pencil className="w-2.5 h-2.5" />}
                {status === 'graded' ? `Skor: ${submission?.grade}` : STATUS_META[status].label}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-white/[0.04] text-slate-400 border-white/[0.08]">
                <Circle className="w-2.5 h-2.5 text-slate-500" />
                Başlanmadı
              </span>
            )}
          </div>
        )}

        {isTeacher && (
          <div className="shrink-0 pt-0.5">
            <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-violet-500/10 text-violet-300 border-violet-500/20">
              Görev
            </span>
          </div>
        )}
      </div>
    </Link>
  )
}
