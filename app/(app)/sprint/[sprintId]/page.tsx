import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SprintRoom } from '@/components/sprint/SprintRoom'
import type { SprintParticipant } from '@/types'

export const metadata: Metadata = { title: 'Sprint Odası — Kalem Birliği' }
export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ sprintId: string }> }

export default async function SprintRoomPage({ params }: Props) {
  const { sprintId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: sprint }, { data: participants }, { data: projects }] = await Promise.all([
    supabase.from('writing_sprints').select('*').eq('id', sprintId).single(),
    supabase
      .from('sprint_participants')
      .select('*, profile:profiles(id, username, display_name, avatar_url)')
      .eq('sprint_id', sprintId),
    supabase
      .from('projects')
      .select('id, title, slug')
      .eq('owner_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(10),
  ])

  if (!sprint) notFound()

  const isJoined = (participants ?? []).some(p => p.user_id === user.id)

  // Her projenin ilk bölümünü bul
  const projectIds = (projects ?? []).map(p => p.id)
  const { data: chapters } = projectIds.length > 0
    ? await supabase
        .from('chapters')
        .select('id, project_id')
        .in('project_id', projectIds)
        .order('order_index', { ascending: true })
    : { data: [] as { id: string; project_id: string }[] }

  const userProjects = (projects ?? []).map(p => ({
    id: p.id,
    title: p.title,
    defaultChapterId: (chapters ?? []).find(c => c.project_id === p.id)?.id,
  }))

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-12 space-y-6">
      <Link
        href="/sprint"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors uppercase tracking-wider cursor-pointer"
      >
        ← Sprintlere Dön
      </Link>

      <SprintRoom
        sprint={{ ...sprint, participant_count: (participants ?? []).length }}
        initialParticipants={(participants ?? []) as SprintParticipant[]}
        currentUserId={user.id}
        isJoined={isJoined}
        userProjects={userProjects}
      />
    </div>
  )
}
