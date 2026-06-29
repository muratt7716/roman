import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, GraduationCap, ArrowRight, BookOpen, Compass, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ClassroomCard } from '@/components/classroom/ClassroomCard'
import { DeleteClassroomButton } from '@/components/classroom/DeleteClassroomButton'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Sınıflarım — Kalem Birliği' }
export const dynamic = 'force-dynamic'

export default async function ClassroomListPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch classroom memberships
  const { data: membershipsData } = await supabase
    .from('classroom_members')
    .select('role, classroom:classrooms(*)')
    .eq('user_id', user.id)

  const memberships = (membershipsData ?? [])
    .filter((m: any) => m.classroom !== null)

  const classroomIds = memberships.map((m: any) => m.classroom.id)

  // Fetch member & assignment counts for all classrooms in parallel
  const counts = await Promise.all(
    classroomIds.map(async (id) => {
      const [{ count: members }, { count: assignments }] = await Promise.all([
        supabase.from('classroom_members').select('*', { count: 'exact', head: true }).eq('classroom_id', id),
        supabase.from('classroom_assignments').select('*', { count: 'exact', head: true }).eq('classroom_id', id)
      ])
      return {
        id,
        memberCount: members ?? 0,
        assignmentCount: assignments ?? 0
      }
    })
  )

  const countsMap = new Map(counts.map(c => [c.id, c]))

  const teacherClasses = memberships.filter((m: any) => m.role === 'teacher')
  const studentClasses = memberships.filter((m: any) => m.role === 'student')

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-white/[0.04]">
        <div className="space-y-1">
          <h1 className="text-3xl font-display font-black tracking-tight text-white flex items-center gap-2.5">
            <GraduationCap className="w-8 h-8 text-primary" />
            <span>Akademi / Sınıflarım</span>
          </h1>
          <p className="text-sm text-slate-400">Yazarlık eğitimlerini yönet, ödevlerini teslim et ve seviye atla.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Link
            href="/classroom/join"
            className={cn(
              buttonVariants({ variant: 'outline' }),
              "border-sky-500/20 bg-sky-500/5 text-sky-400 hover:bg-sky-500/10 hover:border-sky-500/35 rounded-xl text-xs font-semibold uppercase tracking-wider px-5 py-5 transition-all duration-300 shrink-0 cursor-pointer"
            )}
          >
            Sınıfa Katıl 🔑
          </Link>
          <Link
            href="/classroom/new"
            className={cn(
              buttonVariants(),
              "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(124,58,237,0.25)] hover:shadow-[0_0_28px_rgba(124,58,237,0.45)] rounded-xl text-xs font-semibold uppercase tracking-wider px-5 py-5 transition-all duration-300 shrink-0 cursor-pointer"
            )}
          >
            <Plus className="w-4 h-4 mr-1" />
            Sınıf Oluştur
          </Link>
        </div>
      </div>

      {memberships.length === 0 ? (
        <div className="relative glass-card rounded-3xl p-12 text-center max-w-2xl mx-auto border border-white/[0.04] overflow-hidden">
          {/* Neon back glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto shadow-[0_0_25px_rgba(124,58,237,0.15)]">
              <GraduationCap className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-display font-bold text-white">Akademiye Henüz Katılmadın!</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
                Öğretmeninden aldığın 6 haneli sınıf kodu ile hemen sınıfa katılabilir ya da kendin bir sınıf oluşturup öğrencilerini davet edebilirsin.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
              <Link
                href="/classroom/join"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/25 text-sm font-semibold hover:bg-sky-500/25 transition-colors cursor-pointer"
              >
                Sınıf Kodu Gir 🔑
              </Link>
              <Link
                href="/classroom/new"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
              >
                Yeni Sınıf Oluştur
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-12">
          
          {/* Student Classes (Ages 13-19 Gamified Hub) */}
          {studentClasses.length > 0 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/15 flex items-center justify-center">
                    <Compass className="w-4 h-4 text-sky-400" />
                  </div>
                  <h2 className="text-xl font-display font-bold text-white tracking-wide">Öğrenci Olduğum Sınıflar</h2>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-sky-500/10 text-sky-300 border border-sky-500/20 rounded-full">
                  {studentClasses.length} Aktif Sınıf
                </span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {studentClasses.map((m: any) => {
                  const stats = countsMap.get(m.classroom.id)
                  return (
                    <ClassroomCard
                      key={m.classroom.id}
                      classroom={m.classroom}
                      role={m.role}
                      memberCount={stats?.memberCount}
                      assignmentCount={stats?.assignmentCount}
                    />
                  )
                })}
              </div>
            </div>
          )}

          {/* Teacher Classes */}
          {teacherClasses.length > 0 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-violet-400" />
                  </div>
                  <h2 className="text-xl font-display font-bold text-white tracking-wide">Yönettiğim Sınıflar</h2>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-violet-500/10 text-violet-300 border border-violet-500/20 rounded-full">
                  {teacherClasses.length} Sınıf
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {teacherClasses.map((m: any) => {
                  const stats = countsMap.get(m.classroom.id)
                  return (
                    <div key={m.classroom.id} className="relative group">
                      <ClassroomCard
                        classroom={m.classroom}
                        role={m.role}
                        memberCount={stats?.memberCount}
                        assignmentCount={stats?.assignmentCount}
                      />
                      <DeleteClassroomButton
                        classroomId={m.classroom.id}
                        classroomName={m.classroom.name}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  )
}
