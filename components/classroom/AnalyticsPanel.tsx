'use client'

import { Users, Flame, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SubmissionRate {
  assignment_id: string
  title: string
  submitted: number
  total: number
  rate: number
}

interface StreakEntry {
  user_id: string
  streak_current: number
}

interface GradeDistribution {
  '0-49': number
  '50-69': number
  '70-84': number
  '85-100': number
}

interface Props {
  submissionRate: SubmissionRate[]
  streaks: StreakEntry[]
  gradeDistribution: GradeDistribution
  members: { user_id: string; profile: { display_name: string | null; username: string } | null }[]
}

export function AnalyticsPanel({ submissionRate, streaks, gradeDistribution, members }: Props) {
  const totalGraded = Object.values(gradeDistribution).reduce((a, b) => a + b, 0)
  const gradeRanges = [
    { label: '85–100', key: '85-100' as const, color: 'bg-emerald-500' },
    { label: '70–84', key: '70-84' as const, color: 'bg-sky-500' },
    { label: '50–69', key: '50-69' as const, color: 'bg-amber-500' },
    { label: '0–49',  key: '0-49'  as const, color: 'bg-red-500' },
  ]

  return (
    <div className="space-y-8">
      {/* Teslim Oranı */}
      <section className="space-y-3">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Users className="w-4 h-4 text-violet-400" /> Ödev Teslim Oranları
        </h3>
        {submissionRate.length === 0 && <p className="text-sm text-slate-500">Henüz ödev yok.</p>}
        {submissionRate.map(a => (
          <div key={a.assignment_id} className="glass-card rounded-xl p-4 border border-white/[0.05] space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-white line-clamp-1">{a.title}</span>
              <span className="text-xs font-bold text-slate-300">{a.submitted}/{a.total} · %{a.rate}</span>
            </div>
            <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', a.rate >= 80 ? 'bg-emerald-500' : a.rate >= 50 ? 'bg-amber-500' : 'bg-red-500')}
                style={{ width: `${a.rate}%` }}
              />
            </div>
          </div>
        ))}
      </section>

      {/* Günlük Yazma Serileri */}
      <section className="space-y-3">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Flame className="w-4 h-4 text-orange-400" /> Günlük Yazma Serileri
        </h3>
        {streaks.length === 0 && <p className="text-sm text-slate-500">Henüz aktif yazma serisi yok.</p>}
        {[...streaks]
          .sort((a, b) => b.streak_current - a.streak_current)
          .map(s => {
            const member = members.find(m => m.user_id === s.user_id)
            const name = member?.profile?.display_name ?? member?.profile?.username ?? 'Öğrenci'
            return (
              <div key={s.user_id} className="flex items-center justify-between glass-card rounded-xl px-4 py-3 border border-white/[0.05]">
                <span className="text-sm text-white font-medium">{name}</span>
                <span className="text-sm font-bold text-orange-400 flex items-center gap-1">
                  🔥 {s.streak_current} gün
                </span>
              </div>
            )
          })}
      </section>

      {/* Not Dağılımı */}
      <section className="space-y-3">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <Star className="w-4 h-4 text-amber-400" /> Not Dağılımı
        </h3>
        {totalGraded === 0 && <p className="text-sm text-slate-500">Henüz notlandırılmış teslim yok.</p>}
        {totalGraded > 0 && (
          <div className="glass-card rounded-xl p-5 border border-white/[0.05] space-y-3">
            {gradeRanges.map(r => {
              const count = gradeDistribution[r.key]
              const pct = totalGraded > 0 ? Math.round((count / totalGraded) * 100) : 0
              return (
                <div key={r.key} className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>{r.label}</span>
                    <span>{count} teslim · %{pct}</span>
                  </div>
                  <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full transition-all', r.color)} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
