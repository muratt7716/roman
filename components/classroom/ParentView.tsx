import { GraduationCap, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ClassroomAssignment, AssignmentSubmission } from '@/types'

interface Props {
  studentName: string
  studentAvatar: string | null
  assignments: ClassroomAssignment[]
  submissions: AssignmentSubmission[]
  streak: number
}

export function ParentView({ studentName, studentAvatar, assignments, submissions, streak }: Props) {
  const submissionMap = Object.fromEntries(submissions.map(s => [s.assignment_id, s]))

  return (
    <div className="space-y-8">
      {/* Çocuk Profili */}
      <div className="glass-card rounded-2xl p-6 border border-white/[0.05] flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary shrink-0">
          {studentAvatar ? (
            <img src={studentAvatar} className="w-full h-full object-cover rounded-2xl" alt={studentName} />
          ) : (
            studentName[0]?.toUpperCase()
          )}
        </div>
        <div>
          <p className="text-lg font-display font-bold text-white">{studentName}</p>
          <div className="flex items-center gap-3 mt-1">
            {streak > 0 && (
              <span className="flex items-center gap-1 text-xs font-semibold text-orange-400">
                🔥 {streak} günlük seri
              </span>
            )}
            <span className="text-xs text-slate-400">{submissions.filter(s => s.status !== 'draft').length} ödev teslim edildi</span>
          </div>
        </div>
      </div>

      {/* Ödev Listesi */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-violet-400" /> Ödevler
        </h2>
        {assignments.length === 0 && (
          <p className="text-sm text-slate-500">Henüz ödev atanmamış.</p>
        )}
        {assignments.map(a => {
          const sub = submissionMap[a.id]
          const isPast = a.due_date ? new Date(a.due_date) < new Date() : false
          return (
            <div key={a.id} className="glass-card rounded-xl p-4 border border-white/[0.05] space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-white text-sm">{a.title}</p>
                  {a.due_date && (
                    <p className={cn('text-xs mt-0.5', isPast ? 'text-red-400' : 'text-slate-400')}>
                      Son teslim: {new Date(a.due_date).toLocaleDateString('tr-TR')}
                    </p>
                  )}
                </div>
                <span className={cn(
                  'text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap',
                  !sub || sub.status === 'draft' ? 'bg-slate-500/10 text-slate-400' :
                  sub.status === 'submitted' ? 'bg-sky-500/10 text-sky-400' :
                  'bg-emerald-500/10 text-emerald-400'
                )}>
                  {!sub || sub.status === 'draft' ? 'Teslim Edilmedi' : sub.status === 'submitted' ? 'Teslim Edildi' : 'Notlandı'}
                </span>
              </div>

              {sub?.status === 'graded' && (
                <div className="border-t border-white/[0.04] pt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-bold text-white">{sub.grade}/100</span>
                  </div>
                  {sub.teacher_comment && (
                    <div className="bg-white/[0.02] rounded-lg p-3 border border-white/[0.04]">
                      <p className="text-xs text-slate-300 leading-relaxed">{sub.teacher_comment}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
