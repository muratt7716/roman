# Writer Squad — Phase 1A: Kurulum & Auth

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Next.js 15 projesini kurmak, Supabase bağlantısını sağlamak, veritabanı şemasını oluşturmak ve tam çalışan auth sistemini (email + Google OAuth) teslim etmek.

**Architecture:** Monolitik Next.js 15 App Router. Supabase SSR cookie-based session. Middleware tüm `(app)/*` rotalarını korur.

**Tech Stack:** Next.js 15, TypeScript, TailwindCSS 4, shadcn/ui, Supabase (Auth + PostgreSQL), React Hook Form, Zod, Framer Motion, Vitest

---

## Dosya Haritası

```
Oluşturulacak:
  package.json
  next.config.ts
  tailwind.config.ts
  tsconfig.json
  .env.local.example
  middleware.ts
  types/index.ts
  lib/supabase/client.ts
  lib/supabase/server.ts
  lib/supabase/middleware.ts
  lib/validations/auth.ts
  supabase/migrations/001_initial_schema.sql
  supabase/migrations/002_rls_policies.sql
  supabase/migrations/003_indexes.sql
  app/globals.css
  app/layout.tsx
  app/(auth)/login/page.tsx
  app/(auth)/signup/page.tsx
  app/(auth)/auth/callback/route.ts
  components/auth/LoginForm.tsx
  components/auth/SignupForm.tsx
  components/shared/Navbar.tsx
  components/shared/EmptyState.tsx
  components/shared/LoadingSkeleton.tsx
  stores/uiStore.ts
  vitest.config.ts
  tests/lib/validations/auth.test.ts
```

---

### Task 1: Proje Scaffold

**Files:**
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `vitest.config.ts`

- [ ] **Step 1: Next.js projesini oluştur**

```bash
cd c:\Users\Administrator\Desktop\roman
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
```

Sorulara cevaplar: `Yes` hepsine.

- [ ] **Step 2: Bağımlılıkları kur**

```bash
npm install @supabase/supabase-js @supabase/ssr zustand react-hook-form zod @hookform/resolvers framer-motion
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit
npm install lucide-react class-variance-authority clsx tailwind-merge
npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: shadcn/ui başlat**

```bash
npx shadcn@latest init
```

Seçimler: `Default` style, `slate` base color, `yes` CSS variables.

- [ ] **Step 4: Gerekli shadcn bileşenlerini ekle**

```bash
npx shadcn@latest add button input label form card badge avatar dropdown-menu sheet toast sonner separator skeleton tabs
```

- [ ] **Step 5: `next.config.ts` yaz**

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
}

export default nextConfig
```

- [ ] **Step 6: `vitest.config.ts` yaz**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': resolve(__dirname, '.') },
  },
})
```

- [ ] **Step 7: `tests/setup.ts` yaz**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 8: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold Next.js 15 project with dependencies"
```

---

### Task 2: TypeScript Tipleri

**Files:**
- Create: `types/index.ts`

- [ ] **Step 1: `types/index.ts` yaz**

