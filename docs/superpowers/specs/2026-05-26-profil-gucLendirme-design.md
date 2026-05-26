# Profil Sayfası Güçlendirme — Tasarım Dokümanı

## Genel Bakış

**Amaç:** `/u/[username]` profil sayfasına eksik sosyal ve yazarlık bileşenleri eklemek. Faz 1-5'te biriktirilen veri (rozetler, streak, sprint, takipçiler) profilde görünür hale gelsin.

**Stack:** Next.js 16 App Router · Supabase · TypeScript · Tailwind v4 · shadcn/ui

---

## Mevcut Durum

Profil sayfası şunları gösteriyor:
- Avatar, isim, bio, portfolio URL
- Yazarlık durumu badge'i, prestij puanı
- 3 stat: sahip olunan proje sayısı, katkı sayısı, aktif rol sayısı
- Sahip olunan projeler grid'i
- Katkı sağladığı projeler listesi

## Eksikler

| Eksik | Kaynak tablo | Bileşen |
|-------|-------------|---------|
| Takip et / Takip bırak butonu | `follows` | `FollowButton` (hazır) |
| Takipçi / takip edilen sayısı | `follows` | Inline stat |
| Kazanılan rozetler | `user_badges` | `BadgesGrid` (hazır) |
| Streak rekoru | `user_writing_goals.streak_best` | Inline stat |
| Tamamlanan sprint sayısı | `sprint_participants.finished_at IS NOT NULL` | Inline stat |

---

## 1. Stats Satırı Genişletme

Mevcut 3 stat (proje, katkı, rol) → 5 stat:

```
Proje Sahibi | Katkı | Takipçi | 🔥 En Uzun Seri | ⚡ Sprint
```

Takipçi sayısına tıklanabilirlik yok (liste sayfası kapsam dışı).

---

## 2. Takip Butonu

Header bölümünde InviteButton yanına `FollowButton` eklenir. Sadece giriş yapmış + başkasının profilindeyken görünür (mevcut `!isOwnProfile && currentUser` koşulu).

`FollowButton` bileşeni `components/reader/FollowButton.tsx`'te mevcut — import edilip kullanılacak.

---

## 3. Rozetler Bölümü

Stats satırının altına yeni bir section:

```
── ROZETLER ──
[BadgesGrid — sadece kazanılmış rozetler, gri/soluk olanlar gizli]
```

Hiç rozet kazanılmamışsa section gösterilmez.

`BadgesGrid` bileşeni `components/profile/BadgesGrid.tsx`'te mevcut — earned badges filtrelenerek kullanılır.

---

## 4. Veri Modeli — Yeni Sorgular

`app/(public)/u/[username]/page.tsx` içine eklenen Promise.all'a:

```typescript
// Takipçi sayısı
supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profile.id)

// Takip edilen sayısı  
supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profile.id)

// Mevcut kullanıcı takip ediyor mu?
supabase.from('follows').select('follower_id').eq('follower_id', currentUser.id).eq('following_id', profile.id).maybeSingle()  // sadece giriş yapılmışsa

// Rozetler
supabase.from('user_badges').select('*').eq('user_id', profile.id)

// Yazı hedefleri (streak_best)
supabase.from('user_writing_goals').select('streak_best').eq('user_id', profile.id).maybeSingle()

// Sprint sayısı
supabase.from('sprint_participants').select('sprint_id', { count: 'exact', head: true }).eq('user_id', profile.id).not('finished_at', 'is', null)
```

---

## 5. Değiştirilen Dosyalar

```
app/(public)/u/[username]/page.tsx   — 6 yeni query + FollowButton + stats genişletme + BadgesGrid section
```

Yeni dosya yok. Tüm bileşenler hazır.

---

## Kapsam Dışı

- Takipçi / takip edilen listesi sayfası
- Profil düzenleme (Settings'te zaten var)
- Aktivite akışı / zaman çizelgesi
- Mesajlaşma
