# Yazı Sprintleri Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Topluluk + bireysel yazı sprintleri — zamanlı yazma oturumları, canlı katılımcı sayacı, sprint sonu sıralama, streak ve rozet entegrasyonu.

**Architecture:** İki yeni Supabase tablosu (`writing_sprints`, `sprint_participants`). Supabase Realtime ile canlı katılımcı sayacı. Vercel Cron ile her gün 3 topluluk sprinti otomatik oluşturulur. Sprint odası client component; timer `setInterval` tabanlı, bitince finish API çağırır.

**Tech Stack:** Next.js 16 App Router · Supabase PostgreSQL + Realtime · TypeScript · Tailwind v4 · shadcn/ui · Vercel Cron

---

## Dosya Haritası

**Yeni dosyalar:**
```
supabase/schema.sql                              (modify)
types/index.ts                                   (modify)
lib/badges.ts                                    (modify)
components/shared/Navbar.tsx                     (modify)
app/api/sprint/route.ts                          (create)
app/api/sprint/[sprintId]/join/route.ts          (create)
app/api/sprint/[sprintId]/finish/route.ts        (create)
app/api/sprint/community/route.ts                (create)
app/api/sprint/cron/route.ts                     (create)
components/sprint/SprintCard.tsx                 (create)
components/sprint/SprintLeaderboard.tsx          (create)
components/sprint/SprintRoom.tsx                 (create)
app/(app)/sprint/page.tsx                        (create)
app/(app)/sprint/[sprintId]/page.tsx             (create)
vercel.json                                      (create)
```

---

### Task 1: Schema — writing_sprints + sprint_participants tabloları

**Files:**
- Modify: `supabase/schema.sql` (en sona ekle)

- [ ] **Step 1: schema.sql dosyasının sonuna ekle**

`supabase/schema.sql` dosyasını aç, en sona şu bloğu ekle:

```sql
-- ============================================================
-- FAZ 5: YAZI SPRİNTLERİ
-- ============================================================

CREATE TABLE IF NOT EXISTS writing_sprints (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title            text NOT NULL DEFAULT 'Yazı Sprinti',
  duration_minutes int  NOT NULL CHECK (duration_minutes IN (15, 25, 45)),
  starts_at        timestamptz NOT NULL,
  ends_at          timestamptz NOT NULL,
  status           text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','active','finished')),
  created_by       uuid REFERENCES profiles(id) ON DELETE SET NULL,
  is_community     boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sprints_starts_at ON writing_sprints(starts_at);
CREATE INDEX IF NOT EXISTS idx_sprints_status    ON writing_sprints(status);

CREATE TABLE IF NOT EXISTS sprint_participants (
  sprint_id      uuid NOT NULL REFERENCES writing_sprints(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  word_count     int  NOT NULL DEFAULT 0,
  start_word_ref int  NOT NULL DEFAULT 0,
  joined_at      timestamptz NOT NULL DEFAULT now(),
  finished_at    timestamptz,
  PRIMARY KEY (sprint_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_sprint_participants_user ON sprint_participants(user_id);

-- RLS: writing_sprints
ALTER TABLE writing_sprints ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sprints_select_all"    ON writing_sprints;
DROP POLICY IF EXISTS "sprints_insert_auth"   ON writing_sprints;
DROP POLICY IF EXISTS "sprints_update_auth"   ON writing_sprints;
CREATE POLICY "sprints_select_all"  ON writing_sprints FOR SELECT USING (true);
CREATE POLICY "sprints_insert_auth" ON writing_sprints FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "sprints_update_auth" ON writing_sprints FOR UPDATE USING (auth.uid() IS NOT NULL);

-- RLS: sprint_participants
ALTER TABLE sprint_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sp_select_all"   ON sprint_participants;
DROP POLICY IF EXISTS "sp_insert_self"  ON sprint_participants;
DROP POLICY IF EXISTS "sp_update_self"  ON sprint_participants;
CREATE POLICY "sp_select_all"  ON sprint_participants FOR SELECT USING (true);
CREATE POLICY "sp_insert_self" ON sprint_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sp_update_self" ON sprint_participants FOR UPDATE USING (auth.uid() = user_id);
```

- [ ] **Step 2: Supabase SQL Editor'da çalıştır**

Supabase Dashboard > SQL Editor → schema.sql içeriğini yapıştır → Run.
`writing_sprints` ve `sprint_participants` tablolarının oluştuğunu Tables bölümünden doğrula.

- [ ] **Step 3: Commit**

```bash
git add supabase/schema.sql
git commit -m "feat: add writing_sprints and sprint_participants tables with RLS"
```

---

### Task 2: Types + Badges

**Files:**
- Modify: `types/index.ts`
- Modify: `lib/badges.ts`

- [ ] **Step 1: types/index.ts'e tip ve BadgeCode ekle**

