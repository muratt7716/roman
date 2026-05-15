'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'

interface Props {
  projectId: string
  chapterCount: number
}

export function NewChapterButton({ projectId, chapterCount }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [isPending, startTransition] = useTransition()

  async function create() {
    if (!title.trim()) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data, error } = await supabase
      .from('chapters')
      .insert({
        project_id: projectId,
        title: title.trim(),
        order_index: chapterCount,
        created_by: user.id,
      })
      .select()
      .single()

    if (!error && data) {
      setOpen(false)
      setTitle('')
      startTransition(() => {
        router.push(`/projects/${projectId}/write/${data.id}`)
        router.refresh()
      })
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="bg-primary text-white gap-2">
        <Plus className="w-4 h-4" /> Yeni Bölüm
      </Button>
    )
  }

  return (
    <div className="flex items-end gap-2">
      <div className="space-y-1">
        <Label className="text-xs">Bölüm Adı</Label>
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && create()}
          placeholder="örn. Birinci Bölüm"
          className="bg-surface-2 border-border w-52"
          autoFocus
        />
      </div>
      <Button onClick={create} disabled={!title.trim() || isPending} className="bg-primary text-white">
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Oluştur'}
      </Button>
      <Button variant="ghost" onClick={() => { setOpen(false); setTitle('') }}>İptal</Button>
    </div>
  )
}
