# Faz 2 — Yazar Motivasyonu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Yazarları platformda aktif tutmak — günlük yazı hedefi + server streak, 8 rozet sistemi, haftalık istatistik dashboard bölümü ve anasayfada editöryal seçki UI.

**Architecture:** `user_writing_goals` tablosu günlük hedef + streak tutar; `user_badges` (user_id, badge_code) PK ile rozet kaydeder. Badge kontrolü `lib/badges.ts` yardımcı fonksiyonuyla tüm API route'lardan çağrılır. Dashboard server component olarak sorguları çeker, client `WritingGoalCard` ayrıca `/api/writing-goal` route'unu kullanır. Anasayfadaki editöryal seçki client component olarak `/api/editorial-picks` GET'ini çağırır.

**Tech Stack:** Next.js 16 App Router · Supabase (PostgreSQL + RLS) · TypeScript · Tailwind v4 · shadcn/ui · lucide-react

---

## Dosya Haritası

| Dosya | İşlem | Ne yapar |
|-------|-------|----------|
| `supabase/schema.sql` | Modify | `user_writing_goals` + `user_badges` tabloları + RLS |
| `types/index.ts` | Modify | `BadgeCode`, `UserWritingGoal`, `UserBadge`, `WeeklyStats` tipleri |
| `lib/badges.ts` | Create | 8 rozet meta + `awardBadge` + `checkAllBadges` |
| `app/api/writing-goal/route.ts` | Create | GET (hedef+ilerleme+streak) / POST (hedef güncelle) |
| `app/api/badges/check/route.ts` | Create | POST → tüm rozet koşullarını kontrol et, kazan |
| `app/api/editorial-picks/route.ts` | Create | GET → editöryal seçki skoru sorgusu |
| `components/dashboard/WritingGoalCard.tsx` | Create | Client: günlük hedef progress bar + streak + edit |
| `components/dashboard/WeeklyStatsRow.tsx` | Create | Server: 4 metrik kartı (props alır) |
| `components/dashboard/BadgesRow.tsx` | Create | Server: kazanılan rozet satırı (props alır) |
| `components/profile/BadgesGrid.tsx` | Create | Client: tüm 8 rozet grid (kazanılmış + gri) |
| `app/(app)/dashboard/page.tsx` | Modify | Haftalık stats + badge sorguları + 3 yeni bölüm |
| `components/home/EditorialPicksSection.tsx` | Create | Client: /api/editorial-picks fetch + 3 proje kartı |
| `app/(public)/page.tsx` | Modify | `<EditorialPicksSection />` ekle |

---

### Task 1: DB Schema — user_writing_goals + user_badges

**Files:**
- Modify: `supabase/schema.sql`

- [ ] **Step 1:** `supabase/schema.sql` içinde `-- Chapter Reactions` bloğunun hemen öncesine ekle:

```sql
-- ============================================================
-- USER WRITING GOALS (Faz 2)
-- ============================================================

CREATE TABLE IF NOT EXISTS user_writing_goals (
  user_id          uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  daily_target     int NOT NULL DEFAULT 500 CHECK (daily_target BETWEEN 50 AND 10000),
  streak_current   int NOT NULL DEFAULT 0,
  streak_best      int NOT NULL DEFAULT 0,
  streak_last_date date,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_writing_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "goals_self" ON user_writing_goals;
CREATE POLICY "goals_self" ON user_writing_goals
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- USER BADGES (Faz 2)
-- ============================================================

CREATE TABLE IF NOT EXISTS user_badges (
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_code text NOT NULL,
  earned_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_code)
);

ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "badges_select_all"  ON user_badges;
DROP POLICY IF EXISTS "badges_insert_self" ON user_badges;
CREATE POLICY "badges_select_all"  ON user_badges FOR SELECT USING (true);
CREATE POLICY "badges_insert_self" ON user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
```

- [ ] **Step 2:** Commit:

```bash
git add supabase/schema.sql
git commit -m "feat: add user_writing_goals and user_badges tables to schema"
```

> **Supabase'e uygula:** Dashboard > SQL Editor > bu bloğu çalıştır (schema.sql tamamını da çalıştırabilirsin).

---

### Task 2: Tip Tanımları

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1:** `types/index.ts` dosyasının sonuna ekle:

```typescript
export type BadgeCode =
  | 'first_chapter'
  | 'thousand_words'
  | 'seven_day_streak'
  | 'team_player'
  | 'beloved'
  | 'followed'
  | 'reader_friend'
  | 'editorial_pick'

export interface UserWritingGoal {
  user_id: string
  daily_target: number
  streak_current: number
  streak_best: number
  streak_last_date: string | null
  updated_at: string
}

export interface UserBadge {
  user_id: string
  badge_code: BadgeCode
  earned_at: string
}

export interface WeeklyStats {
  wordsWritten: number
  reactionsReceived: number
  newFollowers: number
  totalViews: number
}

export interface WritingGoalResponse {
  daily_target: number
  streak_current: number
  streak_best: number
  today_words: number
}

export interface EditorialPick {
  id: string
  title: string
  slug: string
  cover_image_url: string | null
  genre: string | null
  owner_display_name: string | null
  owner_username: string
  score: number
}
```

