# Faz 1 — Okuyucu Bağı (Reader Engagement) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Okuyucuyu platforma bağlayan 5 temel özelliği ekle: bölüm görüntüleme sayacı, 3 tepkili alkış sistemi, okuma listesi, yazarı takip et, ve yeni bölüm bildirimi.

**Architecture:** Tüm yeni özellikler `(public)` okuma sayfalarına eklenir. Etkileşimli bileşenler (ReactionBar, ReadingListButton, FollowButton) client component, sayfa kendisi server component kalır. API route'lar Supabase server client kullanır. DB tetikleyicisi yeni bölüm yayınlanınca takipçilere otomatik bildirim gönderir.

**Tech Stack:** Next.js 16 App Router · Supabase PostgreSQL + RLS · TypeScript · Tailwind CSS v4 · shadcn/ui (Button, DropdownMenu)

---

## Dosya Yapısı

**Oluşturulacak:**
- `supabase/schema.sql` — 5 yeni tablo/kolon/trigger/politika eklenir (mevcut dosya güncellenir)
- `components/reader/ViewTracker.tsx` — mount'ta view_count artıran client component
- `components/reader/ReactionBar.tsx` — 3 tepki butonu (🔥💧⚡), sayaçlar
- `components/reader/ReadingListButton.tsx` — sonra oku/okuyorum/bitirdim dropdown
- `components/reader/FollowButton.tsx` — takip et/bırak butonu
- `app/api/reactions/route.ts` — POST tepki toggle, GET tepki sayıları
- `app/api/reading-list/route.ts` — POST (upsert status), DELETE (kaldır)
- `app/api/follows/route.ts` — POST (toggle follow/unfollow)

**Değiştirilecek:**
- `supabase/schema.sql` — yeni tablolar + RLS + triggerlar + chapters politika genişletmesi
- `app/(public)/projects/[slug]/read/[chapterId]/page.tsx` — ViewTracker + ReactionBar ekle
- `app/(public)/projects/[slug]/read/page.tsx` — ReadingListButton + FollowButton ekle
- `types/index.ts` — yeni tipler ekle
- `app/(app)/notifications/page.tsx` — new_chapter + new_follower tip meta ekle

---

## Task 1: Database Schema

**Files:**
- Modify: `supabase/schema.sql`

- [ ] **Step 1: schema.sql'e yeni enum değerleri ekle**

`supabase/schema.sql` dosyasında mevcut enum bloklarının hemen altına (satır ~32 civarı, `CREATE TABLE IF NOT EXISTS profiles` öncesine) ekle:

```sql
-- Yeni notification tipleri (idempotent — varsa hata vermez)
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'new_chapter';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'new_follower';
```

- [ ] **Step 2: Yeni tabloları schema.sql'e ekle**

`notifications` tablosunun CREATE bloğundan (satır ~194) hemen SONRAYA ekle:

```sql
-- Bölüm görüntüleme sayacı (chapters tablosuna kolon)
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS view_count int NOT NULL DEFAULT 0;

-- Alkış/tepki sistemi
CREATE TABLE IF NOT EXISTS chapter_reactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id  uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reaction    text NOT NULL CHECK (reaction IN ('fire', 'drop', 'bolt')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(chapter_id, user_id, reaction)
);

-- Okuma listesi
CREATE TABLE IF NOT EXISTS reading_lists (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status     text NOT NULL CHECK (status IN ('want', 'reading', 'done')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, project_id)
);

-- Takip sistemi
CREATE TABLE IF NOT EXISTS follows (
  follower_id  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(follower_id, following_id),
  CHECK(follower_id != following_id)
);
```

- [ ] **Step 3: Yardımcı fonksiyonları ekle**

`handle_new_user` fonksiyonundan önce (satır ~207 civarı) ekle:

