'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  chapterId: string
}

export function ViewTracker({ chapterId }: Props) {
  const tracked = useRef(false)

  useEffect(() => {
    if (tracked.current) return
    tracked.current = true
    const supabase = createClient()
    supabase.rpc('increment_chapter_view', { p_chapter_id: chapterId }).then(() => {})
  }, [chapterId])

  return null
}
