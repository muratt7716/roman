import Link from 'next/link'
import { Clock, CheckCircle2, Circle, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ClassroomAssignment, AssignmentSubmission } from '@/types'

interface Props {
  assignment: ClassroomAssignment
  classroomId: string
  submission?: AssignmentSubmission | null
  isTeacher?: boolean
}

const STATUS_META = {
  draft:     { label: 'Devam Ediyor', color: 'text-amber-400',   icon: Pencil },
  submitted: { label: 'Teslim Edildi', color: 'text-sky-400',    icon: CheckCircle2 },
  graded:    { label: 'Notlandı',      color: 'text-emerald-400', icon: CheckCircle2 },
}

export function AssignmentCard({ assignment, classroomId, submission, isTeacher = false }: Props) {
  const isPast = assignment.due_date ? new Date(assignment.due_date) < new Date() : false
  const status = submission?.status
  const StatusIcon = status ? STATUS_META[status].icon : Circle

  return (
    <Link
      href={`/classroom/${classroomId}/assignments/${assignment.id}`}
      className="glass-card rounded-xl p-4 block hover:border-white/[0.15] transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-white text-sm line-clamp-2">{assignment.title}</p>
        {!isTeacher && status && (
          <span className={cn('shrink-0 flex items-center gap-1 text-[10px] font-medium', STATUS_META[status].color)}>
            <StatusIcon className="w-3 h-3" />
            {STATUS_META[status].label}
          </span>
        )}
        {!isTeacher && !status && (
          <span className="shrink-0 text-[10px] text-muted-foreground">Başlanmadı</span>
        )}
      </div>

      {assignment.due_date && (
        <p className={cn('text-xs mt-2 flex items-center gap-1', isPast ? 'text-red-400' : 'text-muted-foreground')}>
          <Clock className="w-3 h-3" />
          {new Date(assignment.due_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
        </p>
      )}

      {!isTeacher && submission?.grade !== null && submission?.grade !== undefined && (
        <p className="text-xs mt-1 text-emerald-400 font-medium">Not: {submission.grade}/100</p>
      )}
    </Link>
  )
}
