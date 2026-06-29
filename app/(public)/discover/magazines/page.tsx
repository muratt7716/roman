import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { BookOpen } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DiscoverMagazinesPage() {
  const supabase = await createClient()

  const { data: magazines } = await supabase
    .from('class_magazines')
    .select('id, title, issue_number, published_at, classroom_id, classroom:classrooms(name, school_name)')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(24)

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-display font-bold text-white flex items-center gap-2">
          <BookOpen className="w-7 h-7 text-primary" />
          Sınıf Dergileri
        </h1>
        <p className="text-sm text-slate-400">Öğretmen ve öğrencilerin oluşturduğu dönemsel yazı dergileri.</p>
      </div>

      {(magazines ?? []).length === 0 ? (
        <div className="text-center py-20 text-slate-500">
          <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Henüz yayımlanan dergi yok.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(magazines ?? []).map((m: any) => {
            const cls = m.classroom as unknown as { name: string; school_name: string } | null
            return (
              <Link
                key={m.id}
                href={`/classroom/${m.classroom_id}/magazine/${m.id}`}
                className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:border-primary/30 hover:bg-white/[0.04] transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm font-semibold text-white group-hover:text-primary transition-colors line-clamp-2">{m.title}</p>
                <p className="text-xs text-slate-500 mt-1">Sayı #{m.issue_number}</p>
                {cls && <p className="text-xs text-slate-500 mt-0.5">{cls.name} · {cls.school_name}</p>}
                {m.published_at && (
                  <p className="text-xs text-slate-600 mt-2">
                    {new Date(m.published_at).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long' })}
                  </p>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
