'use client'

import { useState } from 'react'
import { BookMarked, BookOpen, CheckCheck, Bookmark } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { ReadingListStatus } from '@/types'

const STATUS_META: Record<ReadingListStatus, { label: string; icon: React.ElementType; color: string }> = {
  want:    { label: 'Sonra Oku', icon: Bookmark,   color: 'text-amber-400' },
  reading: { label: 'Okuyorum', icon: BookOpen,   color: 'text-blue-400' },
  done:    { label: 'Bitirdim', icon: CheckCheck, color: 'text-emerald-400' },
}

interface Props {
  projectId: string
  initialStatus: ReadingListStatus | null
}

export function ReadingListButton({ projectId, initialStatus }: Props) {
  const [status, setStatus] = useState<ReadingListStatus | null>(initialStatus)
  const [loading, setLoading] = useState(false)

  async function setListStatus(newStatus: ReadingListStatus | null) {
    if (loading) return
    setLoading(true)
    try {
      if (newStatus === null) {
        await fetch(`/api/reading-list?project_id=${projectId}`, { method: 'DELETE' })
        setStatus(null)
      } else {
        const res = await fetch('/api/reading-list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_id: projectId, status: newStatus }),
        })
        if (res.ok) setStatus(newStatus)
      }
    } finally {
      setLoading(false)
    }
  }

  const current = status ? STATUS_META[status] : null
  const CurrentIcon = current?.icon ?? BookMarked

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={loading}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm border transition-colors',
          'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]',
          current ? current.color : 'text-muted-foreground'
        )}
      >
        <CurrentIcon className="w-4 h-4" />
        {current ? current.label : 'Listeye Ekle'}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {(Object.entries(STATUS_META) as [ReadingListStatus, typeof STATUS_META[ReadingListStatus]][]).map(([key, meta]) => {
          const Icon = meta.icon
          return (
            <DropdownMenuItem
              key={key}
              onClick={() => setListStatus(key)}
              className={cn('gap-2', status === key && 'text-primary')}
            >
              <Icon className={cn('w-4 h-4', meta.color)} />
              {meta.label}
            </DropdownMenuItem>
          )
        })}
        {status && (
          <DropdownMenuItem onClick={() => setListStatus(null)} className="gap-2 text-muted-foreground">
            <BookMarked className="w-4 h-4" />
            Listeden Çıkar
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
