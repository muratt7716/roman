'use client'

import { useEffect, useState } from 'react'

interface StreakData {
  streak: number
  best: number
  lastDate: string | null
}

const KEY = 'kb_writing_streak'

function today() {
  return new Date().toISOString().slice(0, 10)
}

function load(): StreakData {
  if (typeof window === 'undefined') return { streak: 0, best: 0, lastDate: null }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { streak: 0, best: 0, lastDate: null }
    return JSON.parse(raw) as StreakData
  } catch {
    return { streak: 0, best: 0, lastDate: null }
  }
}

function save(data: StreakData) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(data))
}

export function useStreak(hasWrittenToday: boolean) {
  const [data, setData] = useState<StreakData>({ streak: 0, best: 0, lastDate: null })

  // Load on mount
  useEffect(() => {
    setData(load())
  }, [])

  // Update streak when user writes
  useEffect(() => {
    if (!hasWrittenToday) return
    const current = load()
    const todayStr = today()

    if (current.lastDate === todayStr) return // already counted today

    let newStreak: number
    if (current.lastDate === null) {
      newStreak = 1
    } else {
      // Check if yesterday
      const last = new Date(current.lastDate)
      const diff = (new Date(todayStr).getTime() - last.getTime()) / 86400000
      newStreak = diff <= 1 ? current.streak + 1 : 1
    }

    const updated: StreakData = {
      streak: newStreak,
      best: Math.max(newStreak, current.best),
      lastDate: todayStr,
    }
    save(updated)
    setData(updated)
  }, [hasWrittenToday])

  return data
}