```ts
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export type ProjectVisibility = 'draft' | 'open' | 'closed' | 'published'
export type CollaborationStatus = 'recruiting' | 'active' | 'completed'
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected'
export type ChapterStatus = 'draft' | 'review' | 'final'
export type NotificationType = 'application' | 'acceptance' | 'rejection' | 'comment' | 'mention'
export type BrainstormNoteType = 'plot' | 'character' | 'lore' | 'relationship' | 'sticky'

export interface Profile {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  portfolio_url: string | null
  reputation_score: number
  created_at: string
}

export interface Project {
  id: string
  owner_id: string
  title: string
  slug: string
  genre: string | null
  synopsis: string | null
  tags: string[]
  target_word_count: number | null
  current_word_count: number
  visibility: ProjectVisibility
  collaboration_status: CollaborationStatus
  cover_image_url: string | null
  created_at: string
  updated_at: string
}

export interface ProjectRole {
  id: string
  project_id: string
  name: string
  description: string | null
  max_members: number
  permissions: Json
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  role_id: string
  joined_at: string
  contribution_percentage: number
}

export interface Application {
  id: string
  project_id: string
  applicant_id: string
  role_id: string
  intro: string
  writing_sample: string | null
  portfolio_links: string[]
  status: ApplicationStatus
  created_at: string
}

export interface Chapter {
  id: string
  project_id: string
  title: string
  order_index: number
  status: ChapterStatus
  word_count: number
  created_by: string
  created_at: string
  updated_at: string
}

export interface ChapterVersion {
  id: string
  chapter_id: string
  author_id: string
  content: string
  word_count: number
  created_at: string
}

export interface Comment {
  id: string
  chapter_id: string
  author_id: string
  content: string
  selection_range: Json | null
  resolved: boolean
  created_at: string
}

export interface BrainstormNote {
  id: string
  project_id: string
  author_id: string
  type: BrainstormNoteType
  title: string | null
  content: Json
  position_x: number
  position_y: number
  color: string
  created_at: string
  updated_at: string
}

export interface CharacterProfile {
  id: string
  project_id: string
  name: string
  role: string | null
  description: string | null
  traits: string[]
  image_url: string | null
  relationships: Json
  arc_notes: string | null
  created_by: string
  created_at: string
  updated_at: string
}

export interface TimelineEvent {
  id: string
  project_id: string
  title: string
  description: string | null
  event_date: string | null
  arc: string | null
  order_index: number
  created_by: string
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  payload: Json
  read: boolean
  created_at: string
}

// Joined types for UI
export interface ProjectWithOwner extends Project {
  owner: Profile
  roles: ProjectRole[]
  member_count?: number
}

export interface ApplicationWithApplicant extends Application {
  applicant: Profile
  role: ProjectRole
}

export interface MemberWithProfile extends ProjectMember {
  profile: Profile
  role: ProjectRole
}
```

- [ ] **Step 2: Commit**

```bash
git add types/index.ts
git commit -m "feat: add TypeScript type definitions"
```

---

### Task 3: Tasarım Tokens (Tailwind + CSS)

**Files:**
- Modify: `tailwind.config.ts`, `app/globals.css`

- [ ] **Step 1: `tailwind.config.ts` yaz**

```ts
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        surface: 'hsl(var(--surface))',
        'surface-2': 'hsl(var(--surface-2))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        border: 'hsl(var(--border))',
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: 'hsl(var(--success))',
        ring: 'hsl(var(--ring))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        sans: ['Inter', 'sans-serif'],
        serif: ['Lora', 'serif'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.2s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
```

- [ ] **Step 2: `tailwindcss-animate` kur**

```bash
npm install tailwindcss-animate
```

- [ ] **Step 3: `app/globals.css` yaz**

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;600;700&family=Lora:ital,wght@0,400;0,500;1,400&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 240 8% 5%;
    --foreground: 60 9% 97%;
    --surface: 240 8% 8%;
    --surface-2: 240 7% 11%;
    --card: 240 8% 8%;
    --card-foreground: 60 9% 97%;
    --primary: 262 83% 58%;
    --primary-foreground: 0 0% 100%;
    --accent: 263 67% 75%;
    --accent-foreground: 240 8% 5%;
    --muted: 240 7% 11%;
    --muted-foreground: 240 5% 64%;
    --border: 240 6% 18%;
    --destructive: 0 72% 51%;
    --destructive-foreground: 0 0% 100%;
    --success: 160 84% 39%;
    --ring: 262 83% 58%;
    --radius: 0.5rem;
  }
}

@layer base {
  * { @apply border-border; }
  body {
    @apply bg-background text-foreground font-sans antialiased;
  }
  h1, h2 { @apply font-display; }
}

