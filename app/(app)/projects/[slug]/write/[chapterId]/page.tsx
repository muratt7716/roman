import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ChapterEditorClient } from '@/components/editor/ChapterEditorClient'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string; chapterId: string }>
  searchParams: Promise<{ submission_id?: string }>
}

export default async function ChapterEditorPage({ params, searchParams }: Props) {
  const { slug: projectId, chapterId } = await params
  const { submission_id } = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: chapter },
    { data: profile },
    { data: latestVersion },
    { data: members },
    { data: project },
  ] = await Promise.all([
    supabase.from('chapters').select('*').eq('id', chapterId).single() as any,
    supabase.from('profiles').select('id, username, display_name, avatar_url').eq('id', user.id).single() as any,
    supabase.from('chapter_versions').select('content').eq('chapter_id', chapterId).order('created_at', { ascending: false }).limit(1).single() as any,
    supabase.from('project_members').select('user_id').eq('project_id', projectId) as any,
    supabase.from('projects').select('owner_id').eq('id', projectId).single() as any,
  ])

  if (!chapter) notFound()

  // Check if submission is locked
  let locked = false
  if (submission_id) {
    const { data: submission } = await supabase
      .from('assignment_submissions')
      .select('status')
      .eq('id', submission_id)
      .eq('student_id', user.id)
      .maybeSingle()
    locked = submission?.status === 'submitted' || submission?.status === 'graded'
  }

  const currentUser = {
    id: user.id,
    username: profile?.username ?? user.email?.split('@')[0] ?? 'user',
    displayName: profile?.display_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
  }

  const memberIds = (members ?? []).map((m: any) => m.user_id as string)
  const isOwner = project?.owner_id === user.id

  return (
    <ChapterEditorClient
      chapter={chapter}
      projectId={projectId}
      currentUser={currentUser}
      initialContent={latestVersion?.content ?? ''}
      memberIds={memberIds}
      isOwner={isOwner}
      locked={locked}
      submissionId={submission_id}
    />
  )
}
