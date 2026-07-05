'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type ChapterLockStatus = 'pending' | 'acquired' | 'held_by_other' | 'unavailable'

export interface ChapterLockState {
  status: ChapterLockStatus
  holderName: string | null
}

const HEARTBEAT_MS = 45_000 // kilit tazeleme (DB tarafında 2 dk bayatlama eşiği var)
const RETRY_MS = 30_000     // başkası tutuyorsa yeniden deneme

/**
 * Bölüm düzenleme kilidi. Aynı bölümü iki kişinin aynı anda düzenleyip
 * birbirinin kaydını ezmesini önler. DB'de acquire_chapter_lock RPC'si
 * yoksa (şema henüz uygulanmadıysa) 'unavailable' döner ve editör
 * eskisi gibi çalışır — sessiz düşüş.
 */
export function useChapterLock(chapterId: string, enabled: boolean): ChapterLockState {
  const [state, setState] = useState<ChapterLockState>({ status: 'pending', holderName: null })

  useEffect(() => {
    if (!enabled) return

    const supabase = createClient()
    let disposed = false
    let timer: ReturnType<typeof setInterval> | null = null

    const clearTimer = () => { if (timer) { clearInterval(timer); timer = null } }

    const schedule = (ms: number) => {
      clearTimer()
      timer = setInterval(() => { void tryAcquire() }, ms)
    }

    async function tryAcquire() {
      const { data, error } = await supabase.rpc('acquire_chapter_lock', { p_chapter_id: chapterId })
      if (disposed) return

      if (error) {
        // Fonksiyon DB'de yok ya da erişilemedi — kilitsiz devam et
        setState({ status: 'unavailable', holderName: null })
        clearTimer()
        return
      }

      const result = data as { acquired?: boolean; holder_name?: string; error?: string } | null
      if (result?.acquired) {
        setState({ status: 'acquired', holderName: null })
        schedule(HEARTBEAT_MS)
      } else if (result?.holder_name) {
        setState({ status: 'held_by_other', holderName: result.holder_name })
        schedule(RETRY_MS)
      } else {
        setState({ status: 'unavailable', holderName: null })
        clearTimer()
      }
    }

    const release = () => {
      // beklemeye gerek yok — bayatlama eşiği güvenlik ağı
      void supabase.rpc('release_chapter_lock', { p_chapter_id: chapterId })
    }

    void tryAcquire()
    window.addEventListener('pagehide', release)

    return () => {
      disposed = true
      clearTimer()
      window.removeEventListener('pagehide', release)
      release()
    }
  }, [chapterId, enabled])

  return state
}