- [ ] **Step 2:** Commit:

```bash
git add types/index.ts
git commit -m "feat: add Phase 2 type definitions (badges, writing goals, editorial picks)"
```

---

### Task 3: Badge Yardımcı Kütüphanesi

**Files:**
- Create: `lib/badges.ts`

- [ ] **Step 1:** `lib/badges.ts` dosyasını oluştur:

```typescript
import type { SupabaseClient } from '@supabase/supabase-js'
import type { BadgeCode } from '@/types'

export const BADGE_META: Record<BadgeCode, { label: string; icon: string; desc: string }> = {
  first_chapter:    { label: 'İlk Adım',       icon: '🖊️', desc: 'İlk bölümünü yayınladın' },
  thousand_words:   { label: 'Bin Kelime',      icon: '📖', desc: 'Toplam 1.000 kelime yazdın' },
  seven_day_streak: { label: 'Ateş Yazar',      icon: '🔥', desc: '7 gün üst üste yazdın' },
  team_player:      { label: 'Ekip Oyuncusu',   icon: '👥', desc: 'Bir projeye üye oldun' },
  beloved:          { label: 'Sevildi',          icon: '❤️', desc: '10 alkış aldın' },
  followed:         { label: 'Takip Edildi',     icon: '🌟', desc: '5 takipçiye ulaştın' },
  reader_friend:    { label: 'Okur Dostu',       icon: '📚', desc: 'Projen 10 kez listeye eklendi' },
  editorial_pick:   { label: 'Editör Seçkisi',   icon: '🏆', desc: 'Editöryal seçkiye girdin' },
}

export const ALL_BADGE_CODES = Object.keys(BADGE_META) as BadgeCode[]

export async function awardBadge(
  supabase: SupabaseClient,
  userId: string,
  badgeCode: BadgeCode
): Promise<boolean> {
  const { error } = await supabase
    .from('user_badges')
    .insert({ user_id: userId, badge_code: badgeCode })
  // error code 23505 = unique_violation (already has badge) — ignore it
  return !error || error.code === '23505'
}

export async function checkAllBadges(
  supabase: SupabaseClient,
  userId: string
): Promise<BadgeCode[]> {
  // Get already earned badges
  const { data: existing } = await supabase
    .from('user_badges')
    .select('badge_code')
    .eq('user_id', userId)
  const earned = new Set((existing ?? []).map((b: { badge_code: string }) => b.badge_code))

  const newlyAwarded: BadgeCode[] = []

  async function maybeAward(code: BadgeCode, check: () => Promise<boolean>) {
    if (earned.has(code)) return
    if (await check()) {
      await awardBadge(supabase, userId, code)
      newlyAwarded.push(code)
    }
  }

  // first_chapter: has at least one final chapter created by user
  await maybeAward('first_chapter', async () => {
    const { count } = await supabase
      .from('chapters')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', userId)
      .eq('status', 'final')
    return (count ?? 0) >= 1
  })

  // thousand_words: total words across all versions authored by user >= 1000
  await maybeAward('thousand_words', async () => {
    const { data } = await supabase
      .from('chapter_versions')
      .select('word_count')
      .eq('author_id', userId)
    const total = (data ?? []).reduce((s: number, v: { word_count: number }) => s + (v.word_count ?? 0), 0)
    return total >= 1000
  })

  // seven_day_streak: streak_current >= 7
  await maybeAward('seven_day_streak', async () => {
    const { data } = await supabase
      .from('user_writing_goals')
      .select('streak_current')
      .eq('user_id', userId)
      .single()
    return (data?.streak_current ?? 0) >= 7
  })

  // team_player: member of a project they don't own
  await maybeAward('team_player', async () => {
    const { data } = await supabase
      .from('project_members')
      .select('project_id, projects!inner(owner_id)')
      .eq('user_id', userId)
    const notOwned = (data ?? []).filter((m: any) => m.projects?.owner_id !== userId)
    return notOwned.length >= 1
  })

  // beloved: total reactions on user's chapters >= 10
  await maybeAward('beloved', async () => {
    const { data: userChapters } = await supabase
      .from('chapters')
      .select('id')
      .eq('created_by', userId)
    const chapterIds = (userChapters ?? []).map((c: { id: string }) => c.id)
    if (chapterIds.length === 0) return false
    const { count } = await supabase
      .from('chapter_reactions')
      .select('id', { count: 'exact', head: true })
      .in('chapter_id', chapterIds)
    return (count ?? 0) >= 10
  })

  // followed: has 5+ followers
  await maybeAward('followed', async () => {
    const { count } = await supabase
      .from('follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('following_id', userId)
    return (count ?? 0) >= 5
  })

  // reader_friend: user's projects added to reading lists 10+ times total
  await maybeAward('reader_friend', async () => {
    const { data: userProjects } = await supabase
      .from('projects')
      .select('id')
      .eq('owner_id', userId)
    const projectIds = (userProjects ?? []).map((p: { id: string }) => p.id)
    if (projectIds.length === 0) return false
    const { count } = await supabase
      .from('reading_lists')
      .select('id', { count: 'exact', head: true })
      .in('project_id', projectIds)
    return (count ?? 0) >= 10
  })

  // editorial_pick: checked separately in editorial-picks API — skip here
  return newlyAwarded
}
```

