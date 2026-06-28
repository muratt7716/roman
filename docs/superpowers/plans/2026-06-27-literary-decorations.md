# Literary Decorations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Landing page'e yazarlık temalı 5 SVG motif ekle — tüy kalem, açık kitap, hokka, kalem ucu, mürekkep noktaları.

**Architecture:** Tek dosya `components/ui/LiteraryDecor.tsx`'te named SVG export'ları. `app/(public)/page.tsx` içinde her section'ın mevcut `relative` wrapper'ına `absolute pointer-events-none` olarak yerleştiriliyor.

**Tech Stack:** React, Tailwind CSS v4, inline SVG (no external lib)

## Global Constraints

- Tüm SVG elementleri `aria-hidden="true"` ve `pointer-events-none` olacak
- `select-none` class'ı eklenecek
- Mobilde gizli: `hidden sm:block` (küçük ekranda kalabalık yaratmasın)
- SVG stroke tabanlı, fill yok — `currentColor` ile renk alır
- strokeWidth: 1–1.5, strokeLinecap: round, strokeLinejoin: round
- Opacity: `text-white/[0.10]` ile `text-white/[0.14]` arası
- z-index: 0 — içerik üstüne çıkmaz (`z-0`)

---

### Task 1: LiteraryDecor bileşenleri

**Files:**
- Create: `components/ui/LiteraryDecor.tsx`

**Interfaces:**
- Produces: `QuillSVG`, `OpenBookSVG`, `InkwellSVG`, `PenNibSVG`, `InkDotsSVG` — hepsi `React.FC` (prop yok)

- [ ] **Step 1: Dosyayı oluştur**

`components/ui/LiteraryDecor.tsx` içeriği:

```tsx
export function QuillSVG() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 60 140"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="w-full h-full"
    >
      {/* Spine */}
      <path d="M30 135 Q28 90 15 20" />
      {/* Quill tip */}
      <path d="M26 135 Q30 125 34 135" />
      {/* Left vane */}
      <path d="M27 120 Q14 108 6 95" />
      <path d="M25 104 Q10 90 4 75" />
      <path d="M23 88 Q10 76 5 60" />
      <path d="M20 72 Q10 60 8 46" />
      <path d="M17 56 Q10 44 12 30" />
      {/* Right vane */}
      <path d="M30 118 Q44 108 50 95" />
      <path d="M28 102 Q44 90 52 77" />
      <path d="M26 86 Q42 75 50 62" />
      <path d="M24 70 Q38 60 44 48" />
      <path d="M21 54 Q34 44 38 32" />
      {/* Feather top curve */}
      <path d="M15 20 Q22 5 35 2 Q48 0 50 10 Q40 18 30 135" />
    </svg>
  )
}

export function OpenBookSVG() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 70"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="w-full h-full"
    >
      {/* Left page */}
      <path d="M50 10 Q30 8 10 14 L8 58 Q28 52 50 56 Z" />
      {/* Right page */}
      <path d="M50 10 Q70 8 90 14 L92 58 Q72 52 50 56 Z" />
      {/* Spine */}
      <line x1="50" y1="10" x2="50" y2="56" />
      {/* Left page text lines */}
      <path d="M18 22 Q32 19 46 21" />
      <path d="M17 30 Q31 27 45 29" />
      <path d="M16 38 Q30 35 44 37" />
      <path d="M16 46 Q29 43 43 45" />
      {/* Right page text lines */}
      <path d="M54 21 Q68 19 82 22" />
      <path d="M55 29 Q69 27 83 30" />
      <path d="M56 37 Q70 35 84 38" />
      <path d="M56 45 Q70 43 84 46" />
    </svg>
  )
}

export function InkwellSVG() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 60 70"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="w-full h-full"
    >
      {/* Jar body */}
      <path d="M12 28 Q10 62 8 65 Q30 68 52 65 Q50 62 48 28" />
      {/* Jar shoulder */}
      <path d="M12 28 Q18 22 30 20 Q42 22 48 28" />
      {/* Neck */}
      <path d="M22 20 Q22 14 30 12 Q38 14 38 20" />
      {/* Rim opening */}
      <ellipse cx="30" cy="12" rx="8" ry="3" />
      {/* Ink surface inside */}
      <path d="M18 34 Q30 38 42 34" />
      {/* Highlight */}
      <path d="M14 44 Q16 42 18 44" />
    </svg>
  )
}

export function PenNibSVG() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 50 80"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="w-full h-full"
    >
      {/* Left tine */}
      <path d="M25 75 L5 32 Q14 16 25 12" />
      {/* Right tine */}
      <path d="M25 75 L45 32 Q36 16 25 12" />
      {/* Center slit */}
      <line x1="25" y1="75" x2="25" y2="36" />
      {/* Breather hole */}
      <circle cx="25" cy="32" r="3" />
      {/* Shoulder band */}
      <path d="M10 30 Q25 26 40 30" />
    </svg>
  )
}

export function InkDotsSVG() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 300 300"
      fill="currentColor"
      stroke="none"
      aria-hidden="true"
      className="w-full h-full"
    >
      <circle cx="20"  cy="40"  r="3.5" />
      <circle cx="270" cy="20"  r="2"   />
      <circle cx="80"  cy="260" r="4"   />
      <circle cx="240" cy="200" r="2.5" />
      <circle cx="140" cy="60"  r="1.5" />
      <circle cx="40"  cy="160" r="3"   />
      <circle cx="260" cy="110" r="2"   />
      <circle cx="160" cy="280" r="3.5" />
      <circle cx="110" cy="130" r="1.5" />
      <circle cx="200" cy="70"  r="2.5" />
    </svg>
  )
}
```

