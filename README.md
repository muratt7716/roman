<div align="center">

# ✍️ Writer Squad

**Yazarların buluştuğu, birlikte roman yazdığı kolaboratif platform.**

[![Next.js](https://img.shields.io/badge/Next.js-16.2.6-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.x-38BDF8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?style=flat-square&logo=vercel)](https://vercel.com)

</div>

---

## 📖 Proje Hakkında

**Writer Squad**, yazarların bir araya gelerek ortak roman projeleri oluşturduğu, bölüm bölüm yazdığı ve birbirinin yazılarını geliştirdiği modern bir kolaborasyon platformudur.

Bir roman fikrin mi var ama yalnız yazmak zor mu geliyor? Farklı yazarların seslerini bir araya getirerek eşsiz hikayeler yaratmak mı istiyorsun? Writer Squad tam da bu ihtiyaç için tasarlandı.

---

## ✨ Özellikler

### 👥 Kolaborasyon
- **Proje Oluşturma** — Yeni roman projeleri başlat, ekip üyelerini davet et
- **Başvuru Sistemi** — Açık projelere başvur, yazarlar ekibini seç
- **Rol Yönetimi** — Proje sahibi ve ortak yazar rolleri
- **Davet Sistemi** — Yazarları doğrudan projeye davet et

### 📝 Yazım Araçları
- **Zengin Metin Editörü** — Tiptap tabanlı, profesyonel yazım deneyimi
  - Kalın, italik, altı çizili, üst/alt simge
  - Font ailesi ve renk seçimi
  - Metin hizalama
  - Bağlantı ekleme
  - Karakter sayacı
- **Bölüm Yönetimi** — Sürüm geçmişi ile bölümleri yönet
- **Öneri Sistemi** — Bölümlere yorum ve düzenleme önerileri sun
- **Durum Takibi** — `draft → review → final` akışı

### 🗂️ Proje Araçları
- **Beyin Fırtınası Panosu** — Arsa, karakter, dünya inşası notları
- **Karakter Profilleri** — Detaylı karakter sayfaları oluştur
- **Zaman Çizelgesi** — Olayları kronolojik olarak takip et

### 🔔 Sosyal
- **Bildirim Sistemi** — Başvurular, yorumlar ve davetler için anlık bildirimler
- **Yazar Profilleri** — Portfolio bağlantısı ve yazım durumu
- **Keşfet** — Katılmak için açık projeleri bul

---

## 🛠️ Teknoloji Yığını

| Katman | Teknoloji |
|---|---|
| **Framework** | Next.js 16 (App Router) |
| **Dil** | TypeScript 5 |
| **Veritabanı** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth |
| **Storage** | Supabase Storage |
| **Editör** | Tiptap 3 |
| **UI** | shadcn/ui + Tailwind CSS 4 |
| **Animasyon** | Framer Motion |
| **Form** | React Hook Form + Zod |
| **State** | Zustand |
| **Deploy** | Vercel |

---

## 🚀 Kurulum

### Gereksinimler
- Node.js 18+
- npm / yarn / pnpm
- Supabase hesabı

### 1. Repoyu Klonla

```bash
git clone https://github.com/muratt7716/roman.git
cd roman
```

### 2. Bağımlılıkları Yükle

```bash
npm install
```

### 3. Environment Variables

`.env.local` dosyası oluştur:

```bash
cp .env.local.example .env.local
```

`.env.local` içini doldur:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Veritabanı Kurulumu

Supabase SQL Editor'a `supabase/schema.sql` dosyasının içeriğini yapıştır ve çalıştır.

### 5. Geliştirme Sunucusunu Başlat

```bash
npm run dev
```

Tarayıcıda [http://localhost:3000](http://localhost:3000) adresini aç.

---

## 📁 Proje Yapısı

```
roman/
├── app/
│   ├── (app)/              # Kimlik doğrulaması gereken sayfalar
│   │   ├── dashboard/      # Ana panel
│   │   ├── projects/       # Proje detay & editör
│   │   ├── notifications/  # Bildirimler
│   │   └── settings/       # Kullanıcı ayarları
│   ├── (auth)/             # Giriş / kayıt sayfaları
│   └── (public)/           # Genel erişimli sayfalar
├── components/             # Yeniden kullanılabilir UI bileşenleri
├── lib/                    # Yardımcı fonksiyonlar & Supabase client
├── stores/                 # Zustand global state
├── types/                  # TypeScript tip tanımları
├── supabase/
│   └── schema.sql          # Tam veritabanı şeması
└── public/                 # Statik dosyalar
```

---

## 🗄️ Veritabanı Şeması

```
profiles          → Yazar profilleri
projects          → Roman projeleri
project_members   → Proje üyelikleri
project_invites   → Davetler
chapters          → Bölümler
chapter_versions  → Sürüm geçmişi
chapter_suggestions → Düzenleme önerileri
applications      → Proje başvuruları
brainstorm_notes  → Beyin fırtınası notları
character_profiles→ Karakter sayfaları
timeline_events   → Zaman çizelgesi olayları
notifications     → Bildirimler
```

---

## 📜 Lisans

Bu proje özel kullanım içindir. Tüm haklar saklıdır.

---

<div align="center">

**Writer Squad** — *Hikayeler birlikte yazılır.*

</div>
