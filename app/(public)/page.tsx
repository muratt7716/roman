'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Users, Zap, BookOpen, PenLine, Star, GitBranch } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const ease = [0.16, 1, 0.3, 1] as const

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease, delay },
})

const FEATURES = [
  { icon: Users,     title: 'Gerçek Zamanlı İşbirliği',  desc: 'Ekibinizle aynı anda yazın. Kimin ne yazdığını canlı olarak takip edin. Çatışma yok, sadece yaratıcılık.',    color: 'from-violet-500/20 to-purple-500/5' },
  { icon: GitBranch, title: 'Rol Tabanlı Yazarlık',       desc: 'Her yazar kendi rolünde uzmanlaşır. Diyalog yazarı, dünya inşacısı, lore uzmanı — hepsi bir arada.',          color: 'from-pink-500/20 to-rose-500/5' },
  { icon: BookOpen,  title: 'Canlı Hikâye Evreni',        desc: 'Karakter wiki, zaman çizelgesi ve beyin fırtınası panosu ile hikâye evreninizi canlı tutun.',                  color: 'from-sky-500/20 to-blue-500/5' },
  { icon: Zap,       title: 'Akıllı Sürüm Takibi',        desc: 'Her kaydetme bir versiyon oluşturur. İstediğiniz noktaya dönün. Hiçbir kelimeyi kaybetmeyin.',                color: 'from-amber-500/20 to-yellow-500/5' },
  { icon: Star,      title: 'Başvuru Sistemi',             desc: 'Harika yazarları keşfedin. Projelerinize en iyi ekip arkadaşlarını seçin. Portfolyo ile başvurun.',           color: 'from-emerald-500/20 to-green-500/5' },
  { icon: PenLine,   title: 'Yayınlama Akışı',            desc: 'Projeniz hazır olduğunda dünyayla paylaşın. Okuyucular için zarif bir okuma deneyimi.',                       color: 'from-indigo-500/20 to-violet-500/5' },
]

const STATS = [
  { value: '10K+', label: 'Yazar' },
  { value: '2.4M', label: 'Kelime Yazıldı' },
  { value: '840+', label: 'Aktif Proje' },
  { value: '4.9★', label: 'Ortalama Puan' },
]

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden">

      {/* HERO */}
      <section className="relative min-h-dvh flex flex-col items-center justify-center px-4 text-center">
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="blob absolute -top-40 left-1/4 w-[500px] h-[500px] bg-violet-600/10" />
          <div className="blob absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-purple-500/8" />
          <div className="blob absolute bottom-0 left-1/3 w-[600px] h-[400px] bg-indigo-500/6" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(124,58,237,0.12),transparent)]" />
        </div>

        <motion.div {...fadeUp(0)} className="mb-8">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium glass border border-primary/20 text-primary">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Yazarlara Özel Platform — Beta
          </span>
        </motion.div>

        <motion.h1 {...fadeUp(0.1)} className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-bold leading-[1.05] tracking-tight max-w-5xl">
          Hikâyeler{' '}<span className="text-gradient">Birlikte</span><br />Yazılmak İçin
        </motion.h1>

        <motion.p {...fadeUp(0.2)} className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl leading-relaxed">
          Dünyanın dört bir yanından yazarları bir araya getiren gerçek zamanlı işbirliği platformu. Hikâyenizi birlikte inşa edin.
        </motion.p>

        <motion.div {...fadeUp(0.3)} className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/signup"
            className={cn(buttonVariants({ size: 'lg' }), 'bg-primary hover:bg-primary/90 text-white px-8 py-3.5 text-base font-semibold rounded-xl shadow-[0_0_30px_rgba(124,58,237,0.4)] hover:shadow-[0_0_40px_rgba(124,58,237,0.6)] transition-all duration-300')}
          >
            Ücretsiz Başla <ArrowRight className="ml-2 w-4 h-4" />
          </Link>
          <Link
            href="/explore"
            className={cn(buttonVariants({ variant: 'ghost', size: 'lg' }), 'text-muted-foreground hover:text-foreground px-8 py-3.5 text-base rounded-xl border border-border hover:border-primary/30 transition-all duration-300')}
          >
            Projeleri Keşfet
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <div className="w-5 h-8 rounded-full border border-border flex items-start justify-center pt-1.5">
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }} className="w-1 h-1.5 rounded-full bg-primary" />
          </div>
        </motion.div>
      </section>

      {/* STATS */}
      <section className="relative py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border rounded-2xl overflow-hidden">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, ease, delay: i * 0.08 }}
                className="bg-surface p-8 text-center"
              >
                <p className="text-3xl sm:text-4xl font-display font-bold text-gradient">{s.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="relative py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease }}
            className="text-center mb-16"
          >
            <p className="text-primary text-sm font-medium tracking-widest uppercase mb-3">Platform Özellikleri</p>
            <h2 className="text-4xl sm:text-5xl font-display font-bold">Yazarlık için tasarlandı</h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">Her özellik, birlikte yazmanın getirdiği zorlukları çözmek için kurgulandı.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.55, ease, delay: i * 0.07 }}
                whileHover={{ y: -4, transition: { duration: 0.25, ease } }}
                className="glass-card rounded-2xl p-6 group cursor-default"
              >
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110`}>
                  <f.icon className="w-5 h-5 text-foreground" />
                </div>
                <h3 className="font-semibold text-base mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-32 px-4">
        <div aria-hidden className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[400px] bg-violet-600/8 rounded-full blur-[100px]" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease }}
          className="relative max-w-3xl mx-auto text-center"
        >
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold leading-tight">
            Hikâyeni yazmaya <span className="text-gradient">bugün başla</span>
          </h2>
          <p className="mt-6 text-muted-foreground text-lg">Yüzlerce yazar seni bekliyor. Ekibini kur, projeyi oluştur, yazmaya başla.</p>
          <div className="mt-10">
            <Link
              href="/signup"
              className={cn(buttonVariants({ size: 'lg' }), 'bg-primary hover:bg-primary/90 text-white px-10 py-4 text-base font-semibold rounded-xl shadow-[0_0_40px_rgba(124,58,237,0.5)] hover:shadow-[0_0_60px_rgba(124,58,237,0.7)] transition-all duration-300')}
            >
              Ücretsiz Hesap Oluştur <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">Kredi kartı gerekmez · Sonsuza kadar ücretsiz plan</p>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-display font-bold">
            <PenLine className="w-4 h-4 text-primary" />
            <span className="text-gradient">Kalem Birliği</span>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 Kalem Birliği. Tüm hakları saklıdır.</p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/explore" className="hover:text-foreground transition-colors">Keşfet</Link>
            <Link href="/login" className="hover:text-foreground transition-colors">Giriş</Link>
            <Link href="/signup" className="hover:text-foreground transition-colors">Kayıt Ol</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
