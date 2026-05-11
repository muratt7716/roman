# Writer Squad — Design Spec
**Date:** 2026-05-11  
**Status:** Approved  
**Approach:** Monolithic Next.js App Router + Supabase

---

## 1. Product Overview

**Writer Squad** — Takım halinde roman yazan yazarlar için işbirlikçi platform.  
Slogan: *"Stories were never meant to be written alone."*

Platform açıktır; herkes kayıt olup proje açabilir.

### Faz Planı
| Faz | Kapsam | Öncelik |
|---|---|---|
| 1 | Auth, Profil, Proje oluşturma, Başvuru sistemi | İlk deploy |
| 2 | Realtime editör, Takım sistemi, Yorumlar | MVP |
| 3 | Karakter wiki, Brainstorm panosu, Timeline | V2 |
| 4 | Temel yayın sistemi, Katkı analitiği | V3 |

---

## 2. Teknik Mimari

### Karar: Monolitik Next.js App Router (Yaklaşım A)
- Frontend + Backend: **Next.js 15 App Router** (Server Actions + Route Handlers)
- Veritabanı: **Supabase PostgreSQL** (doğrudan client)
- Realtime: **Supabase Realtime** (broadcast + presence)
- Editör: **TipTap + Supabase Realtime** (custom broadcast, Yjs yok)
- State: **Zustand** (yalnızca client-side ephemeral state)
- Auth: **Supabase Auth** (email + Google OAuth)
- Storage: **Supabase Storage**
- Deployment: **Vercel**
- Forms: **React Hook Form + Zod**
- UI: **shadcn/ui + TailwindCSS + Framer Motion**

---

## 3. Klasör Yapısı

```
writer-squad/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── auth/callback/route.ts
│   ├── (public)/
│   │   ├── page.tsx                    # Landing
│   │   ├── explore/page.tsx
│   │   ├── projects/[slug]/page.tsx
│   │   └── u/[username]/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx                  # Protected layout + middleware
│   │   ├── dashboard/page.tsx
│   │   ├── projects/
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/
│   │   │       ├── layout.tsx          # Proje sidebar layout
│   │   │       ├── overview/page.tsx
│   │   │       ├── write/page.tsx
│   │   │       ├── brainstorm/page.tsx
│   │   │       ├── wiki/page.tsx
│   │   │       ├── timeline/page.tsx
│   │   │       └── history/page.tsx
│   │   ├── notifications/page.tsx
│   │   └── settings/page.tsx
│   └── api/
│       └── webhooks/route.ts
├── components/
│   ├── ui/                             # shadcn/ui primitives
│   ├── editor/
│   │   ├── TipTapEditor.tsx
│   │   ├── EditorToolbar.tsx
│   │   ├── CommentPanel.tsx
│   │   └── PresenceAvatars.tsx
│   ├── project/
│   │   ├── ProjectCard.tsx
│   │   ├── ProjectForm.tsx
│   │   ├── RoleForm.tsx
│   │   └── ApplicationCard.tsx
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── SignupForm.tsx
│   └── shared/
│       ├── Navbar.tsx
│       ├── Sidebar.tsx
│       ├── EmptyState.tsx
│       └── LoadingSkeleton.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   # Browser client factory
│   │   ├── server.ts                   # Server component client
│   │   └── middleware.ts               # Session refresh
│   ├── validations/
│   │   ├── project.ts
│   │   ├── auth.ts
│   │   └── application.ts
│   └── utils/
│       ├── diff.ts                     # Content diff hesaplama
│       └── contribution.ts            # Katkı yüzdesi
├── stores/
│   ├── editorStore.ts                  # TipTap state, presence
│   └── uiStore.ts                      # Sidebar, modal state
├── hooks/
│   ├── usePresence.ts
│   ├── useAutosave.ts
│   └── useRealtime.ts
├── types/
│   └── index.ts
└── supabase/
    ├── migrations/
    │   ├── 001_initial_schema.sql
    │   ├── 002_rls_policies.sql
    │   └── 003_indexes.sql
    └── seed.sql
```

---

## 4. Veritabanı Şeması

### Core Tables