@layer utilities {
  .glass {
    @apply bg-white/[0.03] backdrop-blur-sm border border-white/[0.08];
  }
  .text-gradient {
    @apply bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent;
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.ts app/globals.css
git commit -m "feat: add design tokens and global styles"
```

---

### Task 4: Supabase Kurulumu

**Files:**
- Create: `.env.local.example`, `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts`

- [ ] **Step 1: `.env.local.example` yaz**

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

- [ ] **Step 2: `.env.local` dosyasını oluştur ve Supabase bilgilerini doldur**

```bash
cp .env.local.example .env.local
# Supabase Dashboard > Settings > API'den değerleri kopyala
```

- [ ] **Step 3: `lib/supabase/client.ts` yaz (browser client)**

```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 4: `lib/supabase/server.ts` yaz (server component client)**

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 5: `lib/supabase/middleware.ts` yaz**

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const isProtected = request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/projects/new') ||
    request.nextUrl.pathname.match(/^\/projects\/[^/]+\/(write|brainstorm|wiki|timeline|history|overview)/)

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
```

- [ ] **Step 6: `middleware.ts` (root) yaz**

```ts
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

- [ ] **Step 7: Commit**

```bash
git add lib/ middleware.ts .env.local.example
git commit -m "feat: add Supabase client factories and middleware"
```

---

### Task 5: Veritabanı Migrasyonları

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`, `002_rls_policies.sql`, `003_indexes.sql`

- [ ] **Step 1: `supabase/migrations/001_initial_schema.sql` yaz**

```sql
-- ENUMs
CREATE TYPE project_visibility AS ENUM ('draft', 'open', 'closed', 'published');
CREATE TYPE collaboration_status AS ENUM ('recruiting', 'active', 'completed');
CREATE TYPE application_status AS ENUM ('pending', 'accepted', 'rejected');
CREATE TYPE chapter_status AS ENUM ('draft', 'review', 'final');
CREATE TYPE notification_type AS ENUM ('application', 'acceptance', 'rejection', 'comment', 'mention');
CREATE TYPE brainstorm_note_type AS ENUM ('plot', 'character', 'lore', 'relationship', 'sticky');

-- PROFILES
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text,
  bio text,
  avatar_url text,
  portfolio_url text,
  reputation_score int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Auth trigger: yeni kullanıcı kaydında profile otomatik oluştur
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1) || '_' || substr(NEW.id::text, 1, 4)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- PROJECTS
CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  genre text,
  synopsis text,
  tags text[] NOT NULL DEFAULT '{}',
  target_word_count int,
  current_word_count int NOT NULL DEFAULT 0,
  visibility project_visibility NOT NULL DEFAULT 'draft',
  collaboration_status collaboration_status NOT NULL DEFAULT 'recruiting',
  cover_image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- PROJECT ROLES
CREATE TABLE project_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  max_members int NOT NULL DEFAULT 1,
  permissions jsonb NOT NULL DEFAULT '{}'
);

-- PROJECT MEMBERS
CREATE TABLE project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES project_roles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  contribution_percentage numeric NOT NULL DEFAULT 0,
  UNIQUE(project_id, user_id)
);

-- APPLICATIONS
CREATE TABLE applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES project_roles(id) ON DELETE CASCADE,
  intro text NOT NULL,
  writing_sample text,
  portfolio_links text[] NOT NULL DEFAULT '{}',
  status application_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- CHAPTERS
CREATE TABLE chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  order_index int NOT NULL,
  status chapter_status NOT NULL DEFAULT 'draft',
  word_count int NOT NULL DEFAULT 0,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- CHAPTER VERSIONS
CREATE TABLE chapter_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id),
  content text NOT NULL,
  word_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- COMMENTS
CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  selection_range jsonb,
  resolved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- BRAINSTORM NOTES
CREATE TABLE brainstorm_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type brainstorm_note_type NOT NULL DEFAULT 'sticky',
  title text,
  content jsonb NOT NULL DEFAULT '{}',
  position_x numeric NOT NULL DEFAULT 0,
  position_y numeric NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#7C3AED',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- CHARACTER PROFILES
CREATE TABLE character_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text,
  description text,
  traits text[] NOT NULL DEFAULT '{}',
  image_url text,
  relationships jsonb NOT NULL DEFAULT '{}',
  arc_notes text,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- TIMELINE EVENTS
CREATE TABLE timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  event_date text,
  arc text,
  order_index int NOT NULL,
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- NOTIFICATIONS
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON chapters
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON brainstorm_notes
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON character_profiles
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at();
```

- [ ] **Step 2: `supabase/migrations/002_rls_policies.sql` yaz**

```sql
-- RLS'yi etkinleştir
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapter_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE brainstorm_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeline_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Helper: proje üyesi mi?
CREATE OR REPLACE FUNCTION is_project_member(p_project_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper: proje sahibi mi?
CREATE OR REPLACE FUNCTION is_project_owner(p_project_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM projects
    WHERE id = p_project_id AND owner_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- PROFILES
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid());

-- PROJECTS
CREATE POLICY "projects_select_public" ON projects FOR SELECT
  USING (visibility IN ('open', 'closed', 'published') OR owner_id = auth.uid() OR is_project_member(id));
CREATE POLICY "projects_insert_auth" ON projects FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND owner_id = auth.uid());
CREATE POLICY "projects_update_owner" ON projects FOR UPDATE
  USING (owner_id = auth.uid());
