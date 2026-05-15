# Writer Squad — Phase 1B: Projeler, Başvurular & Sayfalar

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Landing page, Explore, Dashboard, proje oluşturma, proje detay, proje overview ve başvuru sistemini teslim etmek.

**Architecture:** Next.js 15 App Router. Server Components veriyi Supabase'den çeker. Client Components form ve etkileşim yönetir. Supabase credentials olmadan sayfalar placeholder data ile render edilir.

**Tech Stack:** Next.js 15, TypeScript, TailwindCSS v4, shadcn/ui (base-nova + @base-ui/react), Supabase, React Hook Form, Zod, Framer Motion, Lucide

**Önemli:** shadcn bu projede `@base-ui/react` kullanıyor. Button'da `asChild` yok — Link sarmalı için `buttonVariants` + `<a>` ya da doğrudan `className` kullan.

---

## Dosya Haritası

```
Oluşturulacak:
  app/(public)/layout.tsx
  app/(public)/page.tsx                          # Landing
  app/(public)/explore/page.tsx
  app/(public)/projects/[slug]/page.tsx
  app/(public)/u/[username]/page.tsx
  app/(app)/dashboard/page.tsx                   # (güncelleme)
  app/(app)/projects/new/page.tsx
  app/(app)/projects/[id]/layout.tsx
  app/(app)/projects/[id]/overview/page.tsx
  app/(app)/notifications/page.tsx
  app/(app)/settings/page.tsx
  components/project/ProjectCard.tsx
  components/project/ProjectForm.tsx
  components/project/RoleForm.tsx
  components/project/ApplicationCard.tsx
  lib/validations/project.ts                     # (zaten var, kontrol et)
  lib/validations/application.ts                 # (zaten var, kontrol et)
```

---

### Task 1: Public Layout & Landing Page

**Files:**
- Create: `app/(public)/layout.tsx`, `app/(public)/page.tsx`

- [ ] **Step 1: `app/(public)/layout.tsx` yaz**

```tsx
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/shared/Navbar'
import type { Profile } from '@/types'

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile: Profile | null = null
  if (user) {
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    profile = data as Profile | null
  }

  return (
    <div className="min-h-dvh">
      <Navbar profile={profile} />
      <main className="pt-14">{children}</main>
    </div>
  )
}
```

- [ ] **Step 2: `app/(public)/page.tsx` (Landing) yaz**

```tsx
import Link from 'next/link'
import { ArrowRight, Users, BookOpen, Zap, Star } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass text-sm text-muted-foreground mb-4">
            <Star className="w-3.5 h-3.5 text-primary" />
            <span>İşbirlikçi roman yazarlığı platformu</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight">
            Hikayeler hiçbir zaman{' '}
            <span className="text-gradient">yalnız yazılmak</span>{' '}
            için değildi.
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Yazarları bir araya getiriyoruz. Ekip kur, rol al, birlikte yaz.
            Her bölüm, her kelime — birlikte.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              className={cn(buttonVariants({ size: 'lg' }), 'bg-primary hover:bg-primary/90 text-white px-8')}
            >
              Yazmaya Başla <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
            <Link
              href="/explore"
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'px-8')}
            >
              Projeleri Keşfet
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-surface/50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16 space-y-3">
            <h2 className="text-3xl font-bold">Nasıl çalışır?</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              GitHub + Discord + Notion — sadece yazarlar için
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: BookOpen,
                title: 'Proje Oluştur',
                desc: 'Türünü, özetini ve hedef kelime sayını belirle. Ekibine hangi rollerin lazım olduğunu seç.',
              },
              {
                icon: Users,
                title: 'Ekip Kur',
                desc: 'Diyalog yazarı, dünya inşacısı, editör... Her rol için başvuruları incele, ekibini seç.',
              },
              {
                icon: Zap,
                title: 'Birlikte Yaz',
                desc: 'Gerçek zamanlı editör, fikir panosu, karakter wiki ve zaman çizelgesi ile her şey bir arada.',
              },
            ].map((f) => (
              <div key={f.title} className="glass rounded-xl p-6 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-2xl mx-auto px-4 text-center space-y-6">
          <h2 className="text-4xl font-bold">Hikayeni bekleyen ekibin var.</h2>
          <p className="text-muted-foreground text-lg">
            Şu an yüzlerce yazar bir sonraki büyük roman için ortak arıyor.
          </p>
          <Link
            href="/signup"
            className={cn(buttonVariants({ size: 'lg' }), 'bg-primary hover:bg-primary/90 text-white px-10')}
          >
            Ücretsiz Katıl <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add app/(public)/
git commit -m "feat: add public layout and landing page"
```

---

### Task 2: ProjectCard Bileşeni

**Files:**
- Create: `components/project/ProjectCard.tsx`

- [ ] **Step 1: `components/project/ProjectCard.tsx` yaz**