`types/index.ts` dosyasında `BadgeCode` union tipini bul ve `'first_sprint' | 'sprint_warrior'` ekle:

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
  | 'first_submission'
  | 'consistent_writer'
  | 'star_student'
  | 'peer_reader'
  | 'first_sprint'
  | 'sprint_warrior'
```

Aynı dosyanın en sonuna yeni interface'leri ekle:

```typescript
export type SprintStatus = 'scheduled' | 'active' | 'finished'

export interface WritingSprint {
  id: string
  title: string
  duration_minutes: number
  starts_at: string
  ends_at: string
  status: SprintStatus
  created_by: string | null
  is_community: boolean
  created_at: string
  participant_count?: number
}

export interface SprintParticipant {
  sprint_id: string
  user_id: string
  word_count: number
  start_word_ref: number
  joined_at: string
  finished_at: string | null
  profile?: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url'>
}
```

- [ ] **Step 2: lib/badges.ts'e 2 yeni rozet ekle**

`BADGE_META` objesine ekle:

```typescript
first_sprint:    { label: 'İlk Sprint',        icon: '⚡', desc: 'İlk yazı sprintini tamamladın' },
sprint_warrior:  { label: 'Sprint Savaşçısı',  icon: '🏃', desc: '10 sprint tamamladın' },
```

`checkAllBadges` fonksiyonunun sonuna (return satırından önce) ekle:

```typescript
// first_sprint: at least 1 finished sprint
await maybeAward('first_sprint', async () => {
  const { count } = await supabase
    .from('sprint_participants')
    .select('sprint_id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .not('finished_at', 'is', null)
  return (count ?? 0) >= 1
})

// sprint_warrior: 10+ finished sprints
await maybeAward('sprint_warrior', async () => {
  const { count } = await supabase
    .from('sprint_participants')
    .select('sprint_id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .not('finished_at', 'is', null)
  return (count ?? 0) >= 10
})
```

- [ ] **Step 3: TypeScript kontrol**

```bash
npx tsc --noEmit
```

Beklenen: hata yok.

- [ ] **Step 4: Commit**

```bash
git add types/index.ts lib/badges.ts
git commit -m "feat: add WritingSprint types and first_sprint/sprint_warrior badges"
```

---

### Task 3: API — GET + POST /api/sprint

**Files:**
- Create: `app/api/sprint/route.ts`

- [ ] **Step 1: Dosyayı oluştur**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/sprint — aktif + yaklaşan + son 5 topluluk sprinti
export async function GET() {
  const supabase = await createClient()

  const now = new Date().toISOString()

  const { data: sprints, error } = await supabase
    .from('writing_sprints')
    .select('*, participant_count:sprint_participants(count)')
    .gte('starts_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('starts_at', { ascending: true })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const active    = (sprints ?? []).filter(s => s.status === 'active')
  const upcoming  = (sprints ?? []).filter(s => s.status === 'scheduled' && s.starts_at > now)
  const finished  = (sprints ?? []).filter(s => s.status === 'finished').slice(-5).reverse()

  return NextResponse.json({ active, upcoming, finished })
}

// POST /api/sprint — bireysel sprint oluştur
export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { duration_minutes } = await req.json()
  if (![15, 25, 45].includes(duration_minutes)) {
    return NextResponse.json({ error: 'Geçersiz süre. 15, 25 veya 45 dk olmalı.' }, { status: 400 })
  }

  const starts_at = new Date()
  const ends_at   = new Date(starts_at.getTime() + duration_minutes * 60 * 1000)

  const { data: sprint, error } = await supabase
    .from('writing_sprints')
    .insert({
      title: `${duration_minutes} Dk Sprint`,
      duration_minutes,
      starts_at: starts_at.toISOString(),
      ends_at: ends_at.toISOString(),
      status: 'active',
      created_by: user.id,
      is_community: false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sprint }, { status: 201 })
}
```

- [ ] **Step 2: TypeScript kontrol**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add app/api/sprint/route.ts
git commit -m "feat: add GET/POST /api/sprint for listing and creating sprints"
```

---

### Task 4: API — join + finish

**Files:**
- Create: `app/api/sprint/[sprintId]/join/route.ts`
- Create: `app/api/sprint/[sprintId]/finish/route.ts`

- [ ] **Step 1: join route oluştur**

`app/api/sprint/[sprintId]/join/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params { params: Promise<{ sprintId: string }> }

export async function POST(_req: Request, { params }: Params) {
  const { sprintId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  // Sprint var mı ve katılılabilir mi?
  const { data: sprint } = await supabase
    .from('writing_sprints')
    .select('id, status, starts_at')
    .eq('id', sprintId)
    .single()

  if (!sprint) return NextResponse.json({ error: 'Sprint bulunamadı.' }, { status: 404 })
  if (sprint.status === 'finished') return NextResponse.json({ error: 'Sprint sona erdi.' }, { status: 400 })

  // Kullanıcının en son kelime sayısını referans al
  const { data: latestVersion } = await supabase
    .from('chapter_versions')
    .select('word_count')
    .eq('author_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const start_word_ref = latestVersion?.word_count ?? 0

  const { error } = await supabase
    .from('sprint_participants')
    .upsert(
      { sprint_id: sprintId, user_id: user.id, start_word_ref, word_count: 0 },
      { onConflict: 'sprint_id,user_id', ignoreDuplicates: true }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, start_word_ref })
}
```

- [ ] **Step 2: finish route oluştur**

`app/api/sprint/[sprintId]/finish/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAllBadges } from '@/lib/badges'

interface Params { params: Promise<{ sprintId: string }> }

export async function POST(req: Request, { params }: Params) {
  const { sprintId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Giriş yapman gerekiyor.' }, { status: 401 })

  const { word_count } = await req.json()
  const wc = Math.max(0, Number(word_count) || 0)

  const { error } = await supabase
    .from('sprint_participants')
    .update({ word_count: wc, finished_at: new Date().toISOString() })
    .eq('sprint_id', sprintId)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Streak güncelle
  if (wc > 0) {
    const today = new Date().toISOString().slice(0, 10)
    await supabase
      .from('user_writing_goals')
      .upsert(
        { user_id: user.id, streak_last_date: today },
        { onConflict: 'user_id', ignoreDuplicates: false }
      )
  }

  // Rozet kontrol
  const newBadges = await checkAllBadges(supabase, user.id)

  return NextResponse.json({ ok: true, newBadges })
}
```

- [ ] **Step 3: TypeScript kontrol**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add app/api/sprint/[sprintId]/join/route.ts app/api/sprint/[sprintId]/finish/route.ts
git commit -m "feat: add sprint join and finish API routes with streak and badge integration"
```

---

### Task 5: API — community + cron + vercel.json

**Files:**
- Create: `app/api/sprint/community/route.ts`
- Create: `app/api/sprint/cron/route.ts`
- Create: `vercel.json`

- [ ] **Step 1: community route oluştur**

`app/api/sprint/community/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ADMIN_EMAIL = 'mmuratb77@gmail.com'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Yetkisiz.' }, { status: 403 })
  }

  const { title, duration_minutes, starts_at } = await req.json()
  if (![15, 25, 45].includes(duration_minutes)) {
    return NextResponse.json({ error: 'Geçersiz süre.' }, { status: 400 })
  }
  if (!starts_at) {
    return NextResponse.json({ error: 'Başlangıç zamanı gerekli.' }, { status: 400 })
  }

  const startsAtDate = new Date(starts_at)
  const ends_at = new Date(startsAtDate.getTime() + duration_minutes * 60 * 1000)

  const { data: sprint, error } = await supabase
    .from('writing_sprints')
    .insert({
      title: title || 'Topluluk Yazı Sprinti',
      duration_minutes,
      starts_at: startsAtDate.toISOString(),
      ends_at: ends_at.toISOString(),
      status: 'scheduled',
      created_by: user.id,
      is_community: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sprint }, { status: 201 })
}
```

- [ ] **Step 2: cron route oluştur**

`app/api/sprint/cron/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Vercel Cron: her gün 00:00 UTC çalışır
// Ertesi gün için TR saatleri: 10:00, 14:00, 21:00 (UTC: 07:00, 11:00, 18:00)
export async function POST(req: Request) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Yetkisiz.' }, { status: 401 })
  }

  const supabase = await createClient()

  // Ertesi günün sprintlerini oluştur
  const tomorrow = new Date()
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  const dateStr = tomorrow.toISOString().slice(0, 10)

  const hours = [7, 11, 18] // UTC (TR: 10, 14, 21)
  const labels = ['Sabah Sprinti ☀️', 'Öğle Sprinti 🌤️', 'Akşam Sprinti 🌙']
  const created: string[] = []

  for (let i = 0; i < hours.length; i++) {
    const starts_at = new Date(`${dateStr}T${String(hours[i]).padStart(2, '0')}:00:00Z`)
    const ends_at   = new Date(starts_at.getTime() + 25 * 60 * 1000)

    const { data } = await supabase
      .from('writing_sprints')
      .insert({
        title: labels[i],
        duration_minutes: 25,
        starts_at: starts_at.toISOString(),
        ends_at: ends_at.toISOString(),
        status: 'scheduled',
        is_community: true,
      })
      .select('id')
      .single()

    if (data) created.push(data.id)
  }

  return NextResponse.json({ created })
}
```

- [ ] **Step 3: vercel.json oluştur**

Proje kökünde `vercel.json` yoksa oluştur:

```json
{
  "crons": [
    {
      "path": "/api/sprint/cron",
      "schedule": "0 0 * * *"
    }
  ]
}
```

Vercel Dashboard > Project Settings > Environment Variables'a `CRON_SECRET` ekle (rastgele güçlü string).

- [ ] **Step 4: Sprint status otomatik güncelleme notu**

Sprint `status` alanı Vercel Cron veya bir başka mekanizma ile otomatik güncellenmez. Bunun yerine API'lar ve sayfalar `starts_at`/`ends_at` zamanlarını kontrol ederek gerçek durumu hesaplar. `status` sadece cron'un `scheduled` olarak set ettiği başlangıç değeridir — UI her zaman zamana göre gerçek durumu gösterir.

`app/api/sprint/route.ts` dosyasındaki GET handler'ını zamana göre durumu hesaplayacak şekilde güncelle:

```typescript
// GET handler'ını şu şekilde güncelle:
export async function GET() {
  const supabase = await createClient()
  const now = new Date()

  const { data: sprints, error } = await supabase
    .from('writing_sprints')
    .select('*, participant_count:sprint_participants(count)')
    .gte('ends_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('starts_at', { ascending: true })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const withStatus = (sprints ?? []).map(s => {
    const start = new Date(s.starts_at)
    const end   = new Date(s.ends_at)
    let status: string = s.status
    if (now >= start && now < end) status = 'active'
    else if (now >= end) status = 'finished'
    return { ...s, status, participant_count: (s.participant_count as any)?.[0]?.count ?? 0 }
  })

  const active   = withStatus.filter(s => s.status === 'active')
  const upcoming = withStatus.filter(s => s.status === 'scheduled')
  const finished = withStatus.filter(s => s.status === 'finished').slice(-5).reverse()

  return NextResponse.json({ active, upcoming, finished })
}
```

- [ ] **Step 5: TypeScript kontrol**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add app/api/sprint/community/route.ts app/api/sprint/cron/route.ts vercel.json app/api/sprint/route.ts
git commit -m "feat: add community sprint creation, Vercel cron, and time-based status"
```

---

### Task 6: Components — SprintCard + SprintLeaderboard

**Files:**
- Create: `components/sprint/SprintCard.tsx`
- Create: `components/sprint/SprintLeaderboard.tsx`

- [ ] **Step 1: SprintCard oluştur**

`components/sprint/SprintCard.tsx`:

```typescript
import Link from 'next/link'
import { Zap, Users, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { WritingSprint } from '@/types'

interface Props {
  sprint: WritingSprint
  isJoined?: boolean
}

export function SprintCard({ sprint, isJoined = false }: Props) {
  const now = new Date()
  const start = new Date(sprint.starts_at)
  const end   = new Date(sprint.ends_at)

  const isActive   = now >= start && now < end
  const isFinished = now >= end
  const minutesUntil = Math.max(0, Math.floor((start.getTime() - now.getTime()) / 60000))

  const timeLabel = isActive
    ? `Bitti: ${new Date(sprint.ends_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`
    : isFinished
    ? 'Sona Erdi'
    : minutesUntil <= 5
    ? `${minutesUntil} dk sonra başlıyor`
    : `${start.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`

  return (
    <Link
      href={`/sprint/${sprint.id}`}
      className={cn(
        'group relative glass-card rounded-2xl p-5 block border transition-all duration-300 overflow-hidden cursor-pointer hover:scale-[1.015]',
        isActive
          ? 'border-violet-500/40 shadow-[0_0_25px_rgba(124,58,237,0.15)] bg-gradient-to-br from-violet-500/5 to-transparent'
          : isFinished
          ? 'border-white/[0.04] opacity-70'
          : 'border-white/[0.05] hover:border-primary/25'
      )}
    >
      {isActive && (
        <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-violet-500" />
        </span>
      )}

      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className={cn(
            'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
            isActive ? 'bg-violet-500/20' : 'bg-white/[0.05]'
          )}>
            <Zap className={cn('w-4.5 h-4.5', isActive ? 'text-violet-400' : 'text-slate-400')} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-white text-sm line-clamp-1">{sprint.title}</p>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> {sprint.duration_minutes} dk · {timeLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <Users className="w-3.5 h-3.5" />
            {sprint.participant_count ?? 0} katılımcı
          </span>
          {isJoined && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Katıldın ✓
            </span>
          )}
          {isActive && !isJoined && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20 animate-pulse">
              Canlı
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: SprintLeaderboard oluştur**

`components/sprint/SprintLeaderboard.tsx`:

```typescript
import { Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SprintParticipant } from '@/types'

interface Props {
  participants: SprintParticipant[]
  currentUserId: string
}

export function SprintLeaderboard({ participants, currentUserId }: Props) {
  const sorted = [...participants]
    .filter(p => p.finished_at !== null)
    .sort((a, b) => b.word_count - a.word_count)

  if (sorted.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-6 border border-white/[0.05] text-center text-slate-400 text-sm">
        Henüz kimse sprint'i tamamlamadı.
      </div>
    )
  }

  const medals = ['🥇', '🥈', '🥉']

  return (
    <div className="glass-card rounded-2xl border border-white/[0.05] overflow-hidden">
      <div className="px-5 py-4 border-b border-white/[0.05] flex items-center gap-2">
        <Trophy className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-bold text-white">Sprint Sıralaması</span>
      </div>
      <div className="divide-y divide-white/[0.04]">
        {sorted.map((p, i) => {
          const isMe = p.user_id === currentUserId
          return (
            <div
              key={p.user_id}
              className={cn(
                'flex items-center gap-3 px-5 py-3 text-sm transition-colors',
                isMe ? 'bg-primary/5 border-l-2 border-primary' : 'hover:bg-white/[0.02]'
              )}
            >
              <span className="text-base w-6 shrink-0 text-center">
                {medals[i] ?? `${i + 1}.`}
              </span>
              <div className="flex-1 min-w-0">
                <p className={cn('font-medium truncate', isMe ? 'text-primary' : 'text-white')}>
                  {p.profile?.display_name ?? p.profile?.username ?? 'Yazar'}
                  {isMe && <span className="text-xs text-primary/70 ml-1">(sen)</span>}
                </p>
              </div>
              <span className="font-bold text-emerald-400 shrink-0">
                {p.word_count} <span className="text-xs font-normal text-slate-400">kelime</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: TypeScript kontrol**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add components/sprint/SprintCard.tsx components/sprint/SprintLeaderboard.tsx
git commit -m "feat: add SprintCard and SprintLeaderboard components"
```

---

### Task 7: Component — SprintRoom (client, realtime timer)

**Files:**
- Create: `components/sprint/SprintRoom.tsx`

- [ ] **Step 1: SprintRoom oluştur**

`components/sprint/SprintRoom.tsx`:

```typescript
'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, PenLine, CheckCircle2, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { SprintLeaderboard } from './SprintLeaderboard'
import { cn } from '@/lib/utils'
import type { WritingSprint, SprintParticipant } from '@/types'

interface Props {
  sprint: WritingSprint
  initialParticipants: SprintParticipant[]
  currentUserId: string
  isJoined: boolean
  userProjects: { id: string; title: string; defaultChapterId?: string }[]
}

export function SprintRoom({ sprint, initialParticipants, currentUserId, isJoined, userProjects }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const endTime = new Date(sprint.ends_at).getTime()
  const startTime = new Date(sprint.starts_at).getTime()
  const now = Date.now()
  const isActive   = now >= startTime && now < endTime
  const isFinished = now >= endTime

  const [timeLeft, setTimeLeft] = useState(Math.max(0, Math.ceil((endTime - Date.now()) / 1000)))
  const [participants, setParticipants] = useState<SprintParticipant[]>(initialParticipants)
  const [joined, setJoined] = useState(isJoined)
  const [joining, setJoining] = useState(false)
  const [finished, setFinished] = useState(isFinished)
  const [wordCount, setWordCount] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState(userProjects[0]?.id ?? '')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Countdown timer
  useEffect(() => {
    if (finished) return
    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000))
      setTimeLeft(remaining)
      if (remaining === 0) {
        setFinished(true)
        clearInterval(timerRef.current!)
      }
    }, 1000)
    return () => clearInterval(timerRef.current!)
  }, [endTime, finished])

  // Realtime participant count
  useEffect(() => {
    const channel = supabase
      .channel(`sprint:${sprint.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sprint_participants',
        filter: `sprint_id=eq.${sprint.id}`,
      }, () => {
        // Refresh participants
        supabase
          .from('sprint_participants')
          .select('*, profile:profiles(id, username, display_name, avatar_url)')
          .eq('sprint_id', sprint.id)
          .then(({ data }) => { if (data) setParticipants(data as SprintParticipant[]) })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [sprint.id])

  async function handleJoin() {
    setJoining(true)
    const res = await fetch(`/api/sprint/${sprint.id}/join`, { method: 'POST' })
    if (res.ok) setJoined(true)
    setJoining(false)
  }

  async function handleFinish() {
    setSubmitting(true)
    const res = await fetch(`/api/sprint/${sprint.id}/finish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word_count: wordCount }),
    })
    if (res.ok) {
      setDone(true)
      router.refresh()
    }
    setSubmitting(false)
  }

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0')
  const secs = String(timeLeft % 60).padStart(2, '0')

  if (done || (finished && !joined)) {
    return (
      <div className="space-y-6">
        <div className="glass-card rounded-2xl p-6 border border-white/[0.05] text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
          <p className="text-white font-bold text-lg">Sprint Bitti!</p>
          <p className="text-slate-400 text-sm">{wordCount > 0 ? `${wordCount} kelime yazdın 🔥` : 'Sprint sona erdi.'}</p>
        </div>
        <SprintLeaderboard participants={participants} currentUserId={currentUserId} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Timer */}
      <div className={cn(
        'glass-card rounded-2xl p-8 border text-center space-y-4',
        isActive ? 'border-violet-500/30 shadow-[0_0_30px_rgba(124,58,237,0.1)]' : 'border-white/[0.05]'
      )}>
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{sprint.title}</p>
        <div className="font-display text-7xl font-black text-white tracking-tight tabular-nums">
          {isActive ? `${mins}:${secs}` : isFinished ? '00:00' : new Date(sprint.starts_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
        </div>
        <p className="text-xs text-slate-400 flex items-center justify-center gap-2">
          <Users className="w-3.5 h-3.5" />
          {participants.length} katılımcı yazıyor
        </p>
      </div>

      {/* Henüz başlamadı */}
      {!isActive && !isFinished && (
        <div className="glass-card rounded-xl p-4 border border-white/[0.05] text-center text-sm text-slate-400">
          Sprint {new Date(sprint.starts_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}'de başlıyor.
          {!joined && (
            <button
              onClick={handleJoin}
              disabled={joining}
              className="mt-3 block mx-auto px-5 py-2 rounded-xl bg-primary/20 text-primary border border-primary/30 text-xs font-semibold hover:bg-primary/30 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {joining ? 'Katılınıyor…' : 'Şimdiden Katıl'}
            </button>
          )}
        </div>
      )}

      {/* Aktif sprint */}
      {isActive && (
        <div className="space-y-4">
          {!joined ? (
            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold shadow-[0_0_20px_rgba(124,58,237,0.3)] hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] transition-all disabled:opacity-50 cursor-pointer"
            >
              <Zap className="w-4.5 h-4.5" />
              {joining ? 'Katılınıyor…' : 'Sprinte Katıl!'}
            </button>
          ) : (
            <div className="glass-card rounded-xl p-4 border border-emerald-500/20 space-y-4">
              <p className="text-sm text-emerald-400 font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Katıldın! Şimdi yaz.
              </p>

              {userProjects.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Proje Seç</label>
                  <select
                    value={selectedProjectId}
                    onChange={e => setSelectedProjectId(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                  >
                    {userProjects.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
              )}

              <a
                href={userProjects.find(p => p.id === selectedProjectId)?.defaultChapterId
                  ? `/projects/${selectedProjectId}/write/${userProjects.find(p => p.id === selectedProjectId)?.defaultChapterId}`
                  : `/projects/${selectedProjectId}/write`}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-white/[0.07] border border-white/[0.1] text-white text-sm font-semibold hover:bg-white/[0.12] transition-colors cursor-pointer"
              >
                <PenLine className="w-4 h-4 text-primary" /> Editöre Git →
              </a>
            </div>
          )}
        </div>
      )}

      {/* Sprint bitti, kelime gir */}
      {finished && joined && !done && (
        <div className="glass-card rounded-2xl p-6 border border-amber-500/20 space-y-4">
          <p className="text-amber-400 font-bold text-sm">⏰ Sprint bitti! Kaç kelime yazdın?</p>
          <input
            type="number"
            min={0}
            value={wordCount}
            onChange={e => setWordCount(Number(e.target.value))}
            placeholder="Kelime sayısı"
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-primary/50"
          />
          <button
            onClick={handleFinish}
            disabled={submitting}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold disabled:opacity-50 cursor-pointer"
          >
            {submitting ? 'Kaydediliyor…' : 'Sonucu Kaydet'}
          </button>
        </div>
      )}

      {/* Sıralama (aktifken de göster) */}
      {participants.some(p => p.finished_at) && (
        <SprintLeaderboard participants={participants} currentUserId={currentUserId} />
      )}
    </div>
  )
}
```

- [ ] **Step 2: TypeScript kontrol**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add components/sprint/SprintRoom.tsx
git commit -m "feat: add SprintRoom client component with countdown timer and realtime participants"
```

---

### Task 8: Sayfalar — /sprint + /sprint/[sprintId]

**Files:**
- Create: `app/(app)/sprint/page.tsx`
- Create: `app/(app)/sprint/[sprintId]/page.tsx`

- [ ] **Step 1: Sprint listesi sayfası oluştur**

`app/(app)/sprint/page.tsx`:

```typescript
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Zap, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { SprintCard } from '@/components/sprint/SprintCard'
import type { WritingSprint } from '@/types'

export const metadata: Metadata = { title: 'Yazı Sprintleri — Kalem Birliği' }
export const dynamic = 'force-dynamic'

const DURATIONS = [15, 25, 45] as const

export default async function SprintPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date()
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [{ data: sprints }, { data: myParticipations }] = await Promise.all([
    supabase
      .from('writing_sprints')
      .select('*, participant_count:sprint_participants(count)')
      .gte('ends_at', since)
      .order('starts_at', { ascending: true })
      .limit(20),
    supabase
      .from('sprint_participants')
      .select('sprint_id')
      .eq('user_id', user.id),
  ])

  const joinedIds = new Set((myParticipations ?? []).map(p => p.sprint_id))

  const withStatus = (sprints ?? []).map(s => {
    const start = new Date(s.starts_at)
    const end   = new Date(s.ends_at)
    let status = s.status
    if (now >= start && now < end) status = 'active'
    else if (now >= end) status = 'finished'
    return {
      ...s,
      status,
      participant_count: (s.participant_count as any)?.[0]?.count ?? 0,
    } as WritingSprint
  })

  const active   = withStatus.filter(s => s.status === 'active')
  const upcoming = withStatus.filter(s => s.status === 'scheduled')
  const finished = withStatus.filter(s => s.status === 'finished').slice(-5).reverse()

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 space-y-10">

      <div className="space-y-2">
        <h1 className="text-3xl font-display font-black text-white flex items-center gap-2.5">
          <Zap className="w-8 h-8 text-violet-400" />
          Yazı Sprintleri
        </h1>
        <p className="text-sm text-slate-400">Zamanlı yazma oturumları. Topluluğuyla birlikte yaz.</p>
      </div>

      {/* Aktif sprint */}
      {active.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">🔴 Şu An Canlı</h2>
          {active.map(s => (
            <SprintCard key={s.id} sprint={s} isJoined={joinedIds.has(s.id)} />
          ))}
        </section>
      )}

      {/* Yaklaşan sprintler */}
      {upcoming.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Yaklaşan Sprintler</h2>
          {upcoming.map(s => (
            <SprintCard key={s.id} sprint={s} isJoined={joinedIds.has(s.id)} />
          ))}
        </section>
      )}

      {/* Bireysel sprint başlat */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Bireysel Sprint</h2>
        <div className="glass-card rounded-2xl p-5 border border-white/[0.05] space-y-4">
          <p className="text-sm text-slate-300">Kendi tempo sprint'ini başlat. Sıralamaya girmez, streak'e sayılır.</p>
          <div className="flex gap-3">
            {DURATIONS.map(d => (
              <form key={d} action={`/api/sprint`} method="post">
                <Link
                  href={`/sprint/new?duration=${d}`}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.08] text-sm font-semibold text-white hover:bg-white/[0.1] hover:border-primary/30 transition-all cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-violet-400" /> {d} dk
                </Link>
              </form>
            ))}
          </div>
        </div>
      </section>

      {/* Geçmiş sprintler */}
      {finished.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Geçmiş Sprintler</h2>
          {finished.map(s => (
            <SprintCard key={s.id} sprint={s} isJoined={joinedIds.has(s.id)} />
          ))}
        </section>
      )}

      {active.length === 0 && upcoming.length === 0 && finished.length === 0 && (
        <div className="text-center py-16 text-slate-500 text-sm">
          Henüz sprint yok. Yakında topluluk sprintleri başlayacak.
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Bireysel sprint başlatma için /sprint/new route ekle**

`app/(app)/sprint/new/page.tsx`:

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface Props { searchParams: Promise<{ duration?: string }> }

export default async function NewSprintPage({ searchParams }: Props) {
  const { duration } = await searchParams
  const d = Number(duration)
  if (![15, 25, 45].includes(d)) redirect('/sprint')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const starts_at = new Date()
  const ends_at   = new Date(starts_at.getTime() + d * 60 * 1000)

  const { data: sprint } = await supabase
    .from('writing_sprints')
    .insert({
      title: `${d} Dk Sprint`,
      duration_minutes: d,
      starts_at: starts_at.toISOString(),
      ends_at: ends_at.toISOString(),
      status: 'active',
      created_by: user.id,
      is_community: false,
    })
    .select('id')
    .single()

  if (!sprint) redirect('/sprint')
  redirect(`/sprint/${sprint.id}`)
}
```

- [ ] **Step 3: Sprint odası sayfası oluştur**

`app/(app)/sprint/[sprintId]/page.tsx`:

```typescript
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SprintRoom } from '@/components/sprint/SprintRoom'
import type { SprintParticipant } from '@/types'

export const metadata: Metadata = { title: 'Sprint Odası — Kalem Birliği' }
export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ sprintId: string }> }

export default async function SprintRoomPage({ params }: Props) {
  const { sprintId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: sprint }, { data: participants }, { data: projects }] = await Promise.all([
    supabase.from('writing_sprints').select('*').eq('id', sprintId).single(),
    supabase
      .from('sprint_participants')
      .select('*, profile:profiles(id, username, display_name, avatar_url)')
      .eq('sprint_id', sprintId),
    supabase
      .from('projects')
      .select('id, title, slug')
      .eq('owner_id', user.id)
      .eq('visibility', 'open')
      .order('updated_at', { ascending: false })
      .limit(10),
  ])

  if (!sprint) notFound()

  const isJoined = (participants ?? []).some(p => p.user_id === user.id)

  // Her projenin son bölümünü bul
  const projectIds = (projects ?? []).map(p => p.id)
  const { data: chapters } = projectIds.length > 0
    ? await supabase
        .from('chapters')
        .select('id, project_id')
        .in('project_id', projectIds)
        .order('order_index', { ascending: true })
    : { data: [] }

  const userProjects = (projects ?? []).map(p => ({
    id: p.id,
    title: p.title,
    defaultChapterId: (chapters ?? []).find(c => c.project_id === p.id)?.id,
  }))

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-12 space-y-6">
      <Link
        href="/sprint"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors uppercase tracking-wider cursor-pointer"
      >
        ← Sprintlere Dön
      </Link>

      <SprintRoom
        sprint={{ ...sprint, participant_count: (participants ?? []).length }}
        initialParticipants={participants as SprintParticipant[]}
        currentUserId={user.id}
        isJoined={isJoined}
        userProjects={userProjects}
      />
    </div>
  )
}
```

- [ ] **Step 4: TypeScript kontrol**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add app/(app)/sprint/ components/sprint/
git commit -m "feat: add sprint list page, sprint room page, and new sprint redirect"
```

---

### Task 9: Navbar — Sprint linki

**Files:**
- Modify: `components/shared/Navbar.tsx`

- [ ] **Step 1: Zap ikonunu import et**

`components/shared/Navbar.tsx` dosyasında mevcut import satırını bul ve `Zap` ekle:

```typescript
import { ..., Zap } from 'lucide-react'
```

- [ ] **Step 2: Desktop nav listesine Sprint ekle**

Navbar'daki desktop nav array'ini bul (`href: '/explore'` ile başlayan), `Akademi` satırından sonraya ekle:

```typescript
{ href: '/sprint',    label: 'Sprint',    icon: <Zap className="w-4 h-4 text-amber-400" /> },
```

- [ ] **Step 3: Mobile nav listesine Sprint ekle**

Mobile nav array'ini bul (`href: '/classroom'` olan satır), yanına ekle:

```typescript
{ href: '/sprint', label: 'Sprint', icon: <Zap className="w-4 h-4 text-amber-400" /> },
```

- [ ] **Step 4: Dropdown menüye de ekle**

Navbar dropdown menüsünde `/classroom` linkinden sonraya ekle:

```tsx
<DropdownMenuItem className="rounded-xl px-3 py-2 cursor-pointer hover:bg-white/[0.03]">
  <Link href="/sprint" className="flex w-full items-center gap-2.5 text-[13px] text-muted-foreground hover:text-white font-medium">
    <Zap className="w-4 h-4 text-amber-400" /> Sprint
  </Link>
</DropdownMenuItem>
```

- [ ] **Step 5: TypeScript kontrol**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Commit**

```bash
git add components/shared/Navbar.tsx
git commit -m "feat: add Sprint link to navbar"
```

---

### Task 10: CLAUDE.md güncelle

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Faz 5 satırını güncelle**

`CLAUDE.md`'deki platform faz tablosunda Faz 5 satırını bul:

```
| **Faz 5** | Sosyal & Büyüme | ⏳ Gelecek | Profil sayfaları, kullanıcı keşfet, yorum thread'leri, onboarding akışı |
```

Şu şekilde güncelle:

```
| **Faz 5** | Yazı Sprintleri | ✅ Tamamlandı | Topluluk + bireysel sprintler, canlı katılımcı sayacı, Vercel Cron, rozet entegrasyonu |
| **Faz 6** | Sosyal & Büyüme | ⏳ Gelecek | Profil sayfaları, kullanıcı keşfet, yorum thread'leri, onboarding akışı |
```

- [ ] **Step 2: Yeni dosyaları dosya haritasına ekle**

CLAUDE.md'deki kritik dosyalar listesine ekle:

```
app/(app)/sprint/page.tsx                     # Sprint listesi + bireysel sprint başlat
app/(app)/sprint/[sprintId]/page.tsx          # Sprint odası
app/(app)/sprint/new/page.tsx                 # Bireysel sprint oluştur + redirect
app/api/sprint/route.ts                       # GET liste | POST bireysel sprint
app/api/sprint/[sprintId]/join/route.ts       # POST katıl
app/api/sprint/[sprintId]/finish/route.ts     # POST bitir + streak + rozet
app/api/sprint/community/route.ts             # Admin: topluluk sprinti oluştur
app/api/sprint/cron/route.ts                  # Vercel Cron: günlük 3 sprint
components/sprint/SprintCard.tsx              # Sprint kartı
components/sprint/SprintRoom.tsx              # Timer + realtime + bitirme UI
components/sprint/SprintLeaderboard.tsx       # Sprint sonu sıralama
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with Faz 5 sprint feature map"
```

---

## Son Kontrol

- [ ] `npx tsc --noEmit` temiz
- [ ] Supabase'de `writing_sprints` ve `sprint_participants` tabloları mevcut
- [ ] Vercel Environment Variables'a `CRON_SECRET` eklendi
- [ ] `/sprint` sayfası render oluyor
- [ ] Bireysel sprint başlatma (`/sprint/new?duration=25`) redirect ile sprint odasına götürüyor
- [ ] Sprint odasında geri sayım çalışıyor
- [ ] Katılınca "Editöre Git" linki görünüyor
- [ ] Sprint bitince kelime girme ekranı çıkıyor
- [ ] Sıralama görünüyor
