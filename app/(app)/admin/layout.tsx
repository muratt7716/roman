import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { LayoutDashboard, Users, BookOpen, MessageSquare } from 'lucide-react'

export const dynamic = 'force-dynamic'

const NAV = [
  { href: '/admin', label: 'Genel Bakış', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Kullanıcılar', icon: Users },
  { href: '/admin/projects', label: 'Projeler', icon: BookOpen },
  { href: '/admin/feedback', label: 'Geri Bildirim', icon: MessageSquare },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  if (user.email !== 'mmuratb77@gmail.com') notFound()

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-white/[0.06] bg-black/30 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-6">
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-widest">Admin Paneli</span>
          <nav className="flex items-center gap-1">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-white hover:bg-white/[0.05] transition-colors"
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </div>
    </div>
  )
}