```sql
-- Kullanıcı profilleri (auth.users trigger ile otomatik oluşur)
profiles (
  id uuid PK FK auth.users,
  username text UNIQUE NOT NULL,
  display_name text,
  bio text,
  avatar_url text,
  portfolio_url text,
  reputation_score int DEFAULT 0,
  created_at timestamptz DEFAULT now()
)

-- Projeler
projects (
  id uuid PK DEFAULT gen_random_uuid(),
  owner_id uuid FK profiles NOT NULL,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  genre text,
  synopsis text,
  tags text[],
  target_word_count int,
  current_word_count int DEFAULT 0,
  visibility enum(draft, open, closed, published) DEFAULT 'draft',
  collaboration_status enum(recruiting, active, completed) DEFAULT 'recruiting',
  cover_image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

-- Proje rolleri (her proje kendi rollerini tanımlar)
project_roles (
  id uuid PK DEFAULT gen_random_uuid(),
  project_id uuid FK projects NOT NULL,
  name text NOT NULL,
  description text,
  max_members int DEFAULT 1,
  permissions jsonb DEFAULT '{}'
)

-- Proje üyeleri
project_members (
  id uuid PK DEFAULT gen_random_uuid(),
  project_id uuid FK projects NOT NULL,
  user_id uuid FK profiles NOT NULL,
  role_id uuid FK project_roles NOT NULL,
  joined_at timestamptz DEFAULT now(),
  contribution_percentage numeric DEFAULT 0,
  UNIQUE(project_id, user_id)
)

-- Başvurular
applications (
  id uuid PK DEFAULT gen_random_uuid(),
  project_id uuid FK projects NOT NULL,
  applicant_id uuid FK profiles NOT NULL,
  role_id uuid FK project_roles NOT NULL,
  intro text NOT NULL,
  writing_sample text,
  portfolio_links text[],
  status enum(pending, accepted, rejected) DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
)
```

### Writing System

```sql
-- Bölümler
chapters (
  id uuid PK DEFAULT gen_random_uuid(),
  project_id uuid FK projects NOT NULL,
  title text NOT NULL,
  order_index int NOT NULL,
  status enum(draft, review, final) DEFAULT 'draft',
  word_count int DEFAULT 0,
  created_by uuid FK profiles NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

-- Versiyon geçmişi
chapter_versions (
  id uuid PK DEFAULT gen_random_uuid(),
  chapter_id uuid FK chapters NOT NULL,
  author_id uuid FK profiles NOT NULL,
  content text NOT NULL,            -- TipTap JSON tam içerik (her versiyonda)
  word_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
  -- Not: diff, history sayfasında iki versiyon arasında anlık hesaplanır
)

-- Yorumlar
comments (
  id uuid PK DEFAULT gen_random_uuid(),
  chapter_id uuid FK chapters NOT NULL,
  author_id uuid FK profiles NOT NULL,
  content text NOT NULL,
  selection_range jsonb,            -- Seçili metin pozisyonu
  resolved bool DEFAULT false,
  created_at timestamptz DEFAULT now()
)
```

### Creative Tools

```sql
-- Brainstorm panosu notları
brainstorm_notes (
  id uuid PK DEFAULT gen_random_uuid(),
  project_id uuid FK projects NOT NULL,
  author_id uuid FK profiles NOT NULL,
  type enum(plot, character, lore, relationship, sticky),
  title text,
  content jsonb,
  position_x numeric DEFAULT 0,
  position_y numeric DEFAULT 0,
  color text DEFAULT '#7C3AED',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

-- Karakter profilleri
character_profiles (
  id uuid PK DEFAULT gen_random_uuid(),
  project_id uuid FK projects NOT NULL,
  name text NOT NULL,
  role text,
  description text,
  traits text[],
  image_url text,
  relationships jsonb DEFAULT '{}',
  arc_notes text,
  created_by uuid FK profiles NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

-- Zaman çizelgesi olayları
timeline_events (
  id uuid PK DEFAULT gen_random_uuid(),
  project_id uuid FK projects NOT NULL,
  title text NOT NULL,
  description text,
  event_date text,                  -- "Yıl 3, Kış Başı" gibi serbest format
  arc text,
  order_index int NOT NULL,
  created_by uuid FK profiles NOT NULL,
  created_at timestamptz DEFAULT now()
)

-- Bildirimler
notifications (
  id uuid PK DEFAULT gen_random_uuid(),
  user_id uuid FK profiles NOT NULL,
  type enum(application, acceptance, rejection, comment, mention),
  payload jsonb DEFAULT '{}',
  read bool DEFAULT false,
  created_at timestamptz DEFAULT now()
)
```

