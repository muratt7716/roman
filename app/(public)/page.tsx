import Link from 'next/link'
import {
  Users,
  Zap,
  BookOpen,
  PenLine,
  Star,
  GitBranch,
  ArrowRight,
  Plus,
  ArrowUpRight,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AnimatedHero } from '@/components/home/AnimatedHero'
import { AnimatedCounter } from '@/components/home/AnimatedCounter'
import { SpotlightCursor } from '@/components/home/SpotlightCursor'
import { Reveal } from '@/components/home/Reveal'
import { EditorialPicksSection } from '@/components/home/EditorialPicksSection'

export const dynamic = 'force-dynamic'

const FEATURES = [
  {
    icon: Users,
    title: 'Gerçek Zamanlı Ortak Yazarlık',
    desc: 'Ekibinizle veya diğer yazarlarla aynı anda yazın. Cümlelerin ve fikirlerin canlı olarak nasıl şekillendiğini izleyin.',
    color: 'from-violet-500/10 to-purple-500/5',
    iconColor: 'text-violet-400',
  },
  {
    icon: GitBranch,
    title: 'Rol Tabanlı Görev Dağılımı',
    desc: 'Dünya tasarımcısı, diyalog yazarı veya kurgu koordinatörü... Her yazar kendi alanında uzmanlaşır.',
    color: 'from-pink-500/10 to-rose-500/5',
    iconColor: 'text-pink-400',
  },
  {
    icon: BookOpen,
    title: 'Gelişmiş Lore Evreni',
    desc: 'Karakter kartları, yerleşim yerleri ve sihir sistemleri için ortak bir wiki kütüphanesi oluşturun.',
    color: 'from-sky-500/10 to-blue-500/5',
    iconColor: 'text-sky-400',
  },
  {
    icon: Zap,
    title: 'Akıllı Sürüm Kontrolü',
    desc: 'Yazarlar arası çatışmaları otomatik önleyen, her paragrafın geçmişini tutan yazara özel versiyon takip sistemi.',
    color: 'from-amber-500/10 to-yellow-500/5',
    iconColor: 'text-amber-400',
  },
  {
    icon: Star,
    title: 'Portfolyo ve Başvuru',
    desc: 'Hazırladığınız karakter veya diyalog portfolyoları ile en prestijli ortak projelerin ekiplerine başvurun.',
    color: 'from-emerald-500/10 to-green-500/5',
    iconColor: 'text-emerald-400',
  },
  {
    icon: PenLine,
    title: 'Zarif Okuyucu Arayüzü',
    desc: 'Tamamlanan bölümlerinizi göz yormayan, modern ve şık bir tipografi düzeniyle anında okurlarla buluşturun.',
    color: 'from-indigo-500/10 to-violet-500/5',
    iconColor: 'text-indigo-400',
  },
]

interface AuthorPreview {
  id: string
  username: string
  display_name: string | null
  avatar_url: string | null
}