```sql
-- Bölüm görüntüleme sayacı (RLS bypass — SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.increment_chapter_view(p_chapter_id uuid)
RETURNS void AS $$
  UPDATE chapters SET view_count = COALESCE(view_count, 0) + 1 WHERE id = p_chapter_id;
$$ LANGUAGE sql SECURITY DEFINER;

-- Yeni bölüm yayınlanınca takipçilere bildirim
CREATE OR REPLACE FUNCTION public.notify_chapter_followers()
RETURNS trigger AS $$
DECLARE
  v_project_id   uuid;
  v_owner_id     uuid;
  v_project_title text;
  v_project_slug  text;
  v_follower     record;
BEGIN
  IF NEW.status = 'final' AND (OLD.status IS NULL OR OLD.status::text != 'final') THEN
    SELECT p.id, p.owner_id, p.title, p.slug
      INTO v_project_id, v_owner_id, v_project_title, v_project_slug
      FROM projects p WHERE p.id = NEW.project_id;
    FOR v_follower IN
      SELECT follower_id FROM follows WHERE following_id = v_owner_id
    LOOP
      INSERT INTO notifications (user_id, type, payload)
      VALUES (
        v_follower.follower_id,
        'new_chapter',
        jsonb_build_object(
          'chapter_id', NEW.id,
          'chapter_title', NEW.title,
          'project_id', v_project_id,
          'project_title', v_project_title,
          'project_slug', v_project_slug,
          'author_id', v_owner_id
        )
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Yeni takipçi bildirimi
CREATE OR REPLACE FUNCTION public.notify_new_follower()
RETURNS trigger AS $$
DECLARE
  v_name text; v_username text;
BEGIN
  SELECT display_name, username INTO v_name, v_username
    FROM profiles WHERE id = NEW.follower_id;
  INSERT INTO notifications (user_id, type, payload)
  VALUES (
    NEW.following_id,
    'new_follower',
    jsonb_build_object(
      'follower_id', NEW.follower_id,
      'follower_display_name', v_name,
      'follower_username', v_username
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- [ ] **Step 4: Trigger'ları ekle**

Mevcut trigger bloklarının (`DROP TRIGGER IF EXISTS on_auth_user_created` satırı) hemen ÖNÜNE ekle:

```sql
DROP TRIGGER IF EXISTS on_chapter_published ON chapters;
CREATE TRIGGER on_chapter_published
  AFTER UPDATE ON chapters
  FOR EACH ROW EXECUTE PROCEDURE public.notify_chapter_followers();

DROP TRIGGER IF EXISTS on_new_follow ON follows;
CREATE TRIGGER on_new_follow
  AFTER INSERT ON follows
  FOR EACH ROW EXECUTE PROCEDURE public.notify_new_follower();
```

- [ ] **Step 5: RLS politikalarını ekle**

`ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;` satırının hemen ALTINA ekle:

```sql
ALTER TABLE chapter_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_lists     ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows           ENABLE ROW LEVEL SECURITY;
```

DROP POLICY bloklarının sonuna (satır ~317 civarı, `-- Profiles` öncesine) ekle:

```sql
DROP POLICY IF EXISTS "reactions_select_all"     ON chapter_reactions;
DROP POLICY IF EXISTS "reactions_insert_auth"    ON chapter_reactions;
DROP POLICY IF EXISTS "reactions_delete_own"     ON chapter_reactions;
DROP POLICY IF EXISTS "readinglist_select_own"   ON reading_lists;
DROP POLICY IF EXISTS "readinglist_insert_auth"  ON reading_lists;
DROP POLICY IF EXISTS "readinglist_update_own"   ON reading_lists;
DROP POLICY IF EXISTS "readinglist_delete_own"   ON reading_lists;
DROP POLICY IF EXISTS "follows_select_all"       ON follows;
DROP POLICY IF EXISTS "follows_insert_auth"      ON follows;
DROP POLICY IF EXISTS "follows_delete_own"       ON follows;
```

Dosyanın SONUNA ekle:

```sql
-- Chapter Reactions
CREATE POLICY "reactions_select_all"  ON chapter_reactions FOR SELECT USING (true);
CREATE POLICY "reactions_insert_auth" ON chapter_reactions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());
CREATE POLICY "reactions_delete_own"  ON chapter_reactions FOR DELETE USING (user_id = auth.uid());