```tsx
import Link from 'next/link'
import { Users, BookOpen, Tag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { ProjectWithOwner } from '@/types'

interface ProjectCardProps {
  project: ProjectWithOwner
}

const GENRE_COLORS: Record<string, string> = {
  'Fantastik': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Bilim Kurgu': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Romantik': 'bg-pink-500/10 text-pink-400 border-pink-500/20',
  'Gerilim': 'bg-red-500/10 text-red-400 border-red-500/20',
  'Macera': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
}

export function ProjectCard({ project }: ProjectCardProps) {
  const genreColor = GENRE_COLORS[project.genre ?? ''] ?? 'bg-primary/10 text-primary border-primary/20'
  const openRoles = project.roles?.filter(r => r.max_members > 0) ?? []

  return (
    <Link href={`/projects/${project.slug}`} className="block group">
      <div className="glass rounded-xl overflow-hidden transition-all duration-200 hover:border-primary/30 hover:bg-white/[0.05]">
        {/* Cover */}
        <div className="h-36 bg-gradient-to-br from-primary/20 via-surface to-accent/10 relative">
          {project.cover_image_url && (
            <img
              src={project.cover_image_url}
              alt={project.title}
              className="w-full h-full object-cover"
            />
          )}
          {project.genre && (
            <span className={`absolute top-3 left-3 text-xs px-2 py-0.5 rounded-full border ${genreColor}`}>
              {project.genre}
            </span>
          )}
          {project.collaboration_status === 'recruiting' && (
            <span className="absolute top-3 right-3 text-xs px-2 py-0.5 rounded-full bg-success/10 text-green-400 border border-success/20">
              Üye Aranıyor
            </span>
          )}
        </div>

        <div className="p-4 space-y-3">
          <h3 className="font-semibold text-base leading-tight line-clamp-1 group-hover:text-primary transition-colors">
            {project.title}
          </h3>

          {project.synopsis && (
            <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
              {project.synopsis}
            </p>
          )}

          {/* Tags */}
          {project.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {project.tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-surface-2 text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-1 border-t border-border">
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6">
                <AvatarImage src={project.owner?.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs bg-primary/20 text-primary">
                  {project.owner?.display_name?.[0] ?? project.owner?.username?.[0] ?? '?'}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground">
                {project.owner?.display_name ?? project.owner?.username}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {project.member_count !== undefined && (
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {project.member_count}
                </span>
              )}
              {project.current_word_count > 0 && (
                <span className="flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  {(project.current_word_count / 1000).toFixed(1)}K
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/project/ProjectCard.tsx
git commit -m "feat: add ProjectCard component"
```

---

### Task 3: Explore Sayfası

**Files:**
- Create: `app/(public)/explore/page.tsx`

- [ ] **Step 1: `app/(public)/explore/page.tsx` yaz**

```tsx
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { ProjectCard } from '@/components/project/ProjectCard'
import { PageSkeleton } from '@/components/shared/LoadingSkeleton'
import { EmptyState } from '@/components/shared/EmptyState'
import { BookOpen } from 'lucide-react'
import type { ProjectWithOwner } from '@/types'

export const metadata: Metadata = { title: 'Projeleri Keşfet — Writer Squad' }
export const dynamic = 'force-dynamic'

const GENRES = ['Tümü', 'Fantastik', 'Bilim Kurgu', 'Romantik', 'Gerilim', 'Macera', 'Tarihi']

interface Props {
  searchParams: Promise<{ genre?: string; status?: string }>
}

export default async function ExplorePage({ searchParams }: Props) {
  const { genre, status } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('projects')
    .select(`
      *,
      owner:profiles!projects_owner_id_fkey(*),
      roles:project_roles(*),
      member_count:project_members(count)
    `)
    .in('visibility', ['open', 'published'])
    .order('created_at', { ascending: false })
    .limit(24)

  if (genre && genre !== 'Tümü') query = query.eq('genre', genre)
  if (status === 'recruiting') query = query.eq('collaboration_status', 'recruiting')

  const { data: projects } = await query

  const normalizedProjects = (projects ?? []).map((p: any) => ({
    ...p,
    member_count: p.member_count?.[0]?.count ?? 0,
  })) as ProjectWithOwner[]

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Projeleri Keşfet</h1>
        <p className="text-muted-foreground">Birlikte yazılacak hikayeler seni bekliyor.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {GENRES.map(g => (
          <a
            key={g}
            href={g === 'Tümü' ? '/explore' : `/explore?genre=${encodeURIComponent(g)}`}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              (g === 'Tümü' && !genre) || genre === g
                ? 'bg-primary text-white border-primary'
                : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
            }`}
          >
            {g}
          </a>
        ))}
        <a
          href={status === 'recruiting' ? '/explore' : '/explore?status=recruiting'}
          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
            status === 'recruiting'
              ? 'bg-success/20 text-green-400 border-success/40'
              : 'border-border text-muted-foreground hover:border-success/30'
          }`}
        >
          Üye Aranıyor
        </a>
      </div>

      {/* Grid */}
      {normalizedProjects.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Henüz proje yok"
          description="Bu filtrede hiç proje bulunamadı."
          action={{ label: 'Tümünü Gör', href: '/explore' }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {normalizedProjects.map(project => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(public)/explore/
git commit -m "feat: add explore page with genre and status filters"
```

---

### Task 4: Dashboard Sayfası

**Files:**
- Modify: `app/(app)/dashboard/page.tsx`

- [ ] **Step 1: `app/(app)/dashboard/page.tsx` yaz**

```tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, BookOpen, Bell, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ProjectCard } from '@/components/project/ProjectCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ProjectWithOwner, Application } from '@/types'

export const metadata: Metadata = { title: 'Dashboard — Writer Squad' }
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Kullanıcının sahip olduğu projeler
  const { data: ownedProjects } = await supabase
    .from('projects')
    .select('*, owner:profiles!projects_owner_id_fkey(*), roles:project_roles(*)')
    .eq('owner_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(6)

  // Üye olunan projeler
  const { data: membershipData } = await supabase
    .from('project_members')
    .select('project:projects(*, owner:profiles!projects_owner_id_fkey(*), roles:project_roles(*))')
    .eq('user_id', user.id)
    .limit(6)

  const memberProjects = (membershipData ?? [])
    .map((m: any) => m.project)
    .filter(Boolean) as ProjectWithOwner[]

  // Bekleyen başvurular (sahip olunan projeler için)
  const projectIds = (ownedProjects ?? []).map(p => p.id)
  const { data: pendingApplications } = projectIds.length > 0
    ? await supabase
        .from('applications')
        .select('*, applicant:profiles!applications_applicant_id_fkey(*), role:project_roles(*)')
        .in('project_id', projectIds)
        .eq('status', 'pending')
        .limit(5)
    : { data: [] }

  const owned = (ownedProjects ?? []) as ProjectWithOwner[]
  const pending = (pendingApplications ?? []) as any[]

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 space-y-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <Link
          href="/projects/new"
          className={cn(buttonVariants(), 'bg-primary text-white hover:bg-primary/90')}
        >
          <Plus className="w-4 h-4 mr-1.5" /> Yeni Proje
        </Link>
      </div>

      {/* Bekleyen Başvurular */}
      {pending.length > 0 && (
        <section className="glass rounded-xl p-5 space-y-3 border-l-2 border-primary">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">Bekleyen Başvurular ({pending.length})</h2>
          </div>
          <div className="space-y-2">
            {pending.map((app: any) => (
              <div key={app.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
                    {app.applicant?.display_name?.[0] ?? app.applicant?.username?.[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{app.applicant?.display_name ?? app.applicant?.username}</p>
                    <p className="text-xs text-muted-foreground">{app.role?.name} rolü için başvurdu</p>
                  </div>
                </div>
                <Link
                  href={`/projects/${app.project_id}/overview`}
                  className="text-xs text-primary hover:underline"
                >
                  İncele
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Kendi Projeleri */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" /> Projelerim
          </h2>
        </div>
        {owned.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Henüz proje yok"
            description="İlk projeyi oluştur ve ekibini kur."
            action={{ label: 'Proje Oluştur', href: '/projects/new' }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {owned.map(p => <ProjectCard key={p.id} project={p} />)}
          </div>
        )}
      </section>

      {/* Üye Olunan Projeler */}
      {memberProjects.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Katıldığım Projeler
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {memberProjects.map(p => <ProjectCard key={p.id} project={p} />)}
          </div>
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add app/(app)/dashboard/
git commit -m "feat: add full dashboard with projects and pending applications"
```

---

### Task 5: Proje Oluşturma

**Files:**
- Create: `components/project/ProjectForm.tsx`, `components/project/RoleForm.tsx`, `app/(app)/projects/new/page.tsx`

- [ ] **Step 1: `components/project/RoleForm.tsx` yaz**

```tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createRoleSchema, type CreateRoleInput } from '@/lib/validations/project'

interface Role extends CreateRoleInput {
  id: string
}

interface RoleFormProps {
  roles: Role[]
  onChange: (roles: Role[]) => void
}

const ROLE_PRESETS = [
  'Baş Yazar', 'Editör', 'Diyalog Yazarı', 'Dünya İnşacısı',
  'Lore Uzmanı', 'Karakter Tasarımcısı', 'Aksiyon Sahnesi Yazarı',
]

export function RoleForm({ roles, onChange }: RoleFormProps) {
  const [showForm, setShowForm] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateRoleInput>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: { max_members: 1 },
  })

  function addRole(data: CreateRoleInput) {
    const newRole: Role = { ...data, id: crypto.randomUUID() }
    onChange([...roles, newRole])
    reset()
    setShowForm(false)
  }

  function removeRole(id: string) {
    onChange(roles.filter(r => r.id !== id))
  }

  function addPreset(name: string) {
    const exists = roles.find(r => r.name === name)
    if (exists) return
    onChange([...roles, { id: crypto.randomUUID(), name, max_members: 1 }])
  }

  return (
    <div className="space-y-4">
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-2">
        {ROLE_PRESETS.map(preset => (
          <button
            key={preset}
            type="button"
            onClick={() => addPreset(preset)}
            disabled={!!roles.find(r => r.name === preset)}
            className="text-xs px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            + {preset}
          </button>
        ))}
      </div>

      {/* Existing roles */}
      {roles.length > 0 && (
        <div className="space-y-2">
          {roles.map(role => (
            <div key={role.id} className="flex items-center justify-between p-3 glass rounded-lg">
              <div>
                <p className="text-sm font-medium">{role.name}</p>
                {role.description && (
                  <p className="text-xs text-muted-foreground">{role.description}</p>
                )}
                <p className="text-xs text-muted-foreground">Maks. {role.max_members} kişi</p>
              </div>
              <button
                type="button"
                onClick={() => removeRole(role.id)}
                className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                aria-label={`${role.name} rolünü kaldır`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add custom role */}
      {showForm ? (
        <form onSubmit={handleSubmit(addRole)} className="glass rounded-lg p-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="role-name">Rol Adı *</Label>
            <Input id="role-name" placeholder="örn. Antagonist Yazarı" className="bg-surface-2 border-border" {...register('name')} />
            {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role-desc">Açıklama</Label>
            <Input id="role-desc" placeholder="Bu rolün sorumlulukları..." className="bg-surface-2 border-border" {...register('description')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role-max">Maksimum Kişi</Label>
            <Input id="role-max" type="number" min={1} max={10} className="bg-surface-2 border-border w-24" {...register('max_members', { valueAsNumber: true })} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm">Ekle</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>İptal</Button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-full py-2.5 border border-dashed border-border rounded-lg text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Özel Rol Ekle
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: `components/project/ProjectForm.tsx` yaz**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RoleForm } from './RoleForm'
import { createClient } from '@/lib/supabase/client'
import { createProjectSchema, type CreateProjectInput } from '@/lib/validations/project'

const GENRES = ['Fantastik', 'Bilim Kurgu', 'Romantik', 'Gerilim', 'Macera', 'Tarihi', 'Distopya', 'Diğer']

interface Role {
  id: string
  name: string
  description?: string
  max_members: number
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9ğüşıöçğüşıöç\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    + '-' + Math.random().toString(36).slice(2, 6)
}

export function ProjectForm() {
  const router = useRouter()
  const supabase = createClient()
  const [roles, setRoles] = useState<Role[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [step, setStep] = useState(1)
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { visibility: 'open', tags: [] },
  })

  function addTag(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault()
      if (!tags.includes(tagInput.trim()) && tags.length < 10) {
        setTags([...tags, tagInput.trim()])
      }
      setTagInput('')
    }
  }

  async function onSubmit(data: CreateProjectInput) {
    setServerError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const slug = slugify(data.title)

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        owner_id: user.id,
        title: data.title,
        slug,
        genre: data.genre,
        synopsis: data.synopsis,
        tags,
        target_word_count: data.target_word_count,
        visibility: data.visibility,
      })
      .select()
      .single()

    if (error) {
      setServerError('Proje oluşturulurken bir hata oluştu.')
      return
    }

    // Rolleri ekle
    if (roles.length > 0) {
      await supabase.from('project_roles').insert(
        roles.map(r => ({
          project_id: project.id,
          name: r.name,
          description: r.description,
          max_members: r.max_members,
        }))
      )
    }

    // Owner'ı member olarak ekle (varsa ilk rol veya "Baş Yazar" oluştur)
    const { data: firstRole } = await supabase
      .from('project_roles')
      .select('id')
      .eq('project_id', project.id)
      .limit(1)
      .single()

    if (firstRole) {
      await supabase.from('project_members').insert({
        project_id: project.id,
        user_id: user.id,
        role_id: firstRole.id,
      })
    }

    router.push(`/projects/${project.id}/overview`)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
              s === step ? 'bg-primary text-white' : s < step ? 'bg-primary/30 text-primary' : 'bg-surface-2 text-muted-foreground'
            }`}>{s}</div>
            {s < 3 && <div className={`w-12 h-px ${s < step ? 'bg-primary/50' : 'bg-border'}`} />}
          </div>
        ))}
        <div className="ml-2 text-sm text-muted-foreground">
          {step === 1 ? 'Temel Bilgiler' : step === 2 ? 'Detaylar' : 'Roller'}
        </div>
      </div>

      {/* Step 1: Temel Bilgiler */}
      {step === 1 && (
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="title">Proje Başlığı *</Label>
            <Input id="title" placeholder="örn. Gölge Krallığı" className="bg-surface-2 border-border text-lg" {...register('title')} />
            {errors.title && <p className="text-destructive text-xs">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="genre">Tür *</Label>
            <select
              id="genre"
              className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              {...register('genre')}
            >
              <option value="">Tür seçin</option>
              {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            {errors.genre && <p className="text-destructive text-xs">{errors.genre.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="synopsis">Özet *</Label>
            <textarea
              id="synopsis"
              rows={4}
              placeholder="Projenizin kısa özeti... (min. 50 karakter)"
              className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
              {...register('synopsis')}
            />
            {errors.synopsis && <p className="text-destructive text-xs">{errors.synopsis.message}</p>}
          </div>

          <Button type="button" onClick={() => setStep(2)} className="w-full bg-primary text-white">
            Devam Et
          </Button>
        </div>
      )}

      {/* Step 2: Detaylar */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label>Etiketler</Label>
            <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-surface-2 border border-border min-h-[44px]">
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-xs">
                  {tag}
                  <button type="button" onClick={() => setTags(tags.filter(t => t !== tag))} className="hover:text-destructive">×</button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={addTag}
                placeholder={tags.length < 10 ? "Etiket ekle, Enter'a bas" : "Maks. 10 etiket"}
                disabled={tags.length >= 10}
                className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="target_word_count">Hedef Kelime Sayısı</Label>
            <Input
              id="target_word_count"
              type="number"
              placeholder="örn. 80000"
              className="bg-surface-2 border-border"
              {...register('target_word_count', { valueAsNumber: true })}
            />
            <p className="text-xs text-muted-foreground">Ortalama roman ≈ 80.000 kelime</p>
          </div>

          <div className="space-y-1.5">
            <Label>Görünürlük</Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'open', label: 'Açık', desc: 'Herkes başvurabilir' },
                { value: 'draft', label: 'Taslak', desc: 'Sadece sen görebilirsin' },
              ].map(opt => (
                <label key={opt.value} className="cursor-pointer">
                  <input type="radio" value={opt.value} className="sr-only" {...register('visibility')} />
                  <div className={`p-3 rounded-lg border transition-colors ${
                    watch('visibility') === opt.value ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/30'
                  }`}>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1">Geri</Button>
            <Button type="button" onClick={() => setStep(3)} className="flex-1 bg-primary text-white">Devam Et</Button>
          </div>
        </div>
      )}

      {/* Step 3: Roller */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Ekip Rolleri</Label>
            <p className="text-xs text-muted-foreground">Projeniz için hangi rollere ihtiyacınız var?</p>
          </div>

          <RoleForm roles={roles} onChange={setRoles} />

          {serverError && (
            <p role="alert" className="text-destructive text-sm">{serverError}</p>
          )}

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1">Geri</Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1 bg-primary text-white">
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Projeyi Oluştur
            </Button>
          </div>
        </div>
      )}
    </form>
  )
}
```

- [ ] **Step 3: `app/(app)/projects/new/page.tsx` yaz**

```tsx
import type { Metadata } from 'next'
import { ProjectForm } from '@/components/project/ProjectForm'

