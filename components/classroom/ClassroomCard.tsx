import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Users, BookOpen } from 'lucide-react'
import type { Classroom, ClassroomRole } from '@/types'

interface Props {
  classroom: Classroom
  role: ClassroomRole
  memberCount?: number
  assignmentCount?: number
}

export function ClassroomCard({ classroom, role, memberCount = 0, assignmentCount = 0 }: Props) {
  return (
    <Link
      href={`/classroom/${classroom.id}`}
      className="glass-card rounded-2xl p-5 block hover:border-white/[0.15] transition-colors space-y-3"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display font-semibold text-white line-clamp-1">{classroom.name}</h3>
        <span className={cn(
          'shrink-0 whitespace-nowrap text-[10px] font-bold px-2 py-0.5 rounded-full',
          role === 'teacher' ? 'bg-violet-500/20 text-violet-300' : 'bg-sky-500/20 text-sky-300'
        )}>
          {role === 'teacher' ? 'Öğretmen' : 'Öğrenci'}
        </span>
      </div>
      {classroom.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{classroom.description}</p>
      )}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{memberCount}</span>
        <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{assignmentCount} ödev</span>
      </div>
    </Link>
  )
}