-- Reading Lists
CREATE POLICY "readinglist_select_own"  ON reading_lists FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "readinglist_insert_auth" ON reading_lists FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "readinglist_update_own"  ON reading_lists FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "readinglist_delete_own"  ON reading_lists FOR DELETE USING (user_id = auth.uid());

-- Follows
CREATE POLICY "follows_select_all"  ON follows FOR SELECT USING (true);
CREATE POLICY "follows_insert_auth" ON follows FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND follower_id = auth.uid());
CREATE POLICY "follows_delete_own"  ON follows FOR DELETE USING (follower_id = auth.uid());
```

- [ ] **Step 6: chapters_select_member politikasını genişlet (published projeler herkese açık)**

Mevcut `DROP POLICY IF EXISTS "chapters_select_member"` satırını bul. Altındaki `CREATE POLICY "chapters_select_member"` satırını şu şekilde değiştir:

```sql
CREATE POLICY "chapters_select_member" ON chapters FOR SELECT USING (
  is_project_owner(project_id)
  OR is_project_member(project_id)
  OR (status = 'final' AND EXISTS (
    SELECT 1 FROM projects WHERE id = project_id AND visibility = 'published'
  ))
);
```

- [ ] **Step 7: Supabase Dashboard'da çalıştır**

Supabase Dashboard > SQL Editor > schema.sql içeriğini yapıştır > Run.
Hata yoksa tüm tablolar, trigger'lar ve politikalar hazır.

- [ ] **Step 8: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat(db): add reactions, reading_lists, follows tables and triggers"
```

---

## Task 2: TypeScript Tipleri

**Files:**
- Modify: `types/index.ts`

- [ ] **Step 1: Yeni tipleri ekle**

`types/index.ts` dosyasının sonuna ekle:

```typescript
export type ReactionType = 'fire' | 'drop' | 'bolt'
export type ReadingListStatus = 'want' | 'reading' | 'done'

export interface ChapterReaction {
  id: string
  chapter_id: string
  user_id: string
  reaction: ReactionType
  created_at: string
}

export interface ReadingList {
  id: string
  user_id: string
  project_id: string
  status: ReadingListStatus
  updated_at: string
}

export interface Follow {
  follower_id: string
  following_id: string
  created_at: string
}

// notification_type genişletmesi (mevcut tipi override)
export type NotificationType =
  | 'application' | 'acceptance' | 'rejection'
  | 'comment' | 'mention' | 'invite' | 'suggestion'
  | 'new_chapter' | 'new_follower'
```

- [ ] **Step 2: Build check**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Beklenen: hata yok (ya da sadece mevcut hatalar — yeni tip hataları olmamalı).

- [ ] **Step 3: Commit**

```bash
git add types/index.ts
git commit -m "feat(types): add reaction, reading list, follow types"
```

---

## Task 3: API Route — Reactions

**Files:**
- Create: `app/api/reactions/route.ts`

- [ ] **Step 1: Route dosyasını oluştur**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/reactions?chapter_id=xxx
// Döner: { counts: { fire: N, drop: N, bolt: N }, userReactions: string[] }
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const chapterId = searchParams.get('chapter_id')
  if (!chapterId) return NextResponse.json({ error: 'chapter_id gerekli' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: reactions } = await supabase
    .from('chapter_reactions')
    .select('reaction, user_id')
    .eq('chapter_id', chapterId)

  const counts = { fire: 0, drop: 0, bolt: 0 }
  const userReactions: string[] = []

  for (const r of reactions ?? []) {
    if (r.reaction in counts) counts[r.reaction as keyof typeof counts]++
    if (user && r.user_id === user.id) userReactions.push(r.reaction)
  }

  return NextResponse.json({ counts, userReactions })
}