export default async function HomePage() {
  let isLoggedIn = false
  let stats = { writers: 0, projects: 0, chapters: 0, words: 0 }
  let authors: AuthorPreview[] = []

  try {
    const supabase = await createClient()

    const [
      { data: { user } },
      { count: writersCount },
      { count: projectsCount },
      { count: chaptersCount },
      { data: wordRows },
      { data: authorRows },
    ] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('projects').select('*', { count: 'exact', head: true }),
      supabase.from('chapters').select('*', { count: 'exact', head: true }),
      supabase.from('projects').select('current_word_count'),
      supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url')
        .order('reputation_score', { ascending: false })
        .limit(8),
    ])

    isLoggedIn = !!user
    stats = {
      writers: writersCount ?? 0,
      projects: projectsCount ?? 0,
      chapters: chaptersCount ?? 0,
      words: (wordRows ?? []).reduce(
        (sum, r) => sum + ((r as { current_word_count: number | null }).current_word_count ?? 0),
        0
      ),
    }
    authors = (authorRows as AuthorPreview[] | null) ?? []
  } catch {
    // Supabase yapılandırılmamış — statik fallback ile devam et
  }

  const STATS = [
    { value: stats.writers, label: 'Kayıtlı Yazar', suffix: '' },
    { value: stats.projects, label: 'Kurgu Evreni', suffix: '' },
    { value: stats.chapters, label: 'Yazılan Bölüm', suffix: '' },
    { value: stats.words, label: 'Toplam Kelime', suffix: '' },
  ]

  return (
    <div className="relative min-h-screen bg-background text-foreground selection:bg-primary/30 selection:text-white overflow-x-clip">
      {/* Mouse spotlight — sadece desktop */}
      <SpotlightCursor />

      {/* ── SİNEMATİK HERO ── */}
      <AnimatedHero isLoggedIn={isLoggedIn} />

      {/* ── DIVIDER: curved SVG ── */}
      <div aria-hidden="true" className="relative h-14 sm:h-20 -mt-px">
        <svg
          viewBox="0 0 1440 96"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
        >
          <path
            d="M0,0 C360,96 1080,96 1440,0 L1440,96 L0,96 Z"
            fill="rgba(255,255,255,0.015)"
          />
        </svg>
      </div>

      {/* ── STATS — büyük rakamlar + animated counter ── */}
      <section className="relative py-20 sm:py-28 px-4 bg-white/[0.015] border-y border-white/[0.04]">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-14">
            <span className="text-primary text-[11px] font-semibold tracking-[0.25em] uppercase">
              Rakamlarla Kalem Birliği
            </span>
          </Reveal>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-6">
            {STATS.map((s, i) => (
              <Reveal key={s.label} delay={i * 0.1} className="text-center">
                <p className="font-display font-semibold text-4xl sm:text-5xl md:text-6xl text-white tracking-tight tabular-nums">
                  <AnimatedCounter value={s.value} suffix={s.suffix} />
                </p>
                <div className="mx-auto mt-4 h-px w-10 bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
                <p className="mt-3 text-[11px] sm:text-xs text-muted-foreground tracking-[0.2em] uppercase">
                  {s.label}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── EDİTÖRYAL SEÇKİ — yatay scroll carousel ── */}
      <EditorialPicksSection />

      {/* ── FEATURES — staggered reveal grid ── */}
      <section className="relative py-24 sm:py-32 px-4 border-t border-white/[0.04]">
        {/* Ambient glow */}
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[10%] right-[10%] w-[480px] h-[480px] rounded-full bg-violet-600/[0.05] blur-[120px]" />
          <div className="absolute bottom-[5%] left-[5%] w-[420px] h-[420px] rounded-full bg-amber-500/[0.03] blur-[110px]" />
        </div>

        <div className="relative max-w-6xl mx-auto">
          <Reveal className="mb-16 max-w-2xl">
            <span className="text-primary text-[11px] font-semibold tracking-[0.25em] uppercase">
              Neden Kalem Birliği
            </span>
            <h2 className="mt-4 font-display font-semibold text-3xl sm:text-4xl md:text-5xl text-white tracking-tight leading-tight">
              Karmaşık Değil,
              <br />
              <span className="text-gradient">Tam Da Yazarın İhtiyacı Olanlar</span>
            </h2>
            <p className="mt-5 text-sm sm:text-base text-muted-foreground leading-relaxed">
              Gereksiz düğmeleri ve ayarları kaldırarak doğrudan yazma odağınızı koruyoruz.
              Her özellik, ortak kurgu üretiminin gerçek ihtiyaçlarından doğdu.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.07}>
                <div className="group h-full rounded-2xl bg-white/[0.02] border border-white/[0.05] p-6 sm:p-7 backdrop-blur-sm transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1.5 hover:border-white/[0.12] hover:bg-white/[0.03] hover:shadow-[0_24px_50px_-12px_rgba(0,0,0,0.6),0_0_30px_rgba(139,92,246,0.08)]">
                  <div
                    className={cn(
                      'w-11 h-11 rounded-xl bg-gradient-to-br flex items-center justify-center mb-5 transition-transform duration-500 group-hover:scale-110',
                      f.color
                    )}
                  >
                    <f.icon className={cn('w-5 h-5', f.iconColor)} />
                  </div>
                  <h3 className="font-medium text-base text-white">{f.title}</h3>
                  <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── YAZARLAR — minimal avatar stack ── */}
      {authors.length > 0 && (
        <section className="relative py-24 sm:py-32 px-4 border-t border-white/[0.04] bg-white/[0.01]">
          <div className="max-w-4xl mx-auto text-center">
            <Reveal>
              <span className="text-primary text-[11px] font-semibold tracking-[0.25em] uppercase">
                Topluluk
              </span>
              <h2 className="mt-4 font-display font-semibold text-3xl sm:text-4xl md:text-5xl text-white tracking-tight">
                Kalemi Güçlü Yazarlarla Tanışın
              </h2>
              <p className="mt-5 text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
                Kendinize uygun evren tasarım ortakları bulun, aktif kurgu çalışmalarına katılın.
              </p>
            </Reveal>

            <Reveal delay={0.15} className="mt-10 flex items-center justify-center">
              <div className="flex -space-x-3.5">
                {authors.map(a => (
                  <Link
                    key={a.id}
                    href={`/u/${a.username}`}
                    title={a.display_name ?? a.username}
                    className="block rounded-full transition-transform duration-300 hover:-translate-y-1.5 hover:z-10 relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Avatar className="w-12 h-12 sm:w-14 sm:h-14 ring-2 ring-background border border-white/[0.1]">
                      <AvatarImage src={a.avatar_url ?? undefined} className="object-cover" />
                      <AvatarFallback className="bg-primary/20 text-primary text-sm font-semibold">
                        {(a.display_name ?? a.username)[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                ))}
              </div>
            </Reveal>

            <Reveal delay={0.25} className="mt-8">
              <Link
                href="/writers"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-accent transition-colors"
              >
                Tüm yazarları keşfet <ArrowUpRight className="w-4 h-4" />
              </Link>
            </Reveal>
          </div>
        </section>
      )}

      {/* ── CTA ── */}
      <section className="relative py-28 sm:py-36 px-4 border-t border-white/[0.04] overflow-hidden">
        <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[640px] h-[380px] bg-violet-600/[0.07] rounded-full blur-[110px]" />
        </div>

        <Reveal className="relative max-w-4xl mx-auto text-center">
          {isLoggedIn ? (
            <>
              <h2 className="font-display font-semibold text-4xl sm:text-5xl md:text-6xl leading-tight text-white tracking-tight">
                Kaldığın Yerden <span className="text-gradient">Devam Et</span>
              </h2>
              <p className="mt-6 text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Projelerine dön, yeni bir bölüm yaz ya da ekibinle birlikte evreni genişlet.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/dashboard"
                  className={cn(
                    buttonVariants({ size: 'lg' }),
                    'w-full sm:w-auto bg-primary hover:bg-primary/90 text-white px-8 py-6 rounded-xl font-semibold shadow-[0_0_40px_rgba(139,92,246,0.35)] hover:shadow-[0_0_60px_rgba(139,92,246,0.5)] transition-all duration-300 gap-2'
                  )}
                >
                  <PenLine className="w-4 h-4" /> Panele Git
                </Link>
                <Link
                  href="/projects/new"
                  className={cn(
                    buttonVariants({ variant: 'outline', size: 'lg' }),
                    'w-full sm:w-auto text-muted-foreground hover:text-white px-8 py-6 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-300 gap-2'
                  )}
                >
                  <Plus className="w-4 h-4" /> Yeni Proje Oluştur
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="font-display font-semibold text-4xl sm:text-5xl md:text-6xl leading-tight text-white tracking-tight">
                Kelimeniz <span className="text-gradient">Yarım Kalmasın</span>
              </h2>
              <p className="mt-6 text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Hemen şimdi kaydolun, ilk ortak evreninizi yaratın ve kalemi güçlü diğer
                yazarlar ile birlikte kurgular oluşturmaya başlayın.
              </p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  href="/signup"
                  className={cn(
                    buttonVariants({ size: 'lg' }),
                    'w-full sm:w-auto bg-primary hover:bg-primary/90 text-white px-8 py-6 rounded-xl font-semibold shadow-[0_0_40px_rgba(139,92,246,0.35)] hover:shadow-[0_0_60px_rgba(139,92,246,0.5)] transition-all duration-300 gap-2'
                  )}
                >
                  Hemen Ücretsiz Başla <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <p className="mt-5 text-[11px] text-muted-foreground/60">
                Kurulum veya kredi kartı bilgisi gerekmez · Tüm temel özellikler ücretsizdir
              </p>
            </>
          )}
        </Reveal>
      </section>

      {/* ── FOOTER — büyük brand, minimal linkler ── */}
      <footer className="relative border-t border-white/[0.04] pt-16 pb-28 sm:pb-14 px-4 overflow-hidden">
        <div className="max-w-6xl mx-auto">
          {/* Minimal link rows */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-14">
            <div className="flex items-center gap-2.5">
              <img
                src="/logo.png"
                className="w-7 h-7 rounded-lg object-cover border border-white/[0.08]"
                alt="Kalem Birliği Logo"
              />
              <span className="font-display font-semibold text-white">Kalem Birliği</span>
            </div>
            <nav className="flex flex-wrap items-center justify-center gap-x-7 gap-y-3 text-xs text-muted-foreground">
              <Link href="/explore" className="hover:text-white transition-colors">Evrenleri Keşfet</Link>
              <Link href="/writers" className="hover:text-white transition-colors">Yazarlar</Link>
              <Link href="/explore?status=open" className="hover:text-white transition-colors">Yazarlık Başvurusu</Link>
              <Link href="/login" className="hover:text-white transition-colors">Giriş Yap</Link>
              <Link href="/signup" className="hover:text-white transition-colors">Kayıt Ol</Link>
            </nav>
          </div>

          {/* Giant brand wordmark */}
          <div aria-hidden="true" className="select-none pointer-events-none text-center leading-none">
            <span className="font-display font-bold tracking-tight text-[16vw] sm:text-[13vw] lg:text-[10rem] bg-gradient-to-b from-white/[0.09] via-white/[0.04] to-transparent bg-clip-text text-transparent whitespace-nowrap">
              KALEM BİRLİĞİ
            </span>
          </div>

          <div className="mt-10 pt-6 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-muted-foreground/70">
            <span>© 2026 Kalem Birliği. Tüm hakları saklıdır.</span>
            <div className="flex items-center gap-5">
              <a href="#" className="hover:text-white transition-colors">Kullanım Koşulları</a>
              <a href="#" className="hover:text-white transition-colors">Gizlilik Politikası</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
