'use client'

import { useEffect, useSyncExternalStore } from 'react'

interface StreakData {
  streak: number
  best: number
  lastDate: string | null
}

const KEY = 'kb_writing_streak'
const EVENT = 'kb-streak-change'
const EMPTY: StreakData = { streak: 0, best: 0, lastDate: null }

/**
 * Türkiye'deki takvim günü (YYYY-MM-DD). Eskiden toISOString (UTC) kullanılıyordu:
 * gece 00:00–03:00 arası yazılan yazı önceki güne sayılıyor, seri bozuluyordu.
 */
function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date())
}

function parse(raw: string | null): StreakData {
  if (!raw) return EMPTY
  try { return JSON.parse(raw) as StreakData } catch { return EMPTY }
}

// localStorage gizli sekmede veya kota dolunca hata fırlatabilir — seri
// kaybolsun, editör çökmesin.
function read(): string | null {
  try { return localStorage.getItem(KEY) } catch { return null }
}

function save(data: StreakData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data))
    window.dispatchEvent(new Event(EVENT))
  } catch { /* yok say */ }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange)
  window.addEventListener('storage', onChange) // başka sekmede yazılırsa
  return () => {
    window.removeEventListener(EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

export function useStreak(hasWrittenToday: boolean) {
  // Sunucuda null → boş seri; tarayıcıda localStorage. Ham string döndüğü için
  // anlık görüntü içerik değişmedikçe aynı kalır (useSyncExternalStore bunu ister).
  const raw = useSyncExternalStore(subscribe, read, () => null)

  // Kullanıcı bugün yazınca seriyi güncelle
  useEffect(() => {
    if (!hasWrittenToday) return
    const current = parse(read())
    const todayStr = today()
    if (current.lastDate === todayStr) return // bugün zaten sayıldı

    let newStreak = 1
    if (current.lastDate) {
      const diffDays = (Date.parse(todayStr) - Date.parse(current.lastDate)) / 86400000
      newStreak = diffDays <= 1 ? current.streak + 1 : 1
    }
    save({ streak: newStreak, best: Math.max(newStreak, current.best), lastDate: todayStr })
  }, [hasWrittenToday])

  return parse(raw)
}