CREATE POLICY "projects_delete_owner" ON projects FOR DELETE
  USING (owner_id = auth.uid());

-- PROJECT ROLES
CREATE POLICY "roles_select_member" ON project_roles FOR SELECT
  USING (is_project_owner(project_id) OR is_project_member(project_id) OR
    EXISTS (SELECT 1 FROM projects WHERE id = project_id AND visibility IN ('open', 'closed', 'published')));
CREATE POLICY "roles_insert_owner" ON project_roles FOR INSERT
  WITH CHECK (is_project_owner(project_id));
CREATE POLICY "roles_update_owner" ON project_roles FOR UPDATE
  USING (is_project_owner(project_id));
CREATE POLICY "roles_delete_owner" ON project_roles FOR DELETE
  USING (is_project_owner(project_id));

-- PROJECT MEMBERS
CREATE POLICY "members_select_member" ON project_members FOR SELECT
  USING (is_project_owner(project_id) OR is_project_member(project_id));
CREATE POLICY "members_insert_owner" ON project_members FOR INSERT
  WITH CHECK (is_project_owner(project_id));
CREATE POLICY "members_delete_owner" ON project_members FOR DELETE
  USING (is_project_owner(project_id));

-- APPLICATIONS
CREATE POLICY "applications_select" ON applications FOR SELECT
  USING (applicant_id = auth.uid() OR is_project_owner(project_id));
CREATE POLICY "applications_insert_auth" ON applications FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND applicant_id = auth.uid());
CREATE POLICY "applications_update_owner" ON applications FOR UPDATE
  USING (is_project_owner(project_id));

-- CHAPTERS
CREATE POLICY "chapters_select_member" ON chapters FOR SELECT
  USING (is_project_owner(project_id) OR is_project_member(project_id));
CREATE POLICY "chapters_insert_member" ON chapters FOR INSERT
  WITH CHECK (is_project_owner(project_id) OR is_project_member(project_id));
CREATE POLICY "chapters_update_member" ON chapters FOR UPDATE
  USING (is_project_owner(project_id) OR is_project_member(project_id));
CREATE POLICY "chapters_delete_owner" ON chapters FOR DELETE
  USING (is_project_owner(project_id));

-- CHAPTER VERSIONS
CREATE POLICY "versions_select_member" ON chapter_versions FOR SELECT
  USING (EXISTS (SELECT 1 FROM chapters c WHERE c.id = chapter_id AND
    (is_project_owner(c.project_id) OR is_project_member(c.project_id))));
CREATE POLICY "versions_insert_member" ON chapter_versions FOR INSERT
  WITH CHECK (author_id = auth.uid() AND EXISTS (
    SELECT 1 FROM chapters c WHERE c.id = chapter_id AND
    (is_project_owner(c.project_id) OR is_project_member(c.project_id))));

-- NOTIFICATIONS
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY "notifications_insert_service" ON notifications FOR INSERT
  WITH CHECK (true);

-- BRAINSTORM NOTES
CREATE POLICY "brainstorm_select_member" ON brainstorm_notes FOR SELECT
  USING (is_project_owner(project_id) OR is_project_member(project_id));
CREATE POLICY "brainstorm_insert_member" ON brainstorm_notes FOR INSERT
  WITH CHECK (auth.uid() = author_id AND (is_project_owner(project_id) OR is_project_member(project_id)));
CREATE POLICY "brainstorm_update_member" ON brainstorm_notes FOR UPDATE
  USING (is_project_owner(project_id) OR is_project_member(project_id));
CREATE POLICY "brainstorm_delete_author" ON brainstorm_notes FOR DELETE
  USING (author_id = auth.uid() OR is_project_owner(project_id));

-- CHARACTER PROFILES
CREATE POLICY "chars_select_member" ON character_profiles FOR SELECT
  USING (is_project_owner(project_id) OR is_project_member(project_id));
CREATE POLICY "chars_insert_member" ON character_profiles FOR INSERT
  WITH CHECK (is_project_owner(project_id) OR is_project_member(project_id));
