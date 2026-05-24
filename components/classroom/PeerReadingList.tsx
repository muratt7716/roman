import Link from 'next/link'
import { BookOpen, Eye } from 'lucide-react'

interface PeerSubmission {
  student_name: string
  project_slug: string
  chapter_id: string
  word_count: number
}

interface Props {
  submissions: PeerSubmission[]
  assignmentTitle: string
}

export function PeerReadingList({ submissions, assignmentTitle }: Props) {
  if (submissions.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-6 border border-white/[0.05] text-center">
        <Eye className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-sm text-slate-400">Henüz teslim edilen yazı yok.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {submissions.map((sub, i) => (
        <div key={i} className="glass-card rounded-xl p-4 border border-white/[0.05] flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-white text-sm">{sub.student_name}</p>
            <p className="text-xs text-slate-400 mt-0.5">{sub.word_count.toLocaleString('tr-TR')} kelime</p>
          </div>
          <Link
            href={`/projects/${sub.project_slug}/read/${sub.chapter_id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 text-xs font-semibold transition-colors shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5" /> Oku
          </Link>
        </div>
      ))}
    </div>
  )
}