- [ ] **Step 2:** Build'in bozulmadığını kontrol et:

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3:** Commit:

```bash
git add lib/badges.ts
git commit -m "feat: add badge utility library with BADGE_META and checkAllBadges"
```

---

### Task 4: Writing Goal API Route

**Files:**
- Create: `app/api/writing-goal/route.ts`

- [ ] **Step 1:** `app/api/writing-goal/route.ts` dosyasını oluştur:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAllBadges } from '@/lib/badges'

// GET /api/writing-goal
// Returns: { daily_target, streak_current, streak_best, today_words }
// Also updates streak server-side
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  // Fetch today's words written (UTC day)
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setUTCHours(23, 59, 59, 999)

  const { data: versions } = await supabase
    .from('chapter_versions')
    .select('word_count')
    .eq('author_id', user.id)
    .gte('created_at', todayStart.toISOString())
    .lte('created_at', todayEnd.toISOString())

  const todayWords = (versions ?? []).reduce(
    (s: number, v: { word_count: number }) => s + (v.word_count ?? 0),
    0
  )

  // Fetch or create goal row
  const { data: existing } = await supabase
    .from('user_writing_goals')
    .select('*')
    .eq('user_id', user.id)
    .single()

  const goal = existing ?? {
    user_id: user.id,
    daily_target: 500,
    streak_current: 0,
    streak_best: 0,
    streak_last_date: null,
  }

  const todayStr = new Date().toISOString().slice(0, 10)
  let { streak_current, streak_best, streak_last_date } = goal
  let streakUpdated = false

  if (todayWords > 0 && streak_last_date !== todayStr) {
    // User wrote today — update streak
    if (!streak_last_date) {
      streak_current = 1
    } else {
      const last = new Date(streak_last_date)
      const now = new Date(todayStr)
      const diffDays = Math.round((now.getTime() - last.getTime()) / 86400000)
      streak_current = diffDays <= 1 ? streak_current + 1 : 1
    }
    streak_best = Math.max(streak_current, streak_best)
    streak_last_date = todayStr
    streakUpdated = true
  } else if (streak_last_date && streak_last_date !== todayStr) {
    // Check for streak break (more than 1 day gap)
    const last = new Date(streak_last_date)
    const now = new Date(todayStr)
    const diffDays = Math.round((now.getTime() - last.getTime()) / 86400000)
    if (diffDays > 1 && streak_current > 0) {
      streak_current = 0
      streakUpdated = true
    }
  }

  if (streakUpdated || !existing) {
    await supabase.from('user_writing_goals').upsert({
      user_id: user.id,
      daily_target: goal.daily_target,
      streak_current,
      streak_best,
      streak_last_date,
      updated_at: new Date().toISOString(),
    })

    // Check streak-related badges after update
    await checkAllBadges(supabase, user.id)
  }

  return NextResponse.json({
    daily_target: goal.daily_target,
    streak_current,
    streak_best,
    today_words: todayWords,
  })
}

// POST /api/writing-goal
// Body: { daily_target: number }
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { daily_target } = await req.json()
  if (typeof daily_target !== 'number' || daily_target < 50 || daily_target > 10000) {
    return NextResponse.json({ error: 'Hedef 50-10000 arasında olmalı.' }, { status: 400 })
  }

  const { error } = await supabase.from('user_writing_goals').upsert({
    user_id: user.id,
    daily_target,
    updated_at: new Date().toISOString(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, daily_target })
}
```

- [ ] **Step 2:** Build kontrol:

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3:** Commit:

```bash
git add app/api/writing-goal/route.ts
git commit -m "feat: add writing goal API (GET streak+progress, POST update target)"
```

---

### Task 5: Badge Check Endpoint

**Files:**
- Create: `app/api/badges/check/route.ts`

- [ ] **Step 1:** `app/api/badges/check/` klasörünü oluştur, `route.ts` yaz:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAllBadges } from '@/lib/badges'

// POST /api/badges/check
// Checks all badge conditions for current user, awards any newly earned
// Returns: { newly_awarded: BadgeCode[] }
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const newlyAwarded = await checkAllBadges(supabase, user.id)
  return NextResponse.json({ newly_awarded: newlyAwarded })
}
```

- [ ] **Step 2:** Commit:

```bash
git add app/api/badges/check/route.ts
git commit -m "feat: add badge check endpoint (POST /api/badges/check)"
```

---

### Task 6: WritingGoalCard Bileşeni

