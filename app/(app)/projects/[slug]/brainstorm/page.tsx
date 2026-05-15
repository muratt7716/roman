import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BrainstormBoard } from '@/components/brainstorm/BrainstormBoard'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function BrainstormPage({ params }: Props) {
  const { slug: id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: notes } = await supabase
    .from('brainstorm_notes')
    .select('*')
    .eq('project_id', id)
    .order('created_at')

  return (
    <BrainstormBoard
      projectId={id}
      currentUserId={user.id}
      initialNotes={notes ?? []}
    />
  )
}
