import { createClient } from '@/lib/supabase/server'
import { Users, BookOpen, FileText, MessageSquare, TrendingUp, Star } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AdminOverviewPage() {
  const supabase = await createClient()

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: totalUsers },
    { count: newUsers7d },
    { count: totalProjects },
    { count: totalChapters },
    { count: totalFeedback },
    { count: unreadFeedback },
    { data: recentFeedback },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    supabase.from('projects').select('*', { count: 'exact', head: true }),
    supabase.from('chapters').select('*', { count: 'exact', head: true }),
    supabase.from('feedback').select('*', { count: 'exact', head: true }),
    supabase.from('feedback').select('*', { count: 'exact', head: true }).eq('status', 'new'),
    supabase.from('feedback').select('*, profiles(display_name, username)').order('created_at', { ascending: false }).limit(5),
  ])

  const stats = [
    { label: 'Toplam Kullanıcı', value: totalUsers ?? 0, icon: Users, color: 'text-blue-400' },
    { label: 'Son 7 Günde Yeni', value: newUsers7d ?? 0, icon: TrendingUp, color: 'text-emerald-400' },
    { label: 'Toplam Proje', value: totalProjects ?? 0, icon: BookOpen, color: 'text-violet-400' },
    { label: 'Toplam Bölüm', value: totalChapters ?? 0, icon: FileText, color: 'text-amber-400' },
    { label: 'Toplam Geri Bildirim', value: totalFeedback ?? 0, icon: MessageSquare, color: 'text-pink-400' },
    { label: 'Okunmamış Bildirim', value: unreadFeedback ?? 0, icon: Star, color: 'text-red-400' },
  ]

  const typeLabels: Record<string, string> = {
    bug: '🐛 Hata',
    suggestion: '💡 Öneri',
    feature: '✨ Özellik',
    other: '💬 Diğer',
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-white">Genel Bakış</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform istatistikleri</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2">
            <Icon className={`w-4 h-4 ${color}`} />
            <div className="text-2xl font-bold text-white">{value.toLocaleString('tr-TR')}</div>
            <div className="text-[11px] text-muted-foreground leading-tight">{label}</div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-white mb-3">Son Geri Bildirimler</h2>
        <div className="space-y-2">
          {(recentFeedback ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">Henüz geri bildirim yok.</p>
          )}
          {(recentFeedback ?? []).map((fb: any) => (
            <div key={fb.id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3 flex items-start gap-3">
              <span className="text-xs bg-white/[0.05] rounded-md px-2 py-0.5 mt-0.5 shrink-0">
                {typeLabels[fb.type] ?? fb.type}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/80 line-clamp-2">{fb.message}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {(fb.profiles as any)?.display_name ?? (fb.profiles as any)?.username ?? 'Anonim'} ·{' '}
                  {new Date(fb.created_at).toLocaleDateString('tr-TR')}
                </p>
              </div>
              {fb.status === 'new' && (
                <span className="text-[10px] bg-red-500/20 text-red-400 rounded-full px-2 py-0.5 shrink-0">Yeni</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