### Indexes

```sql
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_slug ON projects(slug);
CREATE INDEX idx_projects_visibility ON projects(visibility);
CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);
CREATE INDEX idx_chapters_project ON chapters(project_id);
CREATE INDEX idx_chapter_versions_chapter ON chapter_versions(chapter_id);
CREATE INDEX idx_applications_project ON applications(project_id);
CREATE INDEX idx_applications_applicant ON applications(applicant_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, read);
CREATE INDEX idx_brainstorm_project ON brainstorm_notes(project_id);
```

---

## 5. Auth & Permission Sistemi

### Auth Akışı
```
Signup → Supabase Auth → DB trigger → profiles tablosuna otomatik kayıt
Login  → email/password + Google OAuth
Session → Supabase SSR cookie-based (Next.js middleware)
```

### Middleware Koruması
```
/(app)/*    → giriş zorunlu → /login'e yönlendir
/(public)/* → herkese açık
/api/*      → Supabase JWT doğrulama
```

### RLS Policy Matrisi

| Tablo | Okuma | Yazma | Silme |
|---|---|---|---|
| `profiles` | herkes | sadece kendisi | — |
| `projects` | visibility'ye göre | owner/admin | owner |
| `chapters` | project member | writer/admin | owner/admin |
| `chapter_versions` | project member | yazar kendisi | — |
| `applications` | owner + başvuran | başvuran (create) | — |
| `brainstorm_notes` | project member | project member | yazar/owner |
| `character_profiles` | project member | writer/editor | owner/admin |
| `notifications` | sadece kendisi | sistem | kendisi |

### Proje İçi Rol Hiyerarşisi
```
Owner  → Her şey (proje sil dahil)
Admin  → Üye yönetimi, içerik yönetimi
Writer → Chapter yaz, brainstorm, karakter ekle
Editor → Chapter düzenle, yorum çöz
Viewer → Sadece oku + yorum yap
```

### Storage Bucket'ları
```
avatars/ → public read / auth write (kullanıcı avatarları)
covers/  → public read / auth write (proje kapak görselleri)
```

---

## 6. Sayfalar & Routing

### Public
| Route | Sayfa |
|---|---|
| `/` | Landing — Hero, öne çıkan projeler, nasıl çalışır, CTA |
| `/explore` | Proje keşfet — filtre, infinite scroll |
| `/projects/[slug]` | Proje detay — synopsis, ekip, başvur |
| `/u/[username]` | Kullanıcı profili |

### Auth
| Route | Sayfa |
|---|---|
| `/login` | Email + Google OAuth |
| `/signup` | Kayıt + username seçimi |
| `/auth/callback` | OAuth redirect handler |

### Protected (App)
| Route | Sayfa |
|---|---|
| `/dashboard` | Ana merkez — projeler, başvurular, bildirimler |
| `/projects/new` | Proje oluştur (3 adımlı form) |
| `/projects/[id]/overview` | Proje yönetim paneli |
| `/projects/[id]/write` | Yazma odası — TipTap editör |
| `/projects/[id]/brainstorm` | Fikir panosu — free-form board |
| `/projects/[id]/wiki` | Karakter wiki |
| `/projects/[id]/timeline` | Olay zaman çizelgesi |
| `/projects/[id]/history` | Versiyon geçmişi + diff |
| `/notifications` | Bildirimler merkezi |
| `/settings` | Profil, avatar, hesap |

---

## 7. Realtime İşbirliği Sistemi

### Mimari (TipTap + Supabase Realtime)

