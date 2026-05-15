import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { TimelineView } from '@/components/timeline/TimelineView'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function TimelinePage({ params }: Props) {
  const { slug: id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: events } = await supabase
    .from('timeline_events')
    .select('*')
    .eq('project_id', id)
    .order('order_index')

  return (
    <TimelineView
      projectId={id}
      currentUserId={user.id}
      initialEvents={events ?? []}
    />
  )
}
