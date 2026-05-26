# Profil Sayfası Güçlendirme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/u/[username]` profil sayfasına takipçi/takip sayıları, FollowButton, kazanılan rozetler ve yazı istatistikleri (streak rekoru, sprint sayısı) eklemek.

**Architecture:** Tek dosya değişikliği — `app/(public)/u/[username]/page.tsx`. Tüm bileşenler zaten mevcut (`FollowButton`, `BadgesGrid`). 6 yeni Supabase sorgusu eklenir, stats satırı 3'ten 5'e çıkar, FollowButton header'a eklenir, BadgesGrid yeni section olarak eklenir.

**Tech Stack:** Next.js 16 App Router · Supabase PostgreSQL · TypeScript · Tailwind v4

---

## Dosya Haritası

```
app/(public)/u/[username]/page.tsx    (modify — tüm değişiklikler burada)
CLAUDE.md                              (modify — Faz 6 notu)
```

---

### Task 1: Profil sayfasını güçlendir

**Files:**
- Modify: `app/(public)/u/[username]/page.tsx`

- [ ] **Step 1: Dosyayı aç ve import satırını güncelle**

Mevcut import satırını bul ve `FollowButton` ile `BadgesGrid`'i ekle:

```typescript
import { FollowButton } from '@/components/reader/FollowButton'
import { BadgesGrid } from '@/components/profile/BadgesGrid'
import type { ProjectWithOwner, UserBadge } from '@/types'
```

(Mevcut `import type { ProjectWithOwner } from '@/types'` satırını bu ile değiştir — `UserBadge` eklendi.)

- [ ] **Step 2: Promise.all'a 6 yeni sorgu ekle**

Mevcut `Promise.all` çağrısını bul (2 query var: `ownedProjects` ve `memberships`). Bunu şu şekilde genişlet:

```typescript
const [
  { data: ownedProjects },
  { data: memberships },
  { count: followerCount },
  { count: followingCount },
  { data: isFollowingRow },
  { data: badges },
  { data: writingGoal },
  { count: sprintCount },
] = await Promise.all([
  supabase
    .from('projects')
    .select('*, owner:profiles!projects_owner_id_fkey(*), roles:project_roles(*)')
    .eq('owner_id', profile.id)
    .in('visibility', ['open', 'published'])
    .order('updated_at', { ascending: false }),
  supabase
    .from('project_members')
    .select('project:projects(id, title, genre), role:project_roles(name)')
    .eq('user_id', profile.id),
  supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', profile.id),
  supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', profile.id),
  currentUser
    ? supabase
        .from('follows')
        .select('follower_id')
        .eq('follower_id', currentUser.id)
        .eq('following_id', profile.id)
        .maybeSingle()
    : Promise.resolve({ data: null }),
  supabase
    .from('user_badges')
    .select('*')
    .eq('user_id', profile.id),
  supabase
    .from('user_writing_goals')
    .select('streak_best')
    .eq('user_id', profile.id)
    .maybeSingle(),
  supabase
    .from('sprint_participants')
    .select('sprint_id', { count: 'exact', head: true })
    .eq('user_id', profile.id)
    .not('finished_at', 'is', null),
])

const isFollowing = !!isFollowingRow
const earnedBadges = (badges ?? []) as UserBadge[]
const streakBest = writingGoal?.streak_best ?? 0
```

- [ ] **Step 3: FollowButton'ı header'a ekle**

Header bölümünde `InviteButton` satırını bul:

```tsx
{!isOwnProfile && currentUser && (
  <InviteButton targetUserId={profile.id} targetUsername={profile.username} className="text-xs py-1.5 h-auto px-4 shadow-[0_0_15px_rgba(124,58,237,0.25)]" />
)}
```

