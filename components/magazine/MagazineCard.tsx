'use client'

import Link from 'next/link'
import { BookOpen, Clock, CheckCircle2 } from 'lucide-react'
import type { ClassMagazine } from '@/types'

interface Props {
  magazine: ClassMagazine
  classroomId: string
  isTeacher: boolean
}

export function MagazineCard({ magazine, classroomId, isTeacher }: Props) {
  const href = magazine.status === 'draft' && isTeacher
    ? `/classroom/${classroomId}/magazine/${magazine.id}/edit`
    : `/classroom/${classroomId}/magazine/${magazine.id}`

  return (
    <Link href={href} className="block p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-primary/30 hover:bg-white/[0.04] transition-all group">
      <div className="flex items-start justify-between gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <BookOpen className="w-5 h-5 text-primary" />
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${magazine.status === 'published' ? 'bg-green-500/15 text-green-400' : 'bg-amber-500/15 text-amber-400'}`}>
          {magazine.status === 'published' ? 'Yayımlandı' : 'Taslak'}
        </span>
      </div>
      <div className="mt-3">
        <p className="text-sm font-semibold text-white group-hover:text-primary transition-colors line-clamp-2">{magazine.title}</p>
        <p className="text-xs text-slate-500 mt-1">Sayı #{magazine.issue_number}</p>
      </div>
      <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
        {magazine.status === 'published'
          ? <><CheckCircle2 className="w-3 h-3 text-green-400" />{magazine.published_at ? new Date(magazine.published_at).toLocaleDateString('tr') : ''}</>
          : <><Clock className="w-3 h-3" />Düzenleniyor</>
        }
      </div>
    </Link>
  )
}