```
Kullanıcı /write sayfasına girer
  → Supabase Realtime channel: "project:{id}:chapter:{id}"
  
Presence layer:
  → Her kullanıcı online durumu + cursor pozisyonu yayar
  → Avatar + renk ile ekranda gösterilir

Broadcast layer (anlık sync):
  → TipTap onChange → 500ms debounce → JSON delta broadcast
  → Diğer kullanıcılar delta'yı alır → editöre uygular

Autosave (kalıcı kayıt):
  → 30 saniyede bir veya focus kaybında
  → chapter_versions tablosuna yeni satır
  → content_diff hesaplanır
```

### Katkı Takibi
```
Her autosave'de:
  1. Mevcut word_count ile önceki word_count arasındaki farkı hesapla
  2. Fark pozitifse author_id'e katkı puanı ekle
  3. project_members.contribution_percentage tüm üyeler için yeniden hesapla
  4. chapter_versions'a author_id + tam content + word_count yaz

Diff görünümü (history sayfası):
  → İki versiyon ID'si seçilir → anlık diff hesaplanır → görsel olarak gösterilir
  → Geri al: seçili versiyon content'i mevcut chapter'a yazılır
```

### Çakışma Önleme Stratejisi
- Last-write-wins broadcast (10 kullanıcıya kadar yeterli)
- Her chapter'a "aktif yazar" atama sistemi
- UI uyarısı: "Bu bölümü şu an [Ad] düzenliyor"
- Offline: yerel draft localStorage → online olunca sync

---

## 8. Tasarım Sistemi

### Stil
Dark Cinematic Editorial — Playfair Display başlıklar, Inter UI, Lora editör içeriği.

### Renk Paleti (WCAG AA Uyumlu)
| Token | Hex |
|---|---|
| `--background` | `#0D0D12` |
| `--surface` | `#13131A` |
| `--surface-2` | `#1C1C26` |
| `--border` | `rgba(255,255,255,0.08)` |
| `--primary` | `#7C3AED` |
| `--primary-hover` | `#6D28D9` |
| `--accent` | `#A78BFA` |
| `--foreground` | `#F8F8F2` |
| `--muted-fg` | `#9D9DAA` |
| `--destructive` | `#DC2626` |
| `--success` | `#10B981` |
| `--ring` | `#7C3AED` |

### Tipografi
| Seviye | Font | Boyut | Ağırlık |
|---|---|---|---|
| Display | Playfair Display | 56px | 700 |
| H1 | Playfair Display | 40px | 700 |
| H2 | Inter | 28px | 600 |
| H3 | Inter | 20px | 600 |
| Body | Inter | 16px | 400 |
| Label | Inter | 13px | 500 |
| Editor | Lora | 18px | 400 |

### Animasyon Kuralları
- Micro-interaction: 150–300ms, ease-out giriş / ease-in çıkış
- Sayfa geçişi: fade + slight-up (200ms)
- Modal: scale(0.95→1) + opacity (200ms)
- Sidebar: slide (250ms ease-out)
- `prefers-reduced-motion` tüm animasyonlarda zorunlu

### Spacing & Layout
- 4pt grid sistemi
- Max content width: 1280px
- Breakpoints: 375 / 768 / 1024 / 1440px
- Sidebar: 240px (collapsed: 64px)
- Touch target minimum: 44×44px

### Erişilebilirlik
- Tüm metin: minimum 4.5:1 kontrast
- Focus ring: 2px solid `--ring`, 2px offset
- Icon-only butonlarda `aria-label` zorunlu
- `aria-live` bölgeleri form hataları için

---

## 9. Kapsam Dışı (MVP)

- Stripe / ödeme entegrasyonu (Faz 4 sonrası)
- Yjs / CRDT tabanlı gerçek zamanlı çakışma çözümü
- AI yardımcı özellikler
- Mobil native uygulama
- Davetiye / beta erişim kısıtlaması

---

## 10. Başarı Kriterleri

- Faz 1: Kullanıcı kayıt olabilir, proje oluşturabilir, başvuru gönderebilir
- Faz 2: Ekip aynı chapter'ı realtime düzenleyebilir, autosave çalışır
- Faz 3: Karakter wiki ve brainstorm panosu doldurulabilir
- Faz 4: Proje "published" olarak işaretlenip public explore sayfasında görünür
