'use client'

import { useState } from 'react'
import { UserPlus, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  authorId: string
  initialFollowing: boolean
  followerCount: number
}

export function FollowButton({ authorId, initialFollowing, followerCount }: Props) {
  const [following, setFollowing] = useState(initialFollowing)
  const [count, setCount] = useState(followerCount)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ following_id: authorId }),
      })
      if (!res.ok) return
      const { following: newState } = await res.json()
      setFollowing(newState)
      setCount(prev => prev + (newState ? 1 : -1))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant={following ? 'outline' : 'default'}
      size="sm"
      onClick={toggle}
      disabled={loading}
      className={cn(
        'gap-2',
        following
          ? 'border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:text-white'
          : 'bg-primary hover:bg-primary/90 text-white'
      )}
    >
      {following ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
      {following ? 'Takip Ediliyor' : 'Takip Et'}
      {count > 0 && <span className="text-xs opacity-60 ml-0.5">{count}</span>}
    </Button>
  )
}
