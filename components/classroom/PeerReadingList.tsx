import Link from 'next/link'
import { BookOpen, Eye } from 'lucide-react'

interface PeerSubmission {
  submission_id: string
  student_name: string
}

interface Props {
  submissions: PeerSubmission[]
  /** Metin inceleme sayfası — sınıfa açık ödevde arkadaşlar da okuyabilir */
  reviewBase: string
}

export function PeerReadingList({ submissions, reviewBase }: Props) {
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
      {submissions.map(sub => (
        <div key={sub.submission_id} className="glass-card rounded-xl p-4 border border-white/[0.05] flex items-center justify-between gap-4">
          <p className="font-semibold text-white text-sm">{sub.student_name}</p>
          <Link
            href={`${reviewBase}/${sub.submission_id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 text-xs font-semibold transition-colors shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5" /> Oku
          </Link>
        </div>
      ))}
    </div>
  )
}