// POST /api/reactions
// Body: { chapter_id: string, reaction: 'fire'|'drop'|'bolt' }
// Tepki varsa siler (toggle), yoksa ekler
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { chapter_id, reaction } = await req.json()
  if (!chapter_id || !['fire', 'drop', 'bolt'].includes(reaction)) {
    return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('chapter_reactions')
    .select('id')
    .eq('chapter_id', chapter_id)
    .eq('user_id', user.id)
    .eq('reaction', reaction)
    .single()

  if (existing) {
    await supabase.from('chapter_reactions').delete().eq('id', existing.id)
    return NextResponse.json({ active: false })
  } else {
    await supabase.from('chapter_reactions').insert({ chapter_id, user_id: user.id, reaction })
    return NextResponse.json({ active: true })
  }
}
```

- [ ] **Step 2: Manuel test**

`npm run dev` çalışırken:
```bash
curl -X POST http://localhost:3000/api/reactions \
  -H "Content-Type: application/json" \
  -d '{"chapter_id":"test","reaction":"fire"}'
```
Beklenen: `{"error":"Giriş yapman gerekiyor."}` (401) — giriş yoksa doğru.

- [ ] **Step 3: Commit**

```bash
git add app/api/reactions/route.ts
git commit -m "feat(api): add reactions toggle endpoint"
```

---

## Task 4: API Route — Reading List

**Files:**
- Create: `app/api/reading-list/route.ts`

- [ ] **Step 1: Route dosyasını oluştur**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VALID_STATUSES = ['want', 'reading', 'done']

// POST /api/reading-list
// Body: { project_id: string, status: 'want'|'reading'|'done' }
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { project_id, status } = await req.json()
  if (!project_id || !VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 })
  }

  const { error } = await supabase.from('reading_lists').upsert(
    { user_id: user.id, project_id, status, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,project_id' }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, status })
}

// DELETE /api/reading-list?project_id=xxx
export async function DELETE(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const project_id = searchParams.get('project_id')
  if (!project_id) return NextResponse.json({ error: 'project_id gerekli' }, { status: 400 })

  await supabase.from('reading_lists').delete().eq('user_id', user.id).eq('project_id', project_id)
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/reading-list/route.ts
git commit -m "feat(api): add reading list upsert/delete endpoint"
```

---

## Task 5: API Route — Follows

**Files:**
- Create: `app/api/follows/route.ts`

