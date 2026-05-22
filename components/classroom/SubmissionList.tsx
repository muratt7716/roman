'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { GradePanel } from './GradePanel'
import { cn } from '@/lib/utils'
import type { AssignmentSubmission } from '@/types'

interface Props {
  initialSubmissions: AssignmentSubmission[]
  classroomId: string
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  draft:     { label: 'Devam Ediyor', color: 'text-amber-400' },
  submitted: { label: 'Teslim Edildi', color: 'text-sky-400' },
  graded:    { label: 'Notlandı',      color: 'text-emerald-400' },
}

export function SubmissionList({ initialSubmissions, classroomId }: Props) {
  const [submissions, setSubmissions] = useState(initialSubmissions)
  const [expanded, setExpanded] = useState<string | null>(null)

  function updateSubmission(updated: AssignmentSubmission) {
    setSubmissions(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s))
  }

  if (submissions.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">Henüz teslim yok.</p>
  }

  return (
    <div className="space-y-2">
      {submissions.map(sub => {
        const meta = STATUS_LABEL[sub.status]
        const isOpen = expanded === sub.id
        const student = (sub as any).student

        return (
          <div key={sub.id} className="glass-card rounded-xl overflow-hidden">
            <button
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/[0.02] transition-colors"
              onClick={() => setExpanded(isOpen ? null : sub.id)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {student?.display_name?.[0] ?? student?.username?.[0] ?? '?'}
                </div>
                <span className="text-sm font-medium truncate">
                  {student?.display_name ?? student?.username ?? 'Öğrenci'}
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={cn('text-xs font-medium', meta?.color)}>{meta?.label}</span>
                {sub.grade !== null && <span className="text-xs text-emerald-400 font-bold">{sub.grade}/100</span>}
                {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </button>

            {isOpen && (
              <div className="px-4 pb-4 space-y-3 border-t border-white/[0.05]">
                {sub.project_id && (
                  <Link
                    href={`/projects/${sub.project_id}/write`}
                    target="_blank"
                    className="flex items-center gap-1.5 text-xs text-primary hover:text-accent transition-colors mt-3"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Yazıyı Görüntüle
                  </Link>
                )}
                {(sub.status === 'submitted' || sub.status === 'graded') && (
                  <GradePanel submission={sub} onGraded={updateSubmission} />
                )}
                {sub.status === 'draft' && (
                  <p className="text-xs text-muted-foreground">Öğrenci henüz teslim etmedi.</p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