CREATE POLICY "chars_update_member" ON character_profiles FOR UPDATE
  USING (is_project_owner(project_id) OR is_project_member(project_id));
CREATE POLICY "chars_delete_owner" ON character_profiles FOR DELETE
  USING (is_project_owner(project_id));

-- TIMELINE EVENTS
CREATE POLICY "timeline_select_member" ON timeline_events FOR SELECT
  USING (is_project_owner(project_id) OR is_project_member(project_id));
CREATE POLICY "timeline_insert_member" ON timeline_events FOR INSERT
  WITH CHECK (is_project_owner(project_id) OR is_project_member(project_id));
CREATE POLICY "timeline_update_member" ON timeline_events FOR UPDATE
  USING (is_project_owner(project_id) OR is_project_member(project_id));
CREATE POLICY "timeline_delete_owner" ON timeline_events FOR DELETE
  USING (is_project_owner(project_id));
```

- [ ] **Step 3: `supabase/migrations/003_indexes.sql` yaz**

```sql
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_slug ON projects(slug);
CREATE INDEX idx_projects_visibility ON projects(visibility);
CREATE INDEX idx_projects_collab_status ON projects(collaboration_status);
CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);
CREATE INDEX idx_chapters_project ON chapters(project_id);
CREATE INDEX idx_chapter_versions_chapter ON chapter_versions(chapter_id);
CREATE INDEX idx_applications_project ON applications(project_id);
CREATE INDEX idx_applications_applicant ON applications(applicant_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_notifications_user ON notifications(user_id, read);
CREATE INDEX idx_brainstorm_project ON brainstorm_notes(project_id);
CREATE INDEX idx_chars_project ON character_profiles(project_id);
CREATE INDEX idx_timeline_project ON timeline_events(project_id, order_index);
```

- [ ] **Step 4: Migrasyonları Supabase'e uygula**

Supabase Dashboard > SQL Editor'a gidip sırasıyla her dosyanın içeriğini çalıştır:
1. `001_initial_schema.sql`
2. `002_rls_policies.sql`
3. `003_indexes.sql`

- [ ] **Step 5: Supabase Storage bucket'larını oluştur**

Supabase Dashboard > Storage > New bucket:
- `avatars` → Public: true
- `covers` → Public: true

- [ ] **Step 6: Commit**

```bash
git add supabase/
git commit -m "feat: add database migrations and RLS policies"
```

---

### Task 6: Zod Validasyon Şemaları (Test Dahil)

**Files:**
- Create: `lib/validations/auth.ts`, `tests/lib/validations/auth.test.ts`

- [ ] **Step 1: `tests/lib/validations/auth.test.ts` yaz (önce test)**

```ts
import { describe, it, expect } from 'vitest'
import { signUpSchema, signInSchema } from '@/lib/validations/auth'

describe('signUpSchema', () => {
  it('geçerli kayıt verisini kabul eder', () => {
    const result = signUpSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
      username: 'testuser',
    })
    expect(result.success).toBe(true)
  })

  it('geçersiz email reddeder', () => {
    const result = signUpSchema.safeParse({
      email: 'notanemail',
      password: 'password123',
      username: 'testuser',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('email')
  })

  it('kısa şifreyi reddeder', () => {
    const result = signUpSchema.safeParse({
      email: 'test@example.com',
      password: '123',
      username: 'testuser',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('password')
  })

  it('geçersiz username reddeder (boşluk içeren)', () => {
    const result = signUpSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
      username: 'test user',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('username')
  })

  it('kısa username reddeder', () => {
    const result = signUpSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
      username: 'ab',
    })
    expect(result.success).toBe(false)
  })
})

describe('signInSchema', () => {
  it('geçerli giriş verisini kabul eder', () => {
    const result = signInSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
    })
    expect(result.success).toBe(true)
  })

  it('boş alanları reddeder', () => {
    const result = signInSchema.safeParse({ email: '', password: '' })
    expect(result.success).toBe(false)
  })
})
```

- [ ] **Step 2: Testi çalıştır — fail bekliyoruz**

```bash
npx vitest run tests/lib/validations/auth.test.ts
```

Beklenen: `FAIL — cannot find module '@/lib/validations/auth'`

- [ ] **Step 3: `lib/validations/auth.ts` yaz**

```ts
import { z } from 'zod'

