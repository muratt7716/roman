'use client'

import { BADGE_META, ALL_BADGE_CODES } from '@/lib/badges'
import type { UserBadge } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  badges: UserBadge[]
}

export function BadgesGrid({ badges }: Props) {
  const earnedMap = new Map(badges.map(b => [b.badge_code, b]))

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {ALL_BADGE_CODES.map(code => {
        const meta = BADGE_META[code]
        const earned = earnedMap.get(code)
        return (
          <div
            key={code}
            title={earned ? `${meta.label} — ${new Date(earned.earned_at).toLocaleDateString('tr-TR')}` : meta.desc}
            className={cn(
              'flex flex-col items-center gap-1.5 p-4 rounded-xl border text-center transition-all',
              earned
                ? 'border-white/[0.1] bg-white/[0.04] text-white'
                : 'border-white/[0.04] bg-white/[0.01] text-muted-foreground/40 grayscale'
            )}
          >
            <span className="text-2xl">{meta.icon}</span>
            <span className="text-xs font-medium leading-tight">{meta.label}</span>
            {earned && (
              <span className="text-[10px] text-muted-foreground">
                {new Date(earned.earned_at).toLocaleDateString('tr-TR')}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
