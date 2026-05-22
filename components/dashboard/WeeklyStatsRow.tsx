import { PenLine, Heart, UserPlus, Eye } from 'lucide-react'
import type { WeeklyStats } from '@/types'

interface Props {
  stats: WeeklyStats
}

const ITEMS = [
  { key: 'wordsWritten',      label: 'Kelime',   icon: PenLine,  color: 'text-violet-400'  },
  { key: 'reactionsReceived', label: 'Alkış',    icon: Heart,    color: 'text-rose-400'    },
  { key: 'newFollowers',      label: 'Takipçi',  icon: UserPlus, color: 'text-sky-400'     },
  { key: 'totalViews',        label: 'Okunma',   icon: Eye,      color: 'text-emerald-400' },
] as const

export function WeeklyStatsRow({ stats }: Props) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Bu Hafta</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ITEMS.map(({ key, label, icon: Icon, color }) => (
          <div key={key} className="glass-card rounded-xl p-4">
            <Icon className={`w-4 h-4 ${color} mb-2`} />
            <p className="text-xl font-display font-bold">
              {(stats[key] ?? 0).toLocaleString('tr-TR')}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
