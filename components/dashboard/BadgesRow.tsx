import { BADGE_META, ALL_BADGE_CODES } from '@/lib/badges'
import type { UserBadge } from '@/types'

interface Props {
  badges: UserBadge[]
}

export function BadgesRow({ badges }: Props) {
  if (badges.length === 0) return null

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
        Rozetler ({badges.length}/{ALL_BADGE_CODES.length})
      </h2>
      <div className="flex flex-wrap gap-2">
        {badges.map(badge => {
          const meta = BADGE_META[badge.badge_code as keyof typeof BADGE_META]
          if (!meta) return null
          return (
            <div
              key={badge.badge_code}
              title={`${meta.label} — ${meta.desc}\n${new Date(badge.earned_at).toLocaleDateString('tr-TR')}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-medium text-white cursor-default"
            >
              <span>{meta.icon}</span>
              <span>{meta.label}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