**Files:**
- Create: `components/dashboard/WritingGoalCard.tsx`

- [ ] **Step 1:** `components/dashboard/` klasörünü oluştur, `WritingGoalCard.tsx` yaz:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Target, Pencil, Check, X, Flame } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WritingGoalResponse } from '@/types'

export function WritingGoalCard() {
  const [data, setData] = useState<WritingGoalResponse | null>(null)
  const [editing, setEditing] = useState(false)
  const [inputVal, setInputVal] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/writing-goal')
      .then(r => r.json())
      .then((d: WritingGoalResponse) => {
        setData(d)
        setInputVal(String(d.daily_target))
      })
      .catch(() => {})
  }, [])

  async function saveTarget() {
    const target = parseInt(inputVal)
    if (isNaN(target) || target < 50 || target > 10000) return
    setSaving(true)
    const res = await fetch('/api/writing-goal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ daily_target: target }),
    })
    if (res.ok && data) {
      setData({ ...data, daily_target: target })
    }
    setSaving(false)
    setEditing(false)
  }

  if (!data) {
    return (
      <div className="glass-card rounded-2xl p-5 h-32 animate-pulse" />
    )
  }

  const pct = Math.min(100, Math.round((data.today_words / data.daily_target) * 100))
  const done = data.today_words >= data.daily_target

  return (
    <div className="glass-card rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-medium">Günlük Hedef</span>
        </div>
        <div className="flex items-center gap-2">
          {data.streak_current > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber-400 font-medium">
              <Flame className="w-3.5 h-3.5" />
              {data.streak_current} gün
            </span>
          )}
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="text-muted-foreground hover:text-white transition-colors p-1"
              title="Hedefi düzenle"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                className="w-20 bg-white/[0.06] border border-white/[0.1] rounded-md px-2 py-0.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary"
                min={50}
                max={10000}
              />
              <button
                onClick={saveTarget}
                disabled={saving}
                className="text-emerald-400 hover:text-emerald-300 p-1"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => { setEditing(false); setInputVal(String(data.daily_target)) }}
                className="text-muted-foreground hover:text-white p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              done ? 'bg-emerald-500' : 'bg-primary'
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className={cn('font-medium', done ? 'text-emerald-400' : 'text-muted-foreground')}>
            {data.today_words.toLocaleString('tr-TR')} kelime
          </span>
          <span className="text-muted-foreground">
            {done ? '✓ Tamamlandı!' : `/ ${data.daily_target.toLocaleString('tr-TR')}`}
          </span>
        </div>
      </div>

      {/* Best streak */}
      {data.streak_best > 0 && (
        <p className="text-[11px] text-muted-foreground/60">
          En uzun seri: {data.streak_best} gün
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2:** Build kontrol:

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3:** Commit:

```bash
git add components/dashboard/WritingGoalCard.tsx
git commit -m "feat: add WritingGoalCard component (daily goal progress + streak)"
```

---

### Task 7: WeeklyStatsRow Bileşeni

**Files:**
- Create: `components/dashboard/WeeklyStatsRow.tsx`

- [ ] **Step 1:** `components/dashboard/WeeklyStatsRow.tsx` dosyasını oluştur:

```typescript
import { PenLine, Heart, UserPlus, Eye } from 'lucide-react'
import type { WeeklyStats } from '@/types'

interface Props {
  stats: WeeklyStats
}

const ITEMS = [
  { key: 'wordsWritten',      label: 'Kelime',      icon: PenLine,  color: 'text-violet-400' },
  { key: 'reactionsReceived', label: 'Alkış',       icon: Heart,    color: 'text-rose-400'   },
  { key: 'newFollowers',      label: 'Takipçi',     icon: UserPlus, color: 'text-sky-400'    },
  { key: 'totalViews',        label: 'Okunma',      icon: Eye,      color: 'text-emerald-400' },
] as const

export function WeeklyStatsRow({ stats }: Props) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Bu Hafta</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {ITEMS.map(({ key, label, icon: Icon, color }) => (
          <div key={key} className="glass-card rounded-xl p-4">
            <Icon className={`w-4 h-4 ${color} mb-2`} />
            <p className="text-xl font-display font-bold">
              {(stats[key] ?? 0).toLocaleString('tr-TR')}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 2:** Commit:

```bash
git add components/dashboard/WeeklyStatsRow.tsx
git commit -m "feat: add WeeklyStatsRow component (4 weekly metrics)"
```

---

### Task 8: BadgesRow + BadgesGrid Bileşenleri

**Files:**
- Create: `components/dashboard/BadgesRow.tsx`
- Create: `components/profile/BadgesGrid.tsx`

- [ ] **Step 1:** `components/dashboard/BadgesRow.tsx` dosyasını oluştur:

```typescript
import { BADGE_META, ALL_BADGE_CODES } from '@/lib/badges'
import type { UserBadge } from '@/types'

interface Props {
  badges: UserBadge[]
}

export function BadgesRow({ badges }: Props) {
  if (badges.length === 0) return null

  const earnedCodes = new Set(badges.map(b => b.badge_code))

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
        Rozetler ({badges.length}/{ALL_BADGE_CODES.length})
      </h2>
      <div className="flex flex-wrap gap-2">
        {badges.map(badge => {
          const meta = BADGE_META[badge.badge_code as keyof typeof BADGE_META]
          if (!meta) return null
          return (
            <div
              key={badge.badge_code}
              title={`${meta.label} — ${meta.desc}\n${new Date(badge.earned_at).toLocaleDateString('tr-TR')}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-medium text-white cursor-default"
            >
              <span>{meta.icon}</span>
              <span>{meta.label}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
```

- [ ] **Step 2:** `components/profile/` klasörünü oluştur (yoksa), `BadgesGrid.tsx` yaz:

```typescript
'use client'

import { BADGE_META, ALL_BADGE_CODES } from '@/lib/badges'
import type { UserBadge } from '@/types'
import { cn } from '@/lib/utils'

interface Props {
  badges: UserBadge[]
}

export function BadgesGrid({ badges }: Props) {
  const earnedMap = new Map(badges.map(b => [b.badge_code, b]))

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {ALL_BADGE_CODES.map(code => {
        const meta = BADGE_META[code]
        const earned = earnedMap.get(code)
        return (
          <div
            key={code}
            title={earned ? `${meta.label} — ${new Date(earned.earned_at).toLocaleDateString('tr-TR')}` : meta.desc}
            className={cn(
              'flex flex-col items-center gap-1.5 p-4 rounded-xl border text-center transition-all',
              earned
                ? 'border-white/[0.1] bg-white/[0.04] text-white'
                : 'border-white/[0.04] bg-white/[0.01] text-muted-foreground/40 grayscale'
            )}
          >
            <span className="text-2xl">{meta.icon}</span>
            <span className="text-xs font-medium leading-tight">{meta.label}</span>
            {earned && (
              <span className="text-[10px] text-muted-foreground">
                {new Date(earned.earned_at).toLocaleDateString('tr-TR')}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3:** Build kontrol:

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4:** Commit:

```bash
git add components/dashboard/BadgesRow.tsx components/profile/BadgesGrid.tsx
git commit -m "feat: add BadgesRow (dashboard) and BadgesGrid (profile) components"
```

---

### Task 9: Dashboard Sayfası Güncellemesi

**Files:**
- Modify: `app/(app)/dashboard/page.tsx`

- [ ] **Step 1:** Mevcut dosyayı oku, sonra tüm içeriği şu hale getir:

```typescript
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, BookOpen, Bell, Users, PenLine, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ProjectCard } from '@/components/project/ProjectCard'
import { EmptyState } from '@/components/shared/EmptyState'
import { WritingGoalCard } from '@/components/dashboard/WritingGoalCard'
import { WeeklyStatsRow } from '@/components/dashboard/WeeklyStatsRow'
import { BadgesRow } from '@/components/dashboard/BadgesRow'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ProjectWithOwner, WeeklyStats, UserBadge } from '@/types'

export const metadata: Metadata = { title: 'Dashboard — Kalem Birliği' }
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: ownedProjects },
    { data: membershipData },
    { data: versionStats },
    { data: reactionStats },
    { data: followerStats },
    { data: badgeData },
  ] = await Promise.all([
    supabase
      .from('projects')
      .select('*, owner:profiles!projects_owner_id_fkey(*), roles:project_roles(*)')
      .eq('owner_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(6),
    supabase
      .from('project_members')
      .select('project:projects(*, owner:profiles!projects_owner_id_fkey(*), roles:project_roles(*))')
      .eq('user_id', user.id)
      .limit(6),
    supabase
      .from('chapter_versions')
      .select('word_count')
      .eq('author_id', user.id)
      .gte('created_at', sevenDaysAgo),
    supabase
      .from('chapter_reactions')
      .select('chapter_id, chapters!inner(created_by)')
      .eq('chapters.created_by', user.id)
      .gte('created_at', sevenDaysAgo),
    supabase
      .from('follows')
      .select('follower_id', { count: 'exact', head: true })
      .eq('following_id', user.id)
      .gte('created_at', sevenDaysAgo),
    supabase
      .from('user_badges')
      .select('*')
      .eq('user_id', user.id)
      .order('earned_at', { ascending: false }),
  ])

  const owned = (ownedProjects ?? []) as ProjectWithOwner[]
  const memberProjects = (membershipData ?? [])
    .map((m: any) => m.project)
    .filter(Boolean) as ProjectWithOwner[]

  const projectIds = owned.map(p => p.id)
  const { data: pendingApplications } = projectIds.length > 0
    ? await supabase
        .from('applications')
        .select('*, applicant:profiles!applications_applicant_id_fkey(*), role:project_roles(*)')
        .in('project_id', projectIds)
        .eq('status', 'pending')
        .limit(5)
    : { data: [] }

  const pending = (pendingApplications ?? []) as any[]
  const totalWords = owned.reduce((s, p) => s + (p.current_word_count ?? 0), 0)

  // Weekly stats
  const totalViews = owned.reduce((s, p: any) => {
    // sum view_count from chapters — not directly available here; use 0 placeholder
    return s
  }, 0)

  const weeklyStats: WeeklyStats = {
    wordsWritten: (versionStats ?? []).reduce((s: number, v: { word_count: number }) => s + (v.word_count ?? 0), 0),
    reactionsReceived: (reactionStats ?? []).length,
    newFollowers: followerStats ?? 0,
    totalViews: 0, // Faz 3'te view_count diff tracking eklenecek
  }

  const badges = (badgeData ?? []) as UserBadge[]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-12">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Projelerini yönet ve ilerlemeyi takip et.</p>
        </div>
        <Link
          href="/projects/new"
          className={cn(buttonVariants(), 'bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(124,58,237,0.35)] hover:shadow-[0_0_28px_rgba(124,58,237,0.5)] transition-shadow shrink-0')}
        >
          <Plus className="w-4 h-4 mr-1.5" /> Yeni Proje
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Projem',        value: owned.length,          icon: BookOpen, color: 'text-violet-400' },
          { label: 'Katıldığım',    value: memberProjects.length, icon: Users,    color: 'text-sky-400'    },
          { label: 'Bekleyen',      value: pending.length,        icon: Bell,     color: 'text-amber-400'  },
          { label: 'Toplam Kelime', value: totalWords > 999 ? `${(totalWords/1000).toFixed(1)}K` : totalWords, icon: BookOpen, color: 'text-emerald-400' },
        ].map(stat => (
          <div key={stat.label} className="glass-card rounded-2xl p-5">
            <stat.icon className={`w-4 h-4 ${stat.color} mb-3`} />
            <p className="text-2xl font-display font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Günlük hedef + haftalık stats yan yana */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <WritingGoalCard />
        <div className="lg:col-span-2">
          <WeeklyStatsRow stats={weeklyStats} />
        </div>
      </div>

      {/* Rozetler */}
      <BadgesRow badges={badges} />

      {/* Bekleyen Başvurular */}
      {pending.length > 0 && (
        <section className="glass-card rounded-2xl p-6 space-y-4 border-l-2 border-primary">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">Bekleyen Başvurular</h2>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">{pending.length}</span>
          </div>
          <div className="space-y-3">
            {pending.map((app: any) => (
              <div key={app.id} className="flex items-center justify-between gap-3 py-2.5 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary shrink-0">
                    {app.applicant?.display_name?.[0] ?? app.applicant?.username?.[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{app.applicant?.display_name ?? app.applicant?.username}</p>
                    <p className="text-xs text-muted-foreground">{app.role?.name} rolü için başvurdu</p>
                  </div>
                </div>
                <Link href={`/projects/${app.project_id}/overview`} className="text-xs text-primary hover:text-accent transition-colors shrink-0 font-medium">
                  İncele →
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Kendi Projeleri */}
      <section className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-violet-400" />
          </div>
          <h2 className="text-xl font-display font-semibold">Projelerim</h2>
        </div>
        {owned.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Henüz proje yok"
            description="İlk projeyi oluştur ve ekibini kur."
            action={{ label: 'Proje Oluştur', href: '/projects/new' }}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {owned.map(p => (
              <div key={p.id} className="space-y-2">
                <ProjectCard project={p} />
                <div className="flex gap-2 px-1">
                  <Link
                    href={`/projects/${p.id}/write`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 text-xs font-medium transition-colors"
                  >
                    <PenLine className="w-3.5 h-3.5" /> Yaz
                  </Link>
                  <Link
                    href={`/projects/${p.id}/overview`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-surface-2 border border-border text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5" /> Yönet
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Üye Olunan Projeler */}
      {memberProjects.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/15 flex items-center justify-center">
              <Users className="w-4 h-4 text-sky-400" />
            </div>
            <h2 className="text-xl font-display font-semibold">Katıldığım Projeler</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {memberProjects.map(p => (
              <div key={p.id} className="space-y-2">
                <ProjectCard project={p} />
                <Link
                  href={`/projects/${p.id}/write`}
                  className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-primary/15 text-primary hover:bg-primary/25 text-xs font-medium transition-colors w-full"
                >
                  <PenLine className="w-3.5 h-3.5" /> Yazı Odasına Git
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
```

- [ ] **Step 2:** Build kontrol:

```bash
npx tsc --noEmit
```

Expected: No errors. If `chapters.created_by` join fails TypeScript, change the reactionStats query to:
```typescript
supabase.from('chapter_reactions').select('id').gte('created_at', sevenDaysAgo)
// then filter by user's chapters separately if needed
```

- [ ] **Step 3:** Dev sunucusunu başlat ve dashboard'u kontrol et:

```bash
npm run dev
```

`http://localhost:3000/dashboard` adresini aç. Şunları doğrula:
- WritingGoalCard: yükleniyor → hedef ve progress bar görünüyor
- WeeklyStatsRow: 4 kart görünüyor (0 değerler normal)
- BadgesRow: rozet yoksa section gizli (badges.length === 0 ise return null)
- Mevcut projeler ve başvurular bozulmadı

- [ ] **Step 4:** Commit:

```bash
git add app/\(app\)/dashboard/page.tsx
git commit -m "feat: update dashboard with writing goal, weekly stats, and badges sections"
```

---

### Task 10: Editöryal Seçki API + Bileşen + Anasayfa

**Files:**
- Create: `app/api/editorial-picks/route.ts`
- Create: `components/home/EditorialPicksSection.tsx`
- Modify: `app/(public)/page.tsx`

- [ ] **Step 1:** `app/api/editorial-picks/route.ts` oluştur:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { awardBadge } from '@/lib/badges'
import type { EditorialPick } from '@/types'

// GET /api/editorial-picks
// Returns top 3 projects by editorial score (last 7 days)
// Score = reactions×3 + reading_list_adds×2 + views×1
export async function GET() {
  const supabase = await createClient()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Get published projects with activity in last 7 days
  const { data: projects } = await supabase
    .from('projects')
    .select('id, title, slug, cover_image_url, genre, owner_id, owner:profiles!projects_owner_id_fkey(display_name, username)')
    .eq('visibility', 'published')

  if (!projects || projects.length === 0) {
    return NextResponse.json({ picks: [] })
  }

  const projectIds = projects.map((p: any) => p.id)

  // Get chapter IDs for these projects
  const { data: chapters } = await supabase
    .from('chapters')
    .select('id, project_id, view_count')
    .in('project_id', projectIds)
    .eq('status', 'final')

  if (!chapters || chapters.length === 0) {
    return NextResponse.json({ picks: [] })
  }

  const chapterIds = chapters.map((c: any) => c.id)

  // Get reactions in last 7 days
  const { data: reactions } = await supabase
    .from('chapter_reactions')
    .select('chapter_id')
    .in('chapter_id', chapterIds)
    .gte('created_at', sevenDaysAgo)

  // Get reading list adds in last 7 days
  const { data: readingLists } = await supabase
    .from('reading_lists')
    .select('project_id')
    .in('project_id', projectIds)
    .gte('updated_at', sevenDaysAgo)

  // Build chapter → project map and score map
  const chapterToProject: Record<string, string> = {}
  const projectViewCount: Record<string, number> = {}
  for (const ch of chapters) {
    chapterToProject[ch.id] = ch.project_id
    projectViewCount[ch.project_id] = (projectViewCount[ch.project_id] ?? 0) + (ch.view_count ?? 0)
  }

  const scores: Record<string, number> = {}
  for (const p of projects) {
    scores[p.id] = (projectViewCount[p.id] ?? 0) * 1
  }
  for (const r of reactions ?? []) {
    const pid = chapterToProject[r.chapter_id]
    if (pid) scores[pid] = (scores[pid] ?? 0) + 3
  }
  for (const rl of readingLists ?? []) {
    scores[rl.project_id] = (scores[rl.project_id] ?? 0) + 2
  }

  // Sort and take top 3 with score > 0
  const ranked = projects
    .map((p: any) => ({ ...p, score: scores[p.id] ?? 0 }))
    .filter((p: any) => p.score > 0)
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 3)

  // Award editorial_pick badge to owners
  const { data: { user } } = await supabase.auth.getUser()
  for (const pick of ranked) {
    await awardBadge(supabase, pick.owner_id, 'editorial_pick')
  }

  const picks: EditorialPick[] = ranked.map((p: any) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    cover_image_url: p.cover_image_url,
    genre: p.genre,
    owner_display_name: p.owner?.display_name ?? null,
    owner_username: p.owner?.username ?? '',
    score: p.score,
  }))

  return NextResponse.json({ picks })
}
```

- [ ] **Step 2:** `components/home/` klasörünü oluştur, `EditorialPicksSection.tsx` yaz:

```typescript
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Trophy, BookOpen } from 'lucide-react'
import type { EditorialPick } from '@/types'

export function EditorialPicksSection() {
  const [picks, setPicks] = useState<EditorialPick[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/editorial-picks')
      .then(r => r.json())
      .then(d => { setPicks(d.picks ?? []); setLoaded(true) })
      .catch(() => setLoaded(true))
  }, [])

  if (!loaded || picks.length === 0) return null

  return (
    <section className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-16">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
          <Trophy className="w-4 h-4 text-amber-400" />
        </div>
        <div>
          <h2 className="text-xl font-display font-semibold text-white">Bu Hafta Öne Çıkanlar</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Okuyucular tarafından en çok beğenilen hikâyeler</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {picks.map((pick, i) => (
          <Link
            key={pick.id}
            href={`/projects/${pick.slug}/read`}
            className="group block glass-card rounded-2xl overflow-hidden hover:border-white/[0.15] transition-colors"
          >
            {/* Cover */}
            <div className="aspect-[3/2] bg-gradient-to-br from-violet-900/30 to-indigo-900/20 relative overflow-hidden">
              {pick.cover_image_url ? (
                <img
                  src={pick.cover_image_url}
                  alt={pick.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <BookOpen className="w-10 h-10 text-white/10" />
                </div>
              )}
              {i === 0 && (
                <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/90 text-[10px] font-bold text-black">
                  🏆 #1
                </div>
              )}
            </div>

            {/* Info */}
            <div className="p-4">
              <p className="font-semibold text-white line-clamp-1">{pick.title}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {pick.owner_display_name ?? pick.owner_username}
                {pick.genre && <span className="ml-1.5 text-muted-foreground/60">· {pick.genre}</span>}
              </p>
              <span className="inline-block mt-3 text-xs text-primary font-medium group-hover:text-accent transition-colors">
                Okumaya Başla →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 3:** `app/(public)/page.tsx` içinde `FEATURES` dizisinin üstündeki import satırlarına ekle:

```typescript
import { EditorialPicksSection } from '@/components/home/EditorialPicksSection'
```

- [ ] **Step 4:** `app/(public)/page.tsx` içinde `{/* ── STATS SECTION ── */}` bloğunun hemen **öncesine** `<EditorialPicksSection />` ekle. Sayfa içinde `return (` bloğunu aç, `<div className="relative min-h-screen ...">` altında hero section'ın hemen **sonrasına** ekle:

`app/(public)/page.tsx` dosyasında `{/* ── FEATURES SECTION ── */}` yazan yorum satırını bul, onun hemen öncesine ekle:

```tsx
{/* ── EDITORIAL PICKS ── */}
<EditorialPicksSection />
```

- [ ] **Step 5:** Build kontrol:

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6:** Dev sunucusunu başlat, anasayfayı kontrol et:

```bash
npm run dev
```

`http://localhost:3000` adresini aç. Şunları doğrula:
- Yayında proje yoksa editöryal seçki section'ı görünmez (return null)
- Yayında proje varsa hero'dan sonra "Bu Hafta Öne Çıkanlar" gösterilir
- Kartlar doğru render ediliyor (kapak, başlık, yazar)
- Dashboard bağlantısı bozulmadı

- [ ] **Step 7:** Commit:

```bash
git add app/api/editorial-picks/route.ts components/home/EditorialPicksSection.tsx app/\(public\)/page.tsx
git commit -m "feat: add editorial picks API, section component, and homepage integration"
```

---

### Task 11: CLAUDE.md Güncelleme

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1:** `CLAUDE.md` içinde `## Henüz Uygulanmamış / Bekleyen` bölümüne şunu ekle:

```
- **Faz 2 Supabase tabloları** — `user_writing_goals` ve `user_badges` Dashboard > SQL Editor'dan çalıştırılmalı
- **`totalViews` haftalık istatistik** — şu an 0 gösterir; Faz 3'te chapter_reads tablosu ile gerçek veri gelecek
```

`## Dosya Yapısı` bölümündeki `components/reader/` bloğunun öncesine yeni dosyaları ekle:

```
app/api/writing-goal/route.ts         # GET (hedef+ilerleme+streak) | POST (hedef güncelle)
app/api/badges/check/route.ts         # POST tüm rozet koşullarını kontrol et
app/api/editorial-picks/route.ts      # GET editöryal seçki skoru (reactions×3+bookmarks×2+views×1)
lib/badges.ts                         # BADGE_META + awardBadge + checkAllBadges
components/dashboard/
  WritingGoalCard.tsx                 # Client: günlük hedef progress + streak + edit
  WeeklyStatsRow.tsx                  # 4 metrik kartı (bu hafta)
  BadgesRow.tsx                       # Kazanılan rozet satırı
components/profile/
  BadgesGrid.tsx                      # Tüm 8 rozet grid (kazanılmış + gri)
components/home/
  EditorialPicksSection.tsx           # Client: editorial picks fetch + 3 proje kartı
```

- [ ] **Step 2:** Commit:

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with Phase 2 file map and pending items"
```

---

## Özet: Hangi Sırayla Çalıştırılır

Bağımlılık sırası:
1. **Task 1** (Schema) → Supabase'e uygula
2. **Task 2** (Types)
3. **Task 3** (lib/badges.ts) — Task 2'ye bağlı
4. **Task 4** (Writing Goal API) — Task 3'e bağlı
5. **Task 5** (Badge Check endpoint) — Task 3'e bağlı
6. **Task 6, 7, 8** (UI components) — Task 2'ye bağlı, birbirinden bağımsız
7. **Task 9** (Dashboard) — Task 4, 6, 7, 8'e bağlı
8. **Task 10** (Editorial Picks) — Task 3'e bağlı, Task 9'dan bağımsız
9. **Task 11** (CLAUDE.md) — Son

Tasks 4 ve 5 paralel çalışabilir. Tasks 6, 7, 8 paralel çalışabilir.
