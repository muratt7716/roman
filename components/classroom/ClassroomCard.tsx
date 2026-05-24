import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Users, BookOpen, GraduationCap } from 'lucide-react'
import type { Classroom, ClassroomRole } from '@/types'

interface Props {
  classroom: Classroom
  role: ClassroomRole
  memberCount?: number
  assignmentCount?: number
}

export function ClassroomCard({ classroom, role, memberCount = 0, assignmentCount = 0 }: Props) {
  const isTeacher = role === 'teacher'
  const isParent  = role === 'parent'
  
  return (
    <Link
      href={`/classroom/${classroom.id}`}
      className={cn(
        "group relative glass-card rounded-2xl p-5 block transition-all duration-300 overflow-hidden border border-white/[0.05] hover:scale-[1.02] cursor-pointer",
        isTeacher 
          ? "hover:border-violet-500/30 hover:shadow-[0_0_20px_rgba(139,92,246,0.1)]" 
          : "hover:border-sky-500/30 hover:shadow-[0_0_20px_rgba(14,165,233,0.1)]"
      )}
    >
      {/* Decorative Neon Side Light */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-[3px] transition-all duration-300",
        isTeacher ? "bg-violet-500 group-hover:w-[4px]" : "bg-sky-500 group-hover:w-[4px]"
      )} />

      {/* Decorative back glow orb */}
      <div className={cn(
        "absolute -top-12 -right-12 w-24 h-24 rounded-full blur-2xl opacity-10 transition-opacity duration-300 pointer-events-none",
        isTeacher ? "bg-violet-500 group-hover:opacity-20" : "bg-sky-500 group-hover:opacity-20"
      )} />

      <div className="space-y-3 relative z-10 pl-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display font-semibold text-white group-hover:text-primary transition-colors line-clamp-1 text-base">
            {classroom.name}
          </h3>
          <span className={cn(
            'shrink-0 flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
            isTeacher
              ? 'bg-violet-500/10 text-violet-300 border-violet-500/20'
              : isParent
              ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
              : 'bg-sky-500/10 text-sky-300 border-sky-500/20'
          )}>
            <GraduationCap className="w-3 h-3" />
            {isTeacher ? 'Öğretmen' : isParent ? 'Veli' : 'Öğrenci'}
          </span>
        </div>

        {classroom.description ? (
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed min-h-[2rem]">
            {classroom.description}
          </p>
        ) : (
          <p className="text-xs text-slate-500 italic leading-relaxed min-h-[2rem]">
            Açıklama girilmemiş.
          </p>
        )}

        <div className="flex items-center gap-4 pt-2 border-t border-white/[0.04] text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5 hover:text-slate-200 transition-colors">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>{memberCount} Üye</span>
          </span>
          <span className="flex items-center gap-1.5 hover:text-slate-200 transition-colors">
            <BookOpen className="w-3.5 h-3.5 text-slate-500" />
            <span>{assignmentCount} Görev (Ödev)</span>
          </span>
        </div>
      </div>
    </Link>
  )
}