export const signUpSchema = z.object({
  email: z.string().email('Geçerli bir email adresi girin'),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalı'),
  username: z
    .string()
    .min(3, 'Kullanıcı adı en az 3 karakter olmalı')
    .max(30, 'Kullanıcı adı en fazla 30 karakter olabilir')
    .regex(/^[a-zA-Z0-9_]+$/, 'Sadece harf, rakam ve alt çizgi kullanılabilir'),
})

export const signInSchema = z.object({
  email: z.string().email('Geçerli bir email adresi girin'),
  password: z.string().min(1, 'Şifre zorunludur'),
})

export type SignUpInput = z.infer<typeof signUpSchema>
export type SignInInput = z.infer<typeof signInSchema>
```

- [ ] **Step 4: Testi çalıştır — pass bekliyoruz**

```bash
npx vitest run tests/lib/validations/auth.test.ts
```

Beklenen: `✓ 7 tests passed`

- [ ] **Step 5: Commit**

```bash
git add lib/validations/auth.ts tests/
git commit -m "feat: add auth validation schemas with tests"
```

---

### Task 7: Root Layout & App Layout

**Files:**
- Modify: `app/layout.tsx`
- Create: `app/(auth)/layout.tsx`, `app/(app)/layout.tsx`, `stores/uiStore.ts`, `components/shared/Navbar.tsx`

- [ ] **Step 1: `app/layout.tsx` yaz**

```tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Writer Squad — Birlikte Yaz',
  description: 'Stories were never meant to be written alone.',
  openGraph: {
    title: 'Writer Squad',
    description: 'Stories were never meant to be written alone.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className="dark">
      <body className="min-h-dvh bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 2: `app/(auth)/layout.tsx` yaz**

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-background">
      <div className="w-full max-w-md px-4">
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: `stores/uiStore.ts` yaz**

```ts
import { create } from 'zustand'

interface UIStore {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (value: boolean) => void
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),
}))
```

- [ ] **Step 4: `components/shared/Navbar.tsx` yaz**

```tsx
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PenLine, LogOut, User, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

interface NavbarProps {
  profile?: Profile | null
}

export function Navbar({ profile }: NavbarProps) {
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-display font-bold text-lg">
          <PenLine className="w-5 h-5 text-primary" />
          <span className="text-gradient">Writer Squad</span>
        </Link>

        <div className="flex items-center gap-2">
          {profile ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/explore">Keşfet</Link>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link href="/notifications" aria-label="Bildirimler">
                  <Bell className="w-4 h-4" />
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full" aria-label="Hesap menüsü">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={profile.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-primary/20 text-primary text-xs">
                        {profile.display_name?.[0] ?? profile.username[0]}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-surface border-border">
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard" className="cursor-pointer">Dashboard</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href={`/u/${profile.username}`} className="cursor-pointer">
                      <User className="w-4 h-4 mr-2" /> Profil
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings" className="cursor-pointer">Ayarlar</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer">
                    <LogOut className="w-4 h-4 mr-2" /> Çıkış Yap
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/explore">Keşfet</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Giriş Yap</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/signup">Başla</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
```

- [ ] **Step 5: `app/(app)/layout.tsx` yaz**

```tsx
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/shared/Navbar'
import type { Profile } from '@/types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-dvh">
      <Navbar profile={profile as Profile} />
      <main className="pt-14">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add app/ stores/ components/shared/Navbar.tsx
git commit -m "feat: add layouts, navbar, and UI store"
```

---

### Task 8: Auth Sayfaları

**Files:**
- Create: `components/auth/LoginForm.tsx`, `components/auth/SignupForm.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx`, `app/(auth)/auth/callback/route.ts`

- [ ] **Step 1: `components/auth/LoginForm.tsx` yaz**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { signInSchema, type SignInInput } from '@/lib/validations/auth'

export function LoginForm() {
  const router = useRouter()
  const supabase = createClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignInInput>({
    resolver: zodResolver(signInSchema),
  })

  async function onSubmit(data: SignInInput) {
    setServerError(null)
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    if (error) {
      setServerError('Email veya şifre hatalı.')
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  return (
    <div className="glass rounded-xl p-8 space-y-6">
      <div className="text-center space-y-1">
        <h1 className="font-display text-2xl font-bold">Tekrar hoş geldin</h1>
        <p className="text-muted-foreground text-sm">Hikayeye devam et</p>
      </div>

      <Button variant="outline" className="w-full border-border" onClick={signInWithGoogle} type="button">
        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 1 1 0-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0 0 12.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748z"/>
        </svg>
        Google ile giriş yap
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-surface px-2 text-muted-foreground">veya</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            className="bg-surface-2 border-border"
            aria-describedby={errors.email ? 'email-error' : undefined}
            aria-invalid={!!errors.email}
            {...register('email')}
          />
          {errors.email && (
            <p id="email-error" role="alert" className="text-destructive text-xs">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Şifre</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            className="bg-surface-2 border-border"
            aria-describedby={errors.password ? 'password-error' : undefined}
            aria-invalid={!!errors.password}
            {...register('password')}
          />
          {errors.password && (
            <p id="password-error" role="alert" className="text-destructive text-xs">
              {errors.password.message}
            </p>
          )}
        </div>

        {serverError && (
          <p role="alert" className="text-destructive text-sm text-center">
            {serverError}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Giriş Yap
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Hesabın yok mu?{' '}
        <Link href="/signup" className="text-primary hover:underline">
          Kayıt ol
        </Link>
      </p>
    </div>
  )
}
```

- [ ] **Step 2: `components/auth/SignupForm.tsx` yaz**

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { signUpSchema, type SignUpInput } from '@/lib/validations/auth'

export function SignupForm() {
  const router = useRouter()
  const supabase = createClient()
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
  })

  async function onSubmit(data: SignUpInput) {
    setServerError(null)
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: { username: data.username },
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    })
    if (error) {
      setServerError(error.message === 'User already registered'
        ? 'Bu email zaten kayıtlı.'
        : 'Bir hata oluştu. Lütfen tekrar dene.')
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  async function signUpWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  return (
    <div className="glass rounded-xl p-8 space-y-6">
      <div className="text-center space-y-1">
        <h1 className="font-display text-2xl font-bold">Topluluğa katıl</h1>
        <p className="text-muted-foreground text-sm">Birlikte yazmaya başla</p>
      </div>

      <Button variant="outline" className="w-full border-border" onClick={signUpWithGoogle} type="button">
        <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 1 1 0-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0 0 12.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748z"/>
        </svg>
        Google ile kayıt ol
      </Button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-surface px-2 text-muted-foreground">veya</span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="username">Kullanıcı Adı</Label>
          <Input
            id="username"
            autoComplete="username"
            placeholder="yazaradi"
            className="bg-surface-2 border-border"
            aria-describedby={errors.username ? 'username-error' : 'username-hint'}
            aria-invalid={!!errors.username}
            {...register('username')}
          />
          {errors.username ? (
            <p id="username-error" role="alert" className="text-destructive text-xs">
              {errors.username.message}
            </p>
          ) : (
            <p id="username-hint" className="text-muted-foreground text-xs">
              Harf, rakam ve alt çizgi kullanılabilir
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            className="bg-surface-2 border-border"
            aria-describedby={errors.email ? 'email-error' : undefined}
            aria-invalid={!!errors.email}
            {...register('email')}
          />
          {errors.email && (
            <p id="email-error" role="alert" className="text-destructive text-xs">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Şifre</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            className="bg-surface-2 border-border"
            aria-describedby={errors.password ? 'password-error' : 'password-hint'}
            aria-invalid={!!errors.password}
            {...register('password')}
          />
          {errors.password ? (
            <p id="password-error" role="alert" className="text-destructive text-xs">
              {errors.password.message}
            </p>
          ) : (
            <p id="password-hint" className="text-muted-foreground text-xs">
              En az 8 karakter
            </p>
          )}
        </div>

        {serverError && (
          <p role="alert" className="text-destructive text-sm text-center">
            {serverError}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Hesap Oluştur
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Zaten hesabın var mı?{' '}
        <Link href="/login" className="text-primary hover:underline">
          Giriş yap
        </Link>
      </p>
    </div>
  )
}
```

- [ ] **Step 3: `app/(auth)/login/page.tsx` yaz**

```tsx
import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/LoginForm'

export const metadata: Metadata = { title: 'Giriş Yap — Writer Squad' }

export default function LoginPage() {
  return <LoginForm />
}
```

- [ ] **Step 4: `app/(auth)/signup/page.tsx` yaz**

```tsx
import type { Metadata } from 'next'
import { SignupForm } from '@/components/auth/SignupForm'

export const metadata: Metadata = { title: 'Kayıt Ol — Writer Squad' }

export default function SignupPage() {
  return <SignupForm />
}
```

- [ ] **Step 5: `app/(auth)/auth/callback/route.ts` yaz**

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
```

- [ ] **Step 6: Dev sunucusunu çalıştır ve test et**

```bash
npm run dev
```

Test senaryoları:
- `http://localhost:3000/signup` → Form görünüyor mu?
- Geçersiz email ile submit → Hata mesajı görünüyor mu?
- Geçerli bilgilerle kayıt → Dashboard'a yönleniyor mu?
- `http://localhost:3000/login` → Giriş çalışıyor mu?
- `/dashboard`'a direkt git (giriş yapılmamışken) → Login'e yönleniyor mu?

- [ ] **Step 7: Commit**

```bash
git add components/auth/ app/\(auth\)/
git commit -m "feat: add auth pages (login, signup, OAuth callback)"
```

---

### Task 9: Shared Yardımcı Bileşenler

**Files:**
- Create: `components/shared/EmptyState.tsx`, `components/shared/LoadingSkeleton.tsx`

- [ ] **Step 1: `components/shared/EmptyState.tsx` yaz**

```tsx
import { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
        <Icon className="w-8 h-8 text-primary" />
      </div>
      <div className="space-y-1.5 max-w-sm">
        <h3 className="font-semibold text-lg">{title}</h3>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      {action && (
        action.href ? (
          <Button asChild size="sm">
            <a href={action.href}>{action.label}</a>
          </Button>
        ) : (
          <Button size="sm" onClick={action.onClick}>{action.label}</Button>
        )
      )}
    </div>
  )
}
```

- [ ] **Step 2: `components/shared/LoadingSkeleton.tsx` yaz**

```tsx
import { Skeleton } from '@/components/ui/skeleton'

export function ProjectCardSkeleton() {
  return (
    <div className="glass rounded-xl p-5 space-y-3">
      <Skeleton className="h-40 w-full rounded-lg bg-surface-2" />
      <Skeleton className="h-5 w-3/4 bg-surface-2" />
      <Skeleton className="h-4 w-full bg-surface-2" />
      <Skeleton className="h-4 w-2/3 bg-surface-2" />
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-6 w-16 rounded-full bg-surface-2" />
        <Skeleton className="h-6 w-20 rounded-full bg-surface-2" />
      </div>
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="w-10 h-10 rounded-full bg-surface-2" />
      <div className="space-y-1.5">
        <Skeleton className="h-4 w-32 bg-surface-2" />
        <Skeleton className="h-3 w-24 bg-surface-2" />
      </div>
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-8 w-48 bg-surface-2" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <ProjectCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add components/shared/EmptyState.tsx components/shared/LoadingSkeleton.tsx
git commit -m "feat: add shared EmptyState and LoadingSkeleton components"
```

---

### Task 10: Tüm Testleri Çalıştır & Build Doğrula

- [ ] **Step 1: Tüm testleri çalıştır**

```bash
npx vitest run
```

Beklenen: `✓ 7 tests passed`

- [ ] **Step 2: TypeScript tip kontrolü**

```bash
npx tsc --noEmit
```

Beklenen: Hata yok.

- [ ] **Step 3: Production build**

```bash
npm run build
```

Beklenen: Başarılı build, hata yok.

- [ ] **Step 4: Final commit**

```bash
git add .
git commit -m "feat: Phase 1A complete — scaffold, auth, DB schema, shared components"
```

---

## Phase 1A Tamamlandı ✓

Teslim edilen:
- Next.js 15 projesi tam kurulu
- Supabase bağlantısı + tüm DB migrasyonları
- RLS politikaları + indeksler
- Email + Google OAuth auth sistemi
- Middleware ile rota koruması
- Tasarım token sistemi (Tailwind + CSS vars)
- Shared bileşenler (Navbar, EmptyState, Skeleton)

Sonraki plan: `2026-05-11-phase1b-projects-applications.md`
