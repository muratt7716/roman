import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CharacterWiki } from '@/components/wiki/CharacterWiki'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function WikiPage({ params }: Props) {
  const { slug: id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: characters } = await supabase
    .from('character_profiles')
    .select('*')
    .eq('project_id', id)
    .order('created_at')

  return (
    <CharacterWiki
      projectId={id}
      currentUserId={user.id}
      initialCharacters={characters ?? []}
    />
  )
}
