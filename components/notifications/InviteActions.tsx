'use client'

import { useState } from 'react'
import { Check, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface Props {
  inviteId: string
  projectId: string
  roleId: string
}

export function InviteActions({ inviteId, projectId, roleId }: Props) {
  const [loading, setLoading] = useState<'accept' | 'decline' | null>(null)
  const [done, setDone] = useState<'accepted' | 'declined' | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function accept() {
    setLoading('accept')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(null); return }

    const { error: memberError } = await supabase.from('project_members').insert({
      project_id: projectId,
      user_id: user.id,
      role_id: roleId,
    })

    if (memberError && memberError.code !== '23505') {
      toast.error('Kabul edilemedi, tekrar dene')
      setLoading(null)
      return
    }

    await supabase.from('project_invites').update({ status: 'accepted' }).eq('id', inviteId)
    toast.success('Daveti kabul ettin! Projeye katıldın.')
    setDone('accepted')
    setLoading(null)
    router.refresh()
  }

  async function decline() {
    setLoading('decline')
    await supabase.from('project_invites').update({ status: 'declined' }).eq('id', inviteId)
    toast.success('Davet reddedildi.')
    setDone('declined')
    setLoading(null)
  }

  if (done === 'accepted') {
    return <span className="text-xs text-emerald-400 font-medium">✓ Kabul edildi</span>
  }
  if (done === 'declined') {
    return <span className="text-xs text-muted-foreground">Reddedildi</span>
  }

  return (
    <div className="flex gap-2 mt-2">
      <Button
        size="sm"
        onClick={accept}
        disabled={!!loading}
        className="h-7 text-xs bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 gap-1"
      >
        {loading === 'accept' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
        Kabul Et
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={decline}
        disabled={!!loading}
        className="h-7 text-xs border-border text-muted-foreground hover:text-foreground gap-1"
      >
        {loading === 'decline' ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
        Reddet
      </Button>
    </div>
  )
}