- [ ] **Step 2: Görsel kontrol — bileşen var mı?**

`components/ui/LiteraryDecor.tsx` dosyası oluşturulmuş olmalı. TypeScript hata yok:

```bash
npx tsc --noEmit
```

Beklenen: Çıktı yok (hata yok).

- [ ] **Step 3: Commit**

```bash
git add components/ui/LiteraryDecor.tsx
git commit -m "feat: add literary SVG decoration components"
```

---

### Task 2: Landing page'e yerleştirme

**Files:**
- Modify: `app/(public)/page.tsx`

**Interfaces:**
- Consumes: `QuillSVG`, `OpenBookSVG`, `InkwellSVG`, `PenNibSVG`, `InkDotsSVG` from `@/components/ui/LiteraryDecor`

Placement haritası:
| Motif | Section | Position class'ları |
|-------|---------|-------------------|
| `QuillSVG` | HERO (line 126) | `absolute right-4 sm:right-12 top-16 w-24 h-[140px] text-white/[0.11] rotate-[-15deg] z-0 hidden sm:block` |
| `InkDotsSVG` | ROOT wrapper (line 115) | `absolute inset-0 w-full h-full text-white/[0.09] z-0 pointer-events-none hidden sm:block` |
| `OpenBookSVG` | FEATURES (line 522) | `absolute left-4 top-1/2 -translate-y-1/2 w-20 h-16 text-white/[0.10] rotate-[8deg] z-0 hidden md:block` |
| `InkwellSVG` | STATS (line 324) | `absolute right-8 bottom-6 w-16 h-[75px] text-white/[0.11] rotate-[5deg] z-0 hidden sm:block` |
| `PenNibSVG` | CTA (line 620) | `absolute left-8 bottom-10 w-14 h-[78px] text-white/[0.12] rotate-[-20deg] z-0 hidden sm:block` |

- [ ] **Step 1: Import ekle**

`app/(public)/page.tsx` dosyasının import bloğuna ekle (diğer importların altına):

```tsx
import { QuillSVG, OpenBookSVG, InkwellSVG, PenNibSVG, InkDotsSVG } from '@/components/ui/LiteraryDecor'
```

- [ ] **Step 2: HERO section — QuillSVG ekle**

`app/(public)/page.tsx` line 126'daki hero section açılış tagının hemen içine, ilk `<motion.div>` öncesine ekle:

```tsx
{/* Literary decor */}
<div aria-hidden="true" className="absolute right-4 sm:right-12 top-16 w-24 h-[140px] text-white/[0.11] rotate-[-15deg] z-0 pointer-events-none select-none hidden sm:block">
  <QuillSVG />
</div>
```

- [ ] **Step 3: ROOT wrapper — InkDotsSVG ekle**

`app/(public)/page.tsx` line 115'teki root div içinde, mevcut arka plan ambient div'inin (`aria-hidden="true" className="absolute inset-0..."`) hemen kapanmasından sonra ekle:

```tsx
{/* Ink dots scattered */}
<div aria-hidden="true" className="absolute inset-0 w-full h-full text-white/[0.09] z-0 pointer-events-none select-none hidden sm:block overflow-hidden">
  <InkDotsSVG />
</div>
```

- [ ] **Step 4: FEATURES section — OpenBookSVG ekle**

Line 522'deki features section (`<section className="relative py-24 px-4 border-t...">`) açılış tagının hemen içine ekle:

```tsx
{/* Literary decor */}
<div aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 w-20 h-16 text-white/[0.10] rotate-[8deg] z-0 pointer-events-none select-none hidden md:block">
  <OpenBookSVG />
</div>
```

- [ ] **Step 5: STATS section — InkwellSVG ekle**

Line 324'teki stats section (`<section className="relative py-16 px-4 bg-black/[0.15]">`) açılış tagının hemen içine ekle:

```tsx
{/* Literary decor */}
<div aria-hidden="true" className="absolute right-8 bottom-6 w-16 h-[75px] text-white/[0.11] rotate-[5deg] z-0 pointer-events-none select-none hidden sm:block">
  <InkwellSVG />
</div>
```

- [ ] **Step 6: CTA section — PenNibSVG ekle**

Line 620'deki CTA section (`<section className="relative py-28 px-4 border-t...">`) açılış tagının hemen içine ekle:

```tsx
{/* Literary decor */}
<div aria-hidden="true" className="absolute left-8 bottom-10 w-14 h-[78px] text-white/[0.12] rotate-[-20deg] z-0 pointer-events-none select-none hidden sm:block">
  <PenNibSVG />
</div>
```

- [ ] **Step 7: TypeScript kontrol**

```bash
npx tsc --noEmit
```

Beklenen: Çıktı yok (hata yok).

- [ ] **Step 8: Görsel kontrol**

`npm run dev` çalışıyorsa `localhost:3000` aç:
- Hero section sağ üstte ince tüy kalem görünmeli
- Sayfayı kaydırınca features section solunda açık kitap
- Stats section sağında hokka
- CTA section solunda kalem ucu
- Arka planda dağınık nokta dokusu
- Hiçbiri içerik üstüne çıkmamalı
- Mobilde (< 640px) hiçbiri görünmemeli

- [ ] **Step 9: Commit**

```bash
git add app/\(public\)/page.tsx
git commit -m "feat: place literary SVG decorations on landing page"
git push origin main
```