export const metadata: Metadata = { title: 'Yeni Proje — Writer Squad' }
export const dynamic = 'force-dynamic'

export default function NewProjectPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold">Yeni Proje Oluştur</h1>
        <p className="text-muted-foreground">Ekibini kur, hikayeni yaz.</p>
      </div>
      <div className="glass rounded-xl p-6">
        <ProjectForm />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/project/ app/(app)/projects/new/
git commit -m "feat: add multi-step project creation form with role builder"
```

---

### Task 6: Proje Detay Sayfası (Public) & Başvuru Sistemi

**Files:**
- Create: `components/project/ApplicationCard.tsx`, `app/(public)/projects/[slug]/page.tsx`, `app/(app)/projects/[id]/layout.tsx`, `app/(app)/projects/[id]/overview/page.tsx`

- [ ] **Step 1: `components/project/ApplicationCard.tsx` yaz**

```tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { createApplicationSchema, type CreateApplicationInput } from '@/lib/validations/application'
import type { ProjectRole } from '@/types'

interface ApplicationFormProps {
  projectId: string
  role: ProjectRole
  userId: string
}

export function ApplicationForm({ projectId, role, userId }: ApplicationFormProps) {
  const supabase = createClient()
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CreateApplicationInput>({
    resolver: zodResolver(createApplicationSchema),
    defaultValues: { portfolio_links: [] },
  })

  async function onSubmit(data: CreateApplicationInput) {
    setServerError(null)
    const { error } = await supabase.from('applications').insert({
      project_id: projectId,
      applicant_id: userId,
      role_id: role.id,
      intro: data.intro,
      writing_sample: data.writing_sample,
      portfolio_links: [],
    })

    if (error) {
      setServerError('Başvuru gönderilirken bir hata oluştu.')
      return
    }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <CheckCircle className="w-10 h-10 text-success" />
        <p className="font-medium">Başvurun gönderildi!</p>
        <p className="text-sm text-muted-foreground">Proje sahibi inceleyecek ve sana bildirim göndereceğiz.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <p className="text-sm font-medium mb-1">
          <span className="text-primary">{role.name}</span> rolü için başvuru
        </p>
        {role.description && <p className="text-xs text-muted-foreground">{role.description}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="intro">Tanıtım * <span className="text-muted-foreground text-xs">(min. 50 karakter)</span></Label>
        <textarea
          id="intro"
          rows={3}
          placeholder="Kendinizi tanıtın, neden bu rolü istediğinizi anlatın..."
          className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
          aria-describedby={errors.intro ? 'intro-error' : undefined}
          aria-invalid={!!errors.intro}
          {...register('intro')}
        />
        {errors.intro && <p id="intro-error" role="alert" className="text-destructive text-xs">{errors.intro.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="sample">Yazı Örneği</Label>
        <textarea
          id="sample"
          rows={4}
          placeholder="Kısa bir yazı örneği paylaşın (isteğe bağlı)..."
          className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
          {...register('writing_sample')}
        />
      </div>

      {serverError && <p role="alert" className="text-destructive text-sm">{serverError}</p>}

      <Button type="submit" disabled={isSubmitting} className="w-full bg-primary text-white">
        {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
        Başvuruyu Gönder
      </Button>
    </form>
  )
}
```

- [ ] **Step 2: `app/(public)/projects/[slug]/page.tsx` yaz**

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Users, BookOpen, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ApplicationForm } from '@/components/project/ApplicationCard'
import type { ProjectWithOwner } from '@/types'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('projects').select('title, synopsis').eq('slug', slug).single()
  return {
    title: data ? `${data.title} — Writer Squad` : 'Proje — Writer Squad',
    description: data?.synopsis ?? undefined,
  }
}

export default async function ProjectDetailPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: project } = await supabase
    .from('projects')
    .select('*, owner:profiles!projects_owner_id_fkey(*), roles:project_roles(*), members:project_members(*, profile:profiles(*))')
    .eq('slug', slug)
    .single()

  if (!project) notFound()

  const { data: { user } } = await supabase.auth.getUser()

  const isOwner = user?.id === project.owner_id
  const isMember = project.members?.some((m: any) => m.user_id === user?.id)
  const openRoles = project.roles ?? []

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sol: Proje Detayları */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="space-y-4">
            {project.cover_image_url && (
              <img src={project.cover_image_url} alt={project.title} className="w-full h-56 object-cover rounded-xl" />
            )}
            <div className="flex flex-wrap gap-2">
              {project.genre && (
                <span className="px-2.5 py-1 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">
                  {project.genre}
                </span>
              )}
              <span className={`px-2.5 py-1 rounded-full text-xs border ${
                project.collaboration_status === 'recruiting'
                  ? 'bg-success/10 text-green-400 border-success/20'
                  : 'bg-surface-2 text-muted-foreground border-border'
              }`}>
                {project.collaboration_status === 'recruiting' ? 'Üye Aranıyor' : 'Aktif'}
              </span>
            </div>
            <h1 className="text-4xl font-bold">{project.title}</h1>
          </div>

          {/* Yazar */}
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarImage src={project.owner?.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary/20 text-primary">
                {project.owner?.display_name?.[0] ?? project.owner?.username?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{project.owner?.display_name ?? project.owner?.username}</p>
              <p className="text-xs text-muted-foreground">Proje Sahibi</p>
            </div>
          </div>

          {/* Özet */}
          {project.synopsis && (
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Özet</h2>
              <p className="text-muted-foreground leading-relaxed">{project.synopsis}</p>
            </div>
          )}

          {/* Etiketler */}
          {project.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {project.tags.map((tag: string) => (
                <span key={tag} className="px-2.5 py-1 rounded-full text-xs bg-surface-2 text-muted-foreground">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Üyeler */}
          {project.members?.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5" /> Ekip ({project.members.length})
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {project.members.map((member: any) => (
                  <div key={member.id} className="flex items-center gap-2 glass rounded-lg p-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={member.profile?.avatar_url ?? undefined} />
                      <AvatarFallback className="text-xs bg-primary/20 text-primary">
                        {member.profile?.display_name?.[0] ?? member.profile?.username?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{member.profile?.display_name ?? member.profile?.username}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sağ: Başvuru Paneli */}
        <div className="space-y-4">
          {/* İstatistikler */}
          <div className="glass rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" /> Kelime Sayısı
              </span>
              <span className="font-medium">{project.current_word_count?.toLocaleString() ?? 0}</span>
            </div>
            {project.target_word_count && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>İlerleme</span>
                  <span>{Math.round((project.current_word_count / project.target_word_count) * 100)}%</span>
                </div>
                <div className="w-full h-1.5 bg-surface-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${Math.min(100, (project.current_word_count / project.target_word_count) * 100)}%` }}
                  />
                </div>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> Oluşturulma
              </span>
              <span className="font-medium">
                {new Date(project.created_at).toLocaleDateString('tr-TR')}
              </span>
            </div>
          </div>

          {/* Açık Roller & Başvuru */}
          {openRoles.length > 0 && !isOwner && !isMember && (
            <div className="glass rounded-xl p-4 space-y-4">
              <h3 className="font-semibold">Açık Roller</h3>
              {user ? (
                openRoles.map((role: any) => (
                  <div key={role.id} className="border border-border rounded-lg p-3 space-y-3">
                    <div>
                      <p className="font-medium text-sm">{role.name}</p>
                      {role.description && <p className="text-xs text-muted-foreground">{role.description}</p>}
                    </div>
                    <ApplicationForm projectId={project.id} role={role} userId={user.id} />
                  </div>
                ))
              ) : (
                <div className="text-center space-y-3 py-2">
                  <p className="text-sm text-muted-foreground">Başvurmak için giriş yapmalısın.</p>
                  <a href="/login" className="block text-center py-2 px-4 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition-colors">
                    Giriş Yap
                  </a>
                </div>
              )}
            </div>
          )}

          {isMember && (
            <div className="glass rounded-xl p-4 text-center space-y-2">
              <p className="text-sm font-medium text-success">Bu projenin üyesisin</p>
              <a href={`/projects/${project.id}/write`} className="block text-center py-2 px-4 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition-colors">
                Yazma Odasına Git
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: `app/(app)/projects/[id]/layout.tsx` yaz**

```tsx
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PenLine, Lightbulb, BookOpen, Clock, Users, BarChart2 } from 'lucide-react'

const NAV_ITEMS = [
  { href: 'overview', label: 'Genel Bakış', icon: BarChart2 },
  { href: 'write', label: 'Yaz', icon: PenLine },
  { href: 'brainstorm', label: 'Fikirler', icon: Lightbulb },
  { href: 'wiki', label: 'Karakterler', icon: Users },
  { href: 'timeline', label: 'Zaman Çizelgesi', icon: Clock },
  { href: 'history', label: 'Geçmiş', icon: BookOpen },
]

interface Props {
  children: React.ReactNode
  params: Promise<{ id: string }>
}

export default async function ProjectLayout({ children, params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('id, title, slug, owner_id')
    .eq('id', id)
    .single()

  if (!project) notFound()

  const { data: member } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', id)
    .eq('user_id', user.id)
    .single()

  const isOwner = project.owner_id === user.id
  const hasAccess = isOwner || !!member
  if (!hasAccess) redirect(`/projects/${project.slug}`)

  return (
    <div className="flex min-h-dvh pt-14">
      {/* Sidebar */}
      <aside className="w-52 border-r border-border bg-surface shrink-0 flex flex-col">
        <div className="p-4 border-b border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Proje</p>
          <p className="font-semibold text-sm line-clamp-2">{project.title}</p>
        </div>
        <nav className="flex-1 p-2 space-y-0.5" aria-label="Proje navigasyonu">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={`/projects/${id}/${item.href}`}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 4: `app/(app)/projects/[id]/overview/page.tsx` yaz**

```tsx
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Users, CheckCircle, XCircle, Clock } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export const metadata: Metadata = { title: 'Proje Genel Bakış — Writer Squad' }
export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProjectOverviewPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: project } = await supabase
    .from('projects')
    .select('*, roles:project_roles(*), members:project_members(*, profile:profiles(*), role:project_roles(*))')
    .eq('id', id)
    .single()

  if (!project) notFound()

  const isOwner = project.owner_id === user.id

  const { data: applications } = await supabase
    .from('applications')
    .select('*, applicant:profiles!applications_applicant_id_fkey(*), role:project_roles(*)')
    .eq('project_id', id)
    .order('created_at', { ascending: false })

  const pending = (applications ?? []).filter((a: any) => a.status === 'pending')

  async function updateApplication(formData: FormData) {
    'use server'
    const appId = formData.get('appId') as string
    const action = formData.get('action') as string
    const supabase = await createClient()

    if (action === 'accept') {
      const { data: app } = await supabase
        .from('applications')
        .select('*, role:project_roles(*)')
        .eq('id', appId)
        .single()

      if (app) {
        await supabase.from('applications').update({ status: 'accepted' }).eq('id', appId)
        await supabase.from('project_members').insert({
          project_id: app.project_id,
          user_id: app.applicant_id,
          role_id: app.role_id,
        })
        await supabase.from('notifications').insert({
          user_id: app.applicant_id,
          type: 'acceptance',
          payload: { project_id: app.project_id },
        })
      }
    } else {
      await supabase.from('applications').update({ status: 'rejected' }).eq('id', appId)
      const { data: app } = await supabase.from('applications').select('applicant_id, project_id').eq('id', appId).single()
      if (app) {
        await supabase.from('notifications').insert({
          user_id: app.applicant_id,
          type: 'rejection',
          payload: { project_id: app.project_id },
        })
      }
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{project.title}</h1>
        <p className="text-muted-foreground text-sm">{project.synopsis}</p>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Üye', value: project.members?.length ?? 0 },
          { label: 'Kelime', value: (project.current_word_count ?? 0).toLocaleString() },
          { label: 'Bekleyen', value: pending.length },
        ].map(stat => (
          <div key={stat.label} className="glass rounded-xl p-4 text-center">
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Bekleyen Başvurular */}
      {isOwner && pending.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> Bekleyen Başvurular ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((app: any) => (
              <div key={app.id} className="glass rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-9 h-9">
                      <AvatarImage src={app.applicant?.avatar_url ?? undefined} />
                      <AvatarFallback className="text-xs bg-primary/20 text-primary">
                        {app.applicant?.display_name?.[0] ?? app.applicant?.username?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{app.applicant?.display_name ?? app.applicant?.username}</p>
                      <p className="text-xs text-muted-foreground">{app.role?.name} için başvurdu</p>
                    </div>
                  </div>
                  {isOwner && (
                    <div className="flex gap-2">
                      <form action={updateApplication}>
                        <input type="hidden" name="appId" value={app.id} />
                        <input type="hidden" name="action" value="accept" />
                        <button type="submit" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-success/15 text-green-400 hover:bg-success/25 text-xs font-medium transition-colors">
                          <CheckCircle className="w-3.5 h-3.5" /> Kabul Et
                        </button>
                      </form>
                      <form action={updateApplication}>
                        <input type="hidden" name="appId" value={app.id} />
                        <input type="hidden" name="action" value="reject" />
                        <button type="submit" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 text-xs font-medium transition-colors">
                          <XCircle className="w-3.5 h-3.5" /> Reddet
                        </button>
                      </form>
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{app.intro}</p>
                {app.writing_sample && (
                  <div className="bg-surface-2 rounded-lg p-3 text-sm text-muted-foreground italic">
                    "{app.writing_sample.slice(0, 200)}{app.writing_sample.length > 200 ? '...' : ''}"
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Ekip */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" /> Ekip ({project.members?.length ?? 0})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(project.members ?? []).map((member: any) => (
            <div key={member.id} className="flex items-center gap-3 glass rounded-xl p-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={member.profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-primary/20 text-primary">
                  {member.profile?.display_name?.[0] ?? member.profile?.username?.[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-sm">{member.profile?.display_name ?? member.profile?.username}</p>
                <p className="text-xs text-muted-foreground">{member.role?.name}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add components/project/ app/(public)/projects/ app/(app)/projects/
git commit -m "feat: add project detail, application system, and project overview"
```

---

### Task 7: Settings & Notifications Placeholder Sayfaları

**Files:**
- Create: `app/(app)/settings/page.tsx`, `app/(app)/notifications/page.tsx`, `app/(public)/u/[username]/page.tsx`

- [ ] **Step 1: `app/(app)/notifications/page.tsx` yaz**

```tsx
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Bell, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { EmptyState } from '@/components/shared/EmptyState'

export const metadata: Metadata = { title: 'Bildirimler — Writer Squad' }
export const dynamic = 'force-dynamic'

const TYPE_LABELS: Record<string, string> = {
  application: 'Yeni başvuru',
  acceptance: 'Başvurun kabul edildi',
  rejection: 'Başvurun reddedildi',
  comment: 'Yeni yorum',
  mention: 'Bahsedildin',
}

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  // Tümünü okundu işaretle
  await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
      <h1 className="text-3xl font-bold">Bildirimler</h1>

      {!notifications || notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Henüz bildirim yok"
          description="Başvurular, kabuller ve yorumlar burada görünecek."
        />
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div key={n.id} className={`glass rounded-xl p-4 flex items-start gap-3 ${!n.read ? 'border-primary/30' : ''}`}>
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{TYPE_LABELS[n.type] ?? n.type}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(n.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              {n.read && <CheckCircle className="w-4 h-4 text-muted-foreground shrink-0" />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: `app/(app)/settings/page.tsx` yaz**

```tsx
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Profile } from '@/types'

export const metadata: Metadata = { title: 'Ayarlar — Writer Squad' }
export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const p = profile as Profile

  async function updateProfile(formData: FormData) {
    'use server'
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('profiles').update({
      display_name: formData.get('display_name') as string,
      bio: formData.get('bio') as string,
      portfolio_url: formData.get('portfolio_url') as string,
    }).eq('id', user.id)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      <h1 className="text-3xl font-bold">Ayarlar</h1>

      <form action={updateProfile} className="glass rounded-xl p-6 space-y-5">
        <h2 className="font-semibold text-lg">Profil Bilgileri</h2>

        <div className="space-y-1.5">
          <label htmlFor="username" className="text-sm font-medium">Kullanıcı Adı</label>
          <input
            id="username"
            defaultValue={p?.username ?? ''}
            disabled
            className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-sm opacity-50 cursor-not-allowed"
          />
          <p className="text-xs text-muted-foreground">Kullanıcı adı değiştirilemez.</p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="display_name" className="text-sm font-medium">Görünen Ad</label>
          <input
            id="display_name"
            name="display_name"
            defaultValue={p?.display_name ?? ''}
            className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="bio" className="text-sm font-medium">Biyografi</label>
          <textarea
            id="bio"
            name="bio"
            rows={3}
            defaultValue={p?.bio ?? ''}
            placeholder="Kendiniz hakkında kısa bir bilgi..."
            className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="portfolio_url" className="text-sm font-medium">Portfolyo URL</label>
          <input
            id="portfolio_url"
            name="portfolio_url"
            type="url"
            defaultValue={p?.portfolio_url ?? ''}
            placeholder="https://..."
            className="w-full px-3 py-2 rounded-lg bg-surface-2 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
          />
        </div>

        <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg text-sm hover:bg-primary/90 transition-colors">
          Kaydet
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: `app/(public)/u/[username]/page.tsx` yaz**

```tsx
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ProjectCard } from '@/components/project/ProjectCard'
import type { ProjectWithOwner } from '@/types'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  return { title: `${username} — Writer Squad` }
}

export default async function UserProfilePage({ params }: Props) {
  const { username } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  const { data: projects } = await supabase
    .from('projects')
    .select('*, owner:profiles!projects_owner_id_fkey(*), roles:project_roles(*)')
    .eq('owner_id', profile.id)
    .in('visibility', ['open', 'published'])
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      {/* Profil Header */}
      <div className="flex items-start gap-5">
        <Avatar className="w-20 h-20">
          <AvatarImage src={profile.avatar_url ?? undefined} />
          <AvatarFallback className="text-2xl bg-primary/20 text-primary">
            {profile.display_name?.[0] ?? profile.username[0]}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">{profile.display_name ?? profile.username}</h1>
          <p className="text-muted-foreground">@{profile.username}</p>
          {profile.bio && <p className="text-sm max-w-md leading-relaxed">{profile.bio}</p>}
          {profile.portfolio_url && (
            <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
              Portfolyo →
            </a>
          )}
        </div>
      </div>

      {/* Projeleri */}
      {projects && projects.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Projeleri</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(projects as ProjectWithOwner[]).map(p => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add app/
git commit -m "feat: add notifications, settings, and user profile pages"
```

---

### Task 8: TypeScript Check & Build

- [ ] **Step 1: TypeScript kontrolü**

```bash
npx tsc --noEmit
```

TypeScript hataları varsa düzelt. Yaygın sorunlar:
- `any` tipi gerektiren Supabase join sonuçları → `as any` ile geç
- `params` Promise tipi → `await params` kullan

- [ ] **Step 2: Build**

```bash
npm run build
```

Build başarılıysa devam et.

- [ ] **Step 3: Final commit**

```bash
git add .
git commit -m "feat: Phase 1B complete — projects, applications, all pages"
```

---

## Phase 1B Tamamlandı ✓

Teslim edilen:
- Landing page (hero, features, CTA)
- Explore sayfası (filtre: tür, üye aranıyor)
- Dashboard (projeler, bekleyen başvurular)
- Proje oluşturma (3 adımlı form + rol builder)
- Proje detay sayfası (başvuru formu)
- Proje overview (başvuru yönetimi, ekip)
- Proje sidebar layout
- Bildirimler, Ayarlar, Kullanıcı profili

Sonraki: `2026-05-11-phase2-editor.md` (Realtime yazma odası)
