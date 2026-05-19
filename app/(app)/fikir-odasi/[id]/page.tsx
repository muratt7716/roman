import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { IdeaRoomClient } from '@/components/idea/IdeaRoomClient'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function IdeaThreadPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: thread }, { data: messages }, { data: joinRequests }] = await Promise.all([
    supabase
      .from('idea_threads')
      .select('*, author:profiles!idea_threads_user_id_fkey(*)')
      .eq('id', id)
      .single(),
    supabase
      .from('idea_messages')
      .select('*, author:profiles!idea_messages_user_id_fkey(*)')
      .eq('thread_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('idea_join_requests')
      .select('*, requester:profiles!idea_join_requests_user_id_fkey(*)')
      .eq('thread_id', id),
  ])

  if (!thread) notFound()

  return (
    <IdeaRoomClient
      thread={thread as any}
      initialMessages={(messages ?? []) as any}
      initialJoinRequests={(joinRequests ?? []) as any}
      currentUserId={user.id}
    />
  )
}
