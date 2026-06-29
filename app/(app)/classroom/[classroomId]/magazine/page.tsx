import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus, BookOpen } from 'lucide-react'
import { MagazineCard } from '@/components/magazine/MagazineCard'
import type { ClassMagazine } from '@/types'

export const dynamic = 'force-dynamic'

export default async function ClassroomMagazinePage({ params }: { params: Promise<{ classroomId: string }> }) {
  const { classroomId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: classroom } = await supabase
    .from('classrooms')
    .select('name, school_name, owner_id')
    .eq('id', classroomId)
    .single()

  if (!classroom) notFound()

  const isTeacher = classroom.owner_id === user.id

  const { data: magazines } = await supabase
    .from('class_magazines')
    .select('*')
    .eq('classroom_id', classroomId)
    .order('created_at', { ascending: false })

  const published = (magazines ?? []).filter(m => m.status === 'published')
  const drafts = (magazines ?? []).filter(m => m.status === 'draft')

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            Sınıf Dergisi
          </h1>
          <p className="text-sm text-slate-400 mt-1">{classroom.name} · {classroom.school_name}</p>
        </div>
        {isTeacher && (
          <Link
            href={`/classroom/${classroomId}/magazine/new`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold transition-all"
          >
            <Plus className="w-4 h-4" />
            Yeni Sayı
          </Link>
        )}
      </div>

      {isTeacher && drafts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Taslaklar</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {drafts.map(m => <MagazineCard key={m.id} magazine={m as ClassMagazine} classroomId={classroomId} isTeacher={isTeacher} />)}
          </div>
        </div>
      )}

      {published.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-green-400 uppercase tracking-wider">Yayımlanan Sayılar</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {published.map(m => <MagazineCard key={m.id} magazine={m as ClassMagazine} classroomId={classroomId} isTeacher={isTeacher} />)}
          </div>
        </div>
      ) : (
        !isTeacher && (
          <div className="text-center py-16 text-slate-500">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Henüz yayımlanan sayı yok.</p>
          </div>
        )
      )}
    </div>
  )
}
