import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ChapterEditorClient } from '@/components/editor/ChapterEditorClient'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string; chapterId: string }>
}

export default async function ChapterEditorPage({ params }: Props) {
  const { slug: projectId, chapterId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: chapter }, { data: profile }, { data: latestVersion }, { data: members }] = await Promise.all([
    supabase.from('chapters').select('*').eq('id', chapterId).single(),
    supabase.from('profiles').select('id, username, display_name, avatar_url').eq('id', user.id).single(),
    supabase.from('chapter_versions').select('content').eq('chapter_id', chapterId).order('created_at', { ascending: false }).limit(1).single(),
    supabase.from('project_members').select('user_id').eq('project_id', projectId),
  ])

  if (!chapter) notFound()

  const currentUser = {
    id: user.id,
    username: profile?.username ?? user.email?.split('@')[0] ?? 'user',
    displayName: profile?.display_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
  }

  const memberIds = (members ?? []).map((m: any) => m.user_id as string)

  return (
    <ChapterEditorClient
      chapter={chapter}
      projectId={projectId}
      currentUser={currentUser}
      initialContent={latestVersion?.content ?? ''}
      memberIds={memberIds}
    />
  )
}