Bunu şu şekilde güncelle (`FollowButton`'ı yanına ekle):

```tsx
{!isOwnProfile && currentUser && (
  <div className="flex items-center gap-2">
    <FollowButton
      authorId={profile.id}
      initialFollowing={isFollowing}
      followerCount={followerCount ?? 0}
    />
    <InviteButton targetUserId={profile.id} targetUsername={profile.username} className="text-xs py-1.5 h-auto px-4 shadow-[0_0_15px_rgba(124,58,237,0.25)]" />
  </div>
)}
```

- [ ] **Step 4: Stats satırını 5'e genişlet**

Mevcut 3 stat grid'ini bul (`grid-cols-3`). Bunu 5 stat ile değiştir:

```tsx
<div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mt-8 pt-8 border-t border-white/[0.05]">
  <div className="text-center bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.02] hover:border-white/[0.06] p-3 sm:p-4 rounded-xl transition-all duration-300 group">
    <p className="text-2xl sm:text-3xl font-display font-bold text-violet-400 group-hover:scale-105 transition-transform duration-300">{ownedProjects?.length ?? 0}</p>
    <p className="text-[9px] sm:text-xs text-muted-foreground/80 mt-1 uppercase tracking-wider font-semibold">Proje</p>
  </div>
  <div className="text-center bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.02] hover:border-white/[0.06] p-3 sm:p-4 rounded-xl transition-all duration-300 group">
    <p className="text-2xl sm:text-3xl font-display font-bold text-sky-400 group-hover:scale-105 transition-transform duration-300">{memberships?.length ?? 0}</p>
    <p className="text-[9px] sm:text-xs text-muted-foreground/80 mt-1 uppercase tracking-wider font-semibold">Katkı</p>
  </div>
  <div className="text-center bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.02] hover:border-white/[0.06] p-3 sm:p-4 rounded-xl transition-all duration-300 group">
    <p className="text-2xl sm:text-3xl font-display font-bold text-pink-400 group-hover:scale-105 transition-transform duration-300">{followerCount ?? 0}</p>
    <p className="text-[9px] sm:text-xs text-muted-foreground/80 mt-1 uppercase tracking-wider font-semibold">Takipçi</p>
  </div>
  <div className="text-center bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.02] hover:border-white/[0.06] p-3 sm:p-4 rounded-xl transition-all duration-300 group">
    <p className="text-2xl sm:text-3xl font-display font-bold text-amber-400 group-hover:scale-105 transition-transform duration-300">{streakBest}</p>
    <p className="text-[9px] sm:text-xs text-muted-foreground/80 mt-1 uppercase tracking-wider font-semibold">🔥 Seri</p>
  </div>
  <div className="text-center bg-white/[0.01] hover:bg-white/[0.03] border border-white/[0.02] hover:border-white/[0.06] p-3 sm:p-4 rounded-xl transition-all duration-300 group">
    <p className="text-2xl sm:text-3xl font-display font-bold text-emerald-400 group-hover:scale-105 transition-transform duration-300">{sprintCount ?? 0}</p>
    <p className="text-[9px] sm:text-xs text-muted-foreground/80 mt-1 uppercase tracking-wider font-semibold">⚡ Sprint</p>
  </div>
</div>
```

- [ ] **Step 5: BadgesGrid section ekle**

"OWNED PROJECTS GRID" section'ından hemen önce (yani `{/* ── OWNED PROJECTS GRID */}` comment'inden önce) yeni bir section ekle:

```tsx
{/* ── BADGES SECTION ── */}
{earnedBadges.length > 0 && (
  <section className="space-y-6">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.15)]">
        <Award className="w-4 h-4 text-amber-400" />
      </div>
      <h2 className="text-2xl font-display font-semibold text-white">Kazanılan Rozetler</h2>
    </div>
    <BadgesGrid badges={earnedBadges} />
  </section>
)}
```

Not: `Award` ikonu zaten import edilmiş.

- [ ] **Step 6: TypeScript kontrol**

```bash
npx tsc --noEmit
```

Beklenen: hata yok. Olası sorunlar:
- `UserBadge` import eksikse `types/index.ts`'ten kontrol et
- `isFollowingRow` tipinden `{ data: null }` için tip hatası gelirse: `Promise.resolve({ data: null, error: null })` kullan

- [ ] **Step 7: Commit**

```bash
git add "app/(public)/u/[username]/page.tsx"
git commit -m "feat: enhance profile page with follow button, badges, and writing stats"
```

---

### Task 2: CLAUDE.md güncelle

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Faz 6 satırını güncelle**

`CLAUDE.md`'deki platform faz tablosunda Faz 6 satırını bul:

```
| **Faz 6** | Sosyal & Büyüme | ⏳ Gelecek | Profil sayfaları, kullanıcı keşfet, yorum thread'leri, onboarding akışı |
```

Şu şekilde güncelle:

```
| **Faz 6** | Sosyal & Büyüme | 🔄 Devam Ediyor | Profil güçlendirme ✅, onboarding, yorum thread'leri, kullanıcı keşfet |
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md — Faz 6 profil gucLendirme tamamlandı"
```

---

## Son Kontrol

- [ ] `npx tsc --noEmit` temiz
- [ ] `/u/[username]` sayfasında 5 stat görünüyor
- [ ] Başka kullanıcının profiline girince FollowButton görünüyor
- [ ] Rozet kazanmış kullanıcının profilinde BadgesGrid görünüyor
- [ ] Hiç rozet kazanmamışsa BadgesGrid section gizli