- [ ] **Step 1: Route dosyasını oluştur**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/follows
// Body: { following_id: string }
// Takip varsa kaldırır, yoksa ekler (toggle)
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { following_id } = await req.json()
  if (!following_id || following_id === user.id) {
    return NextResponse.json({ error: 'Geçersiz istek.' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', user.id)
    .eq('following_id', following_id)
    .single()

  if (existing) {
    await supabase.from('follows').delete()
      .eq('follower_id', user.id).eq('following_id', following_id)
    return NextResponse.json({ following: false })
  } else {
    await supabase.from('follows').insert({ follower_id: user.id, following_id })
    return NextResponse.json({ following: true })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/follows/route.ts
git commit -m "feat(api): add follow toggle endpoint"
```

---

## Task 6: ViewTracker Component

**Files:**
- Create: `components/reader/ViewTracker.tsx`

- [ ] **Step 1: Component oluştur**

```typescript
'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  chapterId: string
}

export function ViewTracker({ chapterId }: Props) {
  const tracked = useRef(false)

  useEffect(() => {
    if (tracked.current) return
    tracked.current = true
    const supabase = createClient()
    supabase.rpc('increment_chapter_view', { p_chapter_id: chapterId }).then(() => {})
  }, [chapterId])

  return null
}
```

- [ ] **Step 2: Commit**

```bash
git add components/reader/ViewTracker.tsx
git commit -m "feat(reader): add silent view tracker component"
```

---

## Task 7: ReactionBar Component

**Files:**
- Create: `components/reader/ReactionBar.tsx`

- [ ] **Step 1: Component oluştur**

```typescript
'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

const REACTIONS = [
  { key: 'fire', emoji: '🔥', label: 'Güçlü sahne' },
  { key: 'drop', emoji: '💧', label: 'Dokunan an' },
  { key: 'bolt', emoji: '⚡', label: 'Beklenmedi' },
] as const

interface Props {
  chapterId: string
  initialCounts: { fire: number; drop: number; bolt: number }
  initialUserReactions: string[]
}

export function ReactionBar({ chapterId, initialCounts, initialUserReactions }: Props) {
  const [counts, setCounts] = useState(initialCounts)
  const [userReactions, setUserReactions] = useState<string[]>(initialUserReactions)
  const [loading, setLoading] = useState<string | null>(null)

  async function toggle(reaction: string) {
    if (loading) return
    setLoading(reaction)
    try {
      const res = await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapter_id: chapterId, reaction }),
      })
      if (!res.ok) return
      const { active } = await res.json()
      setCounts(prev => ({
        ...prev,
        [reaction]: prev[reaction as keyof typeof prev] + (active ? 1 : -1),
      }))
      setUserReactions(prev =>
        active ? [...prev, reaction] : prev.filter(r => r !== reaction)
      )
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex items-center gap-3 py-6 border-t border-white/[0.06] mt-12">
      <span className="text-xs text-muted-foreground mr-1">Bu bölüm nasıldı?</span>
      {REACTIONS.map(({ key, emoji, label }) => {
        const active = userReactions.includes(key)
        return (
          <button
            key={key}
            onClick={() => toggle(key)}
            title={label}
            disabled={loading === key}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all duration-200',
              active
                ? 'border-primary/40 bg-primary/10 text-white scale-105'
                : 'border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:border-white/20 hover:text-white'
            )}
          >
            <span>{emoji}</span>
            <span className="text-xs font-medium">{counts[key as keyof typeof counts]}</span>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/reader/ReactionBar.tsx
git commit -m "feat(reader): add 3-reaction ReactionBar component"
```

---

## Task 8: ReadingListButton Component

**Files:**
- Create: `components/reader/ReadingListButton.tsx`

- [ ] **Step 1: Component oluştur**

```typescript
'use client'

import { useState } from 'react'
import { BookMarked, BookOpen, CheckCheck, Bookmark } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { ReadingListStatus } from '@/types'

const STATUS_META: Record<ReadingListStatus, { label: string; icon: React.ElementType; color: string }> = {
  want:    { label: 'Sonra Oku',  icon: Bookmark,    color: 'text-amber-400' },
  reading: { label: 'Okuyorum',  icon: BookOpen,    color: 'text-blue-400' },
  done:    { label: 'Bitirdim',  icon: CheckCheck,  color: 'text-emerald-400' },
}

interface Props {
  projectId: string
  initialStatus: ReadingListStatus | null
}

export function ReadingListButton({ projectId, initialStatus }: Props) {
  const [status, setStatus] = useState<ReadingListStatus | null>(initialStatus)
  const [loading, setLoading] = useState(false)

  async function setListStatus(newStatus: ReadingListStatus | null) {
    if (loading) return
    setLoading(true)
    try {
      if (newStatus === null) {
        await fetch(`/api/reading-list?project_id=${projectId}`, { method: 'DELETE' })
        setStatus(null)
      } else {
        const res = await fetch('/api/reading-list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_id: projectId, status: newStatus }),
        })
        if (res.ok) setStatus(newStatus)
      }
    } finally {
      setLoading(false)
    }
  }

  const current = status ? STATUS_META[status] : null
  const CurrentIcon = current?.icon ?? BookMarked

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={loading}
          className={cn(
            'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] gap-2',
            current ? current.color : 'text-muted-foreground'
          )}
        >
          <CurrentIcon className="w-4 h-4" />
          {current ? current.label : 'Listeye Ekle'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {(Object.entries(STATUS_META) as [ReadingListStatus, typeof STATUS_META[ReadingListStatus]][]).map(([key, meta]) => {
          const Icon = meta.icon
          return (
            <DropdownMenuItem
              key={key}
              onClick={() => setListStatus(key)}
              className={cn('gap-2', status === key && 'text-primary')}
            >
              <Icon className={cn('w-4 h-4', meta.color)} />
              {meta.label}
            </DropdownMenuItem>
          )
        })}
        {status && (
          <DropdownMenuItem onClick={() => setListStatus(null)} className="gap-2 text-muted-foreground">
            <BookMarked className="w-4 h-4" />
            Listeden Çıkar
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/reader/ReadingListButton.tsx
git commit -m "feat(reader): add ReadingListButton dropdown component"
```

---

## Task 9: FollowButton Component

**Files:**
- Create: `components/reader/FollowButton.tsx`

- [ ] **Step 1: Component oluştur**

```typescript
'use client'

import { useState } from 'react'
import { UserPlus, UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  authorId: string
  initialFollowing: boolean
  followerCount: number
}

export function FollowButton({ authorId, initialFollowing, followerCount }: Props) {
  const [following, setFollowing] = useState(initialFollowing)
  const [count, setCount] = useState(followerCount)
  const [loading, setLoading] = useState(false)

  async function toggle() {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ following_id: authorId }),
      })
      if (!res.ok) return
      const { following: newState } = await res.json()
      setFollowing(newState)
      setCount(prev => prev + (newState ? 1 : -1))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant={following ? 'outline' : 'default'}
      size="sm"
      onClick={toggle}
      disabled={loading}
      className={cn(
        'gap-2',
        following
          ? 'border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:text-white'
          : 'bg-primary hover:bg-primary/90 text-white'
      )}
    >
      {following ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
      {following ? 'Takip Ediliyor' : 'Takip Et'}
      {count > 0 && <span className="text-xs opacity-60 ml-0.5">{count}</span>}
    </Button>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/reader/FollowButton.tsx
git commit -m "feat(reader): add FollowButton toggle component"
```

---

## Task 10: Bölüm Okuma Sayfasını Güncelle

**Files:**
- Modify: `app/(public)/projects/[slug]/read/[chapterId]/page.tsx`

- [ ] **Step 1: Server-side veri çekmeyi güncelle**

Dosyanın başına import'ları ekle:

```typescript
import { ViewTracker } from '@/components/reader/ViewTracker'
import { ReactionBar } from '@/components/reader/ReactionBar'
```

`ChapterReadPage` fonksiyonunda, `allChapters` çekiminin yanına reaction verilerini de çek. Mevcut `const [{ data: chapter }, ...]` satırını şu şekilde değiştir:

```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()

const [
  { data: chapter },
  { data: latestVersion },
  { data: allChapters },
  { data: reactions },
] = await Promise.all([
  supabase.from('chapters').select('*').eq('id', chapterId).single(),
  supabase.from('chapter_versions').select('content').eq('chapter_id', chapterId).order('created_at', { ascending: false }).limit(1).single(),
  supabase.from('chapters').select('id, title, order_index').eq('project_id', project.id).eq('status', 'final').order('order_index'),
  supabase.from('chapter_reactions').select('reaction, user_id').eq('chapter_id', chapterId),
])

const reactionCounts = { fire: 0, drop: 0, bolt: 0 }
const userReactions: string[] = []
for (const r of reactions ?? []) {
  if (r.reaction in reactionCounts) reactionCounts[r.reaction as keyof typeof reactionCounts]++
  if (user && r.user_id === user.id) userReactions.push(r.reaction)
}
```

- [ ] **Step 2: JSX'i güncelle**

`return` içindeki `<div className="max-w-2xl mx-auto px-4 py-12">` bloğuna ViewTracker ve ReactionBar ekle:

```tsx
return (
  <div className="max-w-2xl mx-auto px-4 py-12">
    <ViewTracker chapterId={chapterId} />

    {/* Breadcrumb — mevcut kod aynı kalır */}
    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-10">
      <Link href={`/projects/${slug}/read`} className="hover:text-foreground transition-colors flex items-center gap-1.5">
        <BookOpen className="w-4 h-4" /> {project.title}
      </Link>
      <span>/</span>
      <span className="text-foreground">{chapter.title}</span>
    </div>

    <h1 className="text-3xl font-display font-bold mb-10">{chapter.title}</h1>

    {/* Content — mevcut kod aynı kalır */}
    {latestVersion?.content ? (
      <div
        className="prose font-serif text-lg leading-relaxed"
        dangerouslySetInnerHTML={{ __html: latestVersion.content }}
      />
    ) : (
      <p className="text-muted-foreground italic">Bu bölümün içeriği henüz mevcut değil.</p>
    )}

    {/* Reactions */}
    <ReactionBar
      chapterId={chapterId}
      initialCounts={reactionCounts}
      initialUserReactions={userReactions}
    />

    {/* Chapter navigation — mevcut kod aynı kalır */}
    <div className="flex items-center justify-between mt-8 pt-8 border-t border-border gap-4">
      {prevChapter ? (
        <Link href={`/projects/${slug}/read/${prevChapter.id}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <div>
            <p className="text-[10px] uppercase tracking-wider">Önceki Bölüm</p>
            <p className="font-medium text-foreground">{prevChapter.title}</p>
          </div>
        </Link>
      ) : <div />}
      {nextChapter ? (
        <Link href={`/projects/${slug}/read/${nextChapter.id}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group text-right">
          <div>
            <p className="text-[10px] uppercase tracking-wider">Sonraki Bölüm</p>
            <p className="font-medium text-foreground">{nextChapter.title}</p>
          </div>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      ) : (
        <Link href={`/projects/${slug}/read`} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          İçindekilere dön →
        </Link>
      )}
    </div>
  </div>
)
```

- [ ] **Step 3: Build check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Beklenen: hata yok.

- [ ] **Step 4: Commit**

```bash
git add app/(public)/projects/[slug]/read/[chapterId]/page.tsx
git commit -m "feat(reader): integrate ViewTracker and ReactionBar into chapter read page"
```

---

## Task 11: Proje Okuma Listesi Sayfasını Güncelle

**Files:**
- Modify: `app/(public)/projects/[slug]/read/page.tsx`

- [ ] **Step 1: Import'ları ve veri çekmeyi güncelle**

Dosyanın başına ekle:

```typescript
import { ReadingListButton } from '@/components/reader/ReadingListButton'
import { FollowButton } from '@/components/reader/FollowButton'
```

`ReadPage` fonksiyonunda `project` ve `chapters` çekiminden sonra ekle:

```typescript
const { data: { user } } = await supabase.auth.getUser()

// Okuma listesi durumu ve takip bilgisi (sadece giriş yapanlara)
let readingListStatus: 'want' | 'reading' | 'done' | null = null
let isFollowing = false
let followerCount = 0

const ownerId = (project.owner as any)?.id as string | undefined

if (user && ownerId) {
  const [{ data: rl }, { count: fc }, { data: fol }] = await Promise.all([
    supabase.from('reading_lists').select('status').eq('user_id', user.id).eq('project_id', project.id).single(),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', ownerId),
    supabase.from('follows').select('follower_id').eq('follower_id', user.id).eq('following_id', ownerId).single(),
  ])
  readingListStatus = (rl?.status as typeof readingListStatus) ?? null
  followerCount = fc ?? 0
  isFollowing = !!fol
} else if (ownerId) {
  const { count: fc } = await supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', ownerId)
  followerCount = fc ?? 0
}
```

**Not:** `project` select sorgusunu güncelle — owner id'yi de çekecek şekilde:

```typescript
const { data: project } = await supabase
  .from('projects')
  .select('id, title, slug, synopsis, visibility, owner:profiles!projects_owner_id_fkey(id, display_name, username)')
  .eq('slug', slug)
  .single()
```

- [ ] **Step 2: JSX'e butonları ekle**

`<h1>` ve yazar bilgisi bloğundan sonra, `project.synopsis` bloğundan önce ekle:

```tsx
{/* Aksiyonlar */}
{user && (
  <div className="flex items-center gap-2 flex-wrap mb-6">
    <ReadingListButton
      projectId={project.id}
      initialStatus={readingListStatus}
    />
    {ownerId && user.id !== ownerId && (
      <FollowButton
        authorId={ownerId}
        initialFollowing={isFollowing}
        followerCount={followerCount}
      />
    )}
  </div>
)}
```

- [ ] **Step 3: Build check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Beklenen: hata yok.

- [ ] **Step 4: Commit**

```bash
git add app/(public)/projects/[slug]/read/page.tsx
git commit -m "feat(reader): add ReadingListButton and FollowButton to project read page"
```

---

## Task 12: Bildirimler Sayfasını Güncelle

**Files:**
- Modify: `app/(app)/notifications/page.tsx`

- [ ] **Step 1: Yeni tip meta'larını ekle**

`TYPE_META` objesine şunları ekle (mevcut objeye ek olarak):

```typescript
new_chapter:  { label: 'Yeni bölüm yayınlandı',    icon: BookOpen, color: 'text-violet-400 bg-violet-500/15' },
new_follower: { label: 'Seni takip etmeye başladı', icon: UserPlus, color: 'text-emerald-400 bg-emerald-500/15' },
```

`BookOpen` ve `UserPlus`'ı import listesine ekle:

```typescript
import { Bell, CheckCircle, UserPlus, FileText, ThumbsUp, ThumbsDown, MessageSquare, AtSign, BookOpen } from 'lucide-react'
```

- [ ] **Step 2: `getNotifDetail` fonksiyonuna yeni case'leri ekle**

`switch` bloğuna `default` öncesine ekle:

```typescript
case 'new_chapter':
  return {
    title: `"${p.project_title ?? 'Bir proje'}" için yeni bölüm: "${p.chapter_title ?? ''}"`,
    link: p.project_slug && p.chapter_id
      ? `/projects/${p.project_slug}/read/${p.chapter_id}`
      : undefined,
  }
case 'new_follower':
  return {
    title: `${p.follower_display_name ?? p.follower_username ?? 'Biri'} seni takip etmeye başladı`,
    link: p.follower_username ? `/u/${p.follower_username}` : undefined,
  }
```

- [ ] **Step 3: Build check ve commit**

```bash
npx tsc --noEmit 2>&1 | head -20
```

```bash
git add app/(app)/notifications/page.tsx
git commit -m "feat(notifications): add new_chapter and new_follower notification types"
```

---

## Task 13: Son Build + Push

- [ ] **Step 1: Tam build**

```bash
npm run build 2>&1 | tail -30
```

Beklenen: `✓ Compiled successfully`, hiç kırmızı hata yok.

- [ ] **Step 2: CLAUDE.md güncelle**

`CLAUDE.md` dosyasının `## Henüz Uygulanmamış / Bekleyen` bölümüne şunu ekle:

```
- **Faz 1 tamamlandı** — alkış sistemi, okuma listesi, takip et, view counter, yeni bölüm bildirimi
- **Faz 1 DB tabloları Supabase'e uygulanmalı** — chapter_reactions, reading_lists, follows, schema.sql çalıştır
```

- [ ] **Step 3: Final commit ve push**

```bash
git add -A
git commit -m "feat(phase1): reader engagement — reactions, reading list, follow, view counter, notifications"
git push origin main
```

---

## Self-Review

**Spec coverage:**
- ✅ Bölüm okuma sayacı — ViewTracker (Task 6) + increment_chapter_view fn (Task 1)
- ✅ 3 tepki alkış sistemi (🔥💧⚡) — ReactionBar (Task 7) + /api/reactions (Task 3)
- ✅ Okuma listesi (want/reading/done) — ReadingListButton (Task 8) + /api/reading-list (Task 4)
- ✅ Yazara abone ol — FollowButton (Task 9) + /api/follows (Task 5)
- ✅ Takipçilere yeni bölüm bildirimi — DB trigger (Task 1) + notifications page (Task 12)

**Placeholder scan:** Yok — tüm adımlar tam kod içeriyor.

**Type consistency:**
- `ReactionType = 'fire' | 'drop' | 'bolt'` — Task 2'de tanımlandı, ReactionBar ve API'da kullanıldı ✅
- `ReadingListStatus = 'want' | 'reading' | 'done'` — Task 2'de tanımlandı, ReadingListButton'da kullanıldı ✅
- `initialCounts`, `initialUserReactions` — Task 10'daki server hesabı Task 7'deki prop isimleriyle eşleşiyor ✅
