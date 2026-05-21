'use client'

import { useState, useEffect } from 'react'
import { Target, Pencil, Check, X, Flame } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WritingGoalResponse } from '@/types'

export function WritingGoalCard() {
  const [data, setData] = useState<WritingGoalResponse | null>(null)
  const [editing, setEditing] = useState(false)
  const [inputVal, setInputVal] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/writing-goal')
      .then(r => r.json())
      .then((d: WritingGoalResponse) => {
        setData(d)
        setInputVal(String(d.daily_target))
      })
      .catch(() => {})
  }, [])

  async function saveTarget() {
    const target = parseInt(inputVal)
    if (isNaN(target) || target < 50 || target > 10000) return
    setSaving(true)
    const res = await fetch('/api/writing-goal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ daily_target: target }),
    })
    if (res.ok && data) {
      setData({ ...data, daily_target: target })
    }
    setSaving(false)
    setEditing(false)
  }

  if (!data) {
    return (
      <div className="glass-card rounded-2xl p-5 h-32 animate-pulse" />
    )
  }

  const pct = Math.min(100, Math.round((data.today_words / data.daily_target) * 100))
  const done = data.today_words >= data.daily_target

  return (
    <div className="glass-card rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-medium">Günlük Hedef</span>
        </div>
        <div className="flex items-center gap-2">
          {data.streak_current > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber-400 font-medium">
              <Flame className="w-3.5 h-3.5" />
              {data.streak_current} gün
            </span>
          )}
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="text-muted-foreground hover:text-white transition-colors p-1"
              title="Hedefi düzenle"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                className="w-20 bg-white/[0.06] border border-white/[0.1] rounded-md px-2 py-0.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary"
                min={50}
                max={10000}
              />
              <button
                onClick={saveTarget}
                disabled={saving}
                className="text-emerald-400 hover:text-emerald-300 p-1"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => { setEditing(false); setInputVal(String(data.daily_target)) }}
                className="text-muted-foreground hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              done ? 'bg-emerald-500' : 'bg-primary'
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className={cn('font-medium', done ? 'text-emerald-400' : 'text-muted-foreground')}>
            {data.today_words.toLocaleString('tr-TR')} kelime
          </span>
          <span className="text-muted-foreground">
            {done ? '✓ Tamamlandı!' : `/ ${data.daily_target.toLocaleString('tr-TR')}`}
          </span>
        </div>
      </div>

      {/* Best streak */}
      {data.streak_best > 0 && (
        <p className="text-[11px] text-muted-foreground/60">
          En uzun seri: {data.streak_best} gün
        </p>
      )}
    </div>
  )
}
