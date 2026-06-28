# Literary Decorations — Landing Page

**Tarih:** 2026-06-27  
**Kapsam:** `app/(public)/page.tsx` — sadece landing page  
**Hedef:** Yazarlık temasıyla uyumlu, göz yormayan dekoratif SVG motifler

---

## Özet

Landing page'e 5 adet temiz line art SVG motif eklenir. Orta ağırlık
(%10–15 opacity), pointer-events yok, aria-hidden. Mobilde gizli.

---

## Motifler

| ID | İsim | SVG Export | Boyut | Opacity |
|----|------|-----------|-------|---------|
| 1 | Tüy kalem | `QuillSVG` | 120px | 12% |
| 2 | Açık kitap | `OpenBookSVG` | 90px | 10% |
| 3 | Hokka | `InkwellSVG` | 80px | 11% |
| 4 | Kalem ucu | `PenNibSVG` | 70px | 13% |
| 5 | Mürekkep noktaları | `InkDotsSVG` | çeşitli | 8–14% |

---

## Yerleşim

```
HERO section (relative wrapper mevcuttur)
  → QuillSVG     : absolute right-8 top-24, rotate-[-15deg], hidden sm:block
  → InkDotsSVG   : 8 rastgele nokta, absolute, dağınık

FEATURES section
  → OpenBookSVG  : absolute left-4 top-1/2, rotate-[8deg], hidden md:block

STATS / DEMO section  
  → InkwellSVG   : absolute right-8 bottom-8, rotate-[5deg], hidden sm:block

CTA section
  → PenNibSVG    : absolute left-8 bottom-12, rotate-[-20deg], hidden sm:block
```

---

## Dosya Yapısı

```
components/ui/LiteraryDecor.tsx   ← tüm SVG export'ları
app/(public)/page.tsx             ← import + placement
```

---

## Teknik Kısıtlar

- `pointer-events-none` + `aria-hidden="true"` zorunlu
- `select-none` eklenecek
- Tüm section wrapper'ları `relative` olmalı (yoksa eklenir)
- `z-0` — içerik üstüne çıkmaz
- Mevcut arka plan blob'larıyla aynı `aria-hidden` div içine alınmaz;
  kendi bağımsız absolute elemanları olarak durur
- SVG'ler saf `stroke` tabanlı — fill yok, `currentColor` ile renk alır,
  `text-white/[0.12]` gibi Tailwind utility ile opacity ayarlanır

---

## Renk / Stil

- Stroke: `currentColor` (white)
- Opacity: Tailwind `text-white/[0.10]` → `text-white/[0.14]` arası
- Stroke-width: 1–1.5 (ince, zarif)
- Fill: none
- Stroke-linecap: round, stroke-linejoin: round
