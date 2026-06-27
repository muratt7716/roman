'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  Users,
  Zap,
  BookOpen,
  PenLine,
  Star,
  GitBranch,
  MessageSquare,
  Sparkles,
  Clock,
  User,
  Check,
  Layers,
  ChevronRight,
  Send,
  Plus
} from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { EditorialPicksSection } from '@/components/home/EditorialPicksSection'
import { createClient } from '@/lib/supabase/client'

const ease = [0.16, 1, 0.3, 1] as const

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, ease, delay },
})

const FEATURES = [
  { 
    icon: Users, 
    title: 'Gerçek Zamanlı Ortak Yazarlık', 
    desc: 'Ekibinizle veya diğer yazarlarla aynı anda yazın. Cümlelerin ve fikirlerin canlı olarak nasıl şekillendiğini izleyin.', 
    color: 'from-violet-500/10 to-purple-500/5', 
    iconColor: 'text-violet-400' 
  },
  { 
    icon: GitBranch, 
    title: 'Rol Tabanlı Görev Dağılımı', 
    desc: 'Dünya tasarımcısı, diyalog yazarı veya kurgu koordinatörü... Her yazar kendi alanında uzmanlaşır.', 
    color: 'from-pink-500/10 to-rose-500/5', 
    iconColor: 'text-pink-400' 
  },
  { 
    icon: BookOpen, 
    title: 'Gelişmiş Lore Evreni', 
    desc: 'Karakter kartları, yerleşim yerleri ve sihir sistemleri için ortak bir wiki kütüphanesi oluşturun.', 
    color: 'from-sky-500/10 to-blue-500/5', 
    iconColor: 'text-sky-400' 
  },
  { 
    icon: Zap, 
    title: 'Akıllı Sürüm Kontrolü', 
    desc: 'Yazarlar arası çatışmaları otomatik önleyen, her paragrafın geçmişini tutan yazara özel versiyon takip sistemi.', 
    color: 'from-amber-500/10 to-yellow-500/5', 
    iconColor: 'text-amber-400' 
  },
  { 
    icon: Star, 
    title: 'Portfolyo ve Başvuru', 
    desc: 'Hazırladığınız karakter veya diyalog portfolyoları ile en prestijli ortak projelerin ekiplerine başvurun.', 
    color: 'from-emerald-500/10 to-green-500/5', 
    iconColor: 'text-emerald-400' 
  },
  { 
    icon: PenLine, 
    title: 'Zarif Okuyucu Arayüzü', 
    desc: 'Tamamlanan bölümlerinizi göz yormayan, modern ve şık bir tipografi düzeniyle anında okurlarla buluşturun.', 
    color: 'from-indigo-500/10 to-violet-500/5', 
    iconColor: 'text-indigo-400' 
  },
]

const STATS = [
  { value: '12K+', label: 'Aktif Yazar', desc: 'Yaratıcı zihin tek bir çatı altında' },
  { value: '3.6M', label: 'Kelime Yazıldı', desc: 'Canlı paylaşılan kurgusal kelimeler' },
  { value: '920+', label: 'Ortak Proje', desc: 'Birlikte yazılan roman ve senaryo' },
  { value: '%98', label: 'Yazar Memnuniyeti', desc: 'Kafa karıştırmayan arayüz tasarımı' },
]

export default function RedesignedLandingPage() {
  const [activeTab, setActiveTab] = useState<'codex' | 'timeline' | 'brainstorm'>('codex')
  const [typewriterText, setTypewriterText] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const fullText = 'Karanlık ormanın derinliklerinde, Aria kayıp tapınağın kapısına ulaştığında rüzgar aniden kesildi. Ellerindeki fenerin titreyen ışığı, kapıdaki kadim rünleri aydınlatıyordu...'

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session)
    })
  }, [])

  useEffect(() => {
    let index = 0
    const interval = setInterval(() => {
      setTypewriterText(fullText.slice(0, index))
      index++
      if (index > fullText.length) {
        setTimeout(() => { index = 0 }, 4000) // pause at the end
      }
    }, 45)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative min-h-screen bg-background text-foreground selection:bg-primary/30 selection:text-white">
      {/* Background ambient light - extremely soft, eye-friendly */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-[-20%] left-[20%] w-[600px] h-[600px] rounded-full bg-violet-600/5 blur-[120px]" />
        <div className="absolute top-[30%] right-[10%] w-[500px] h-[500px] rounded-full bg-indigo-500/3 blur-[100px]" />
        <div className="absolute bottom-[10%] left-[15%] w-[700px] h-[700px] rounded-full bg-purple-600/4 blur-[130px]" />
        {/* Very soft mesh grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.007)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.007)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      {/* ── HERO SECTION ── */}
      <section className="relative pt-24 pb-20 md:pt-32 md:pb-28 px-4 flex flex-col items-center justify-center text-center max-w-7xl mx-auto">
        <motion.div {...fadeUp(0)} className="mb-6">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-white/[0.03] border border-white/[0.08] text-violet-300">
            <Sparkles className="w-3 h-3 text-primary animate-pulse" />
            Yazarlar İçin Tasarlanan En Sade Ortak Kurgu Dünyası
          </span>
        </motion.div>

        <motion.h1 
          {...fadeUp(0.15)} 
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-semibold tracking-tight text-white leading-[1.1] max-w-5xl"
        >
          Hikâyeler <span className="text-gradient">Birlikte</span> <br className="hidden sm:inline" />
          Daha Kolay Yazılır.
        </motion.h1>

        <motion.p 
          {...fadeUp(0.3)} 
          className="mt-6 text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl leading-relaxed font-sans"
        >
          Kafa karıştırıcı araçları geride bırakın. Kalem Birliği, gözü yormayan sade arayüzü ile ekibinizi kurup, canlı kurgu evreninizi tasarlayabileceğiniz gerçek zamanlı ortak yazarlık platformudur.
        </motion.p>

        <motion.div
          {...fadeUp(0.4)}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto px-4"
        >
          {isLoggedIn ? (
            <>
              <Link
                href="/dashboard"
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'w-full sm:w-auto bg-primary hover:bg-primary/90 text-white px-8 py-6 rounded-xl font-medium shadow-[0_0_30px_rgba(124,58,237,0.3)] hover:shadow-[0_0_40px_rgba(124,58,237,0.45)] transition-all duration-300 gap-2 text-base'
                )}
              >
                <PenLine className="w-4 h-4" /> Yazmaya Devam Et
              </Link>
              <Link
                href="/projects/new"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'lg' }),
                  'w-full sm:w-auto text-muted-foreground hover:text-white px-8 py-6 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.15] transition-all duration-300 gap-2 text-base'
                )}
              >
                <Plus className="w-4 h-4" /> Yeni Proje
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/signup"
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'w-full sm:w-auto bg-primary hover:bg-primary/90 text-white px-8 py-6 rounded-xl font-medium shadow-[0_0_30px_rgba(124,58,237,0.3)] hover:shadow-[0_0_40px_rgba(124,58,237,0.45)] transition-all duration-300 gap-2 text-base'
                )}
              >
                Ücretsiz Başla <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/explore"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'lg' }),
                  'w-full sm:w-auto text-muted-foreground hover:text-white px-8 py-6 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.15] transition-all duration-300 text-base'
                )}
              >
                Evrenleri Keşfet
              </Link>
            </>
          )}
        </motion.div>

        {/* Dynamic scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
          className="mt-16 hidden md:flex flex-col items-center gap-2 text-xs text-muted-foreground/60"
        >
          <span>Sistemi Keşfedin</span>
          <div className="w-5 h-8 rounded-full border border-white/[0.1] flex items-start justify-center pt-1.5">
            <motion.div 
              animate={{ y: [0, 8, 0] }} 
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }} 
              className="w-1 h-1.5 rounded-full bg-primary" 
            />
          </div>
        </motion.div>
      </section>

      {/* ── INTERACTIVE SIMULATOR (Live Writing Dashboard) ── */}
      <section className="relative px-4 pb-24 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.8, ease }}
          className="w-full rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-2 sm:p-3 shadow-[0_30px_70px_rgba(0,0,0,0.6)] backdrop-blur-xl"
        >
          {/* Mock Window Title bar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] bg-black/[0.15] rounded-t-xl">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-white/[0.15]" />
              <span className="w-3 h-3 rounded-full bg-white/[0.15]" />
              <span className="w-3 h-3 rounded-full bg-white/[0.15]" />
              <span className="ml-3 text-xs text-muted-foreground/80 font-mono font-medium truncate max-w-[200px] sm:max-w-none">
                roman_evreni / Gölgelerin_Kapisi.docx
              </span>
            </div>
            {/* Live active authors indicator */}
            <div className="flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] text-muted-foreground font-medium hidden sm:inline">2 Yazar Çevrimiçi</span>
              <div className="flex -space-x-1.5 ml-1">
                <div className="w-6 h-6 rounded-full bg-violet-600 border border-background text-[10px] font-bold flex items-center justify-center text-white" title="Elif">E</div>
                <div className="w-6 h-6 rounded-full bg-pink-500 border border-background text-[10px] font-bold flex items-center justify-center text-white" title="Kaan">K</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 min-h-[400px] bg-background/45 rounded-b-xl overflow-hidden">
            {/* Mock Editor Sidebar - highly stylized but simple */}
            <div className="hidden lg:flex flex-col border-r border-white/[0.05] p-4 bg-black/[0.1] space-y-5">
              <div className="space-y-2">
                <span className="text-[10px] font-semibold text-muted-foreground/60 tracking-wider uppercase">Bölümler</span>
                <div className="space-y-1">
                  <div className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06] text-xs font-medium text-white flex items-center justify-between">
                    <span className="truncate">Giriş: Gölgeler</span>
                    <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded">Canlı</span>
                  </div>
                  <div className="px-3 py-2 rounded-lg hover:bg-white/[0.02] text-xs text-muted-foreground/80 cursor-pointer flex items-center justify-between">
                    <span className="truncate">Bölüm 2: Tapınak</span>
                  </div>
                  <div className="px-3 py-2 rounded-lg hover:bg-white/[0.02] text-xs text-muted-foreground/80 cursor-pointer flex items-center justify-between">
                    <span className="truncate">Bölüm 3: Sır</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-semibold text-muted-foreground/60 tracking-wider uppercase">Hızlı Lore Bilgisi</span>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-2 text-[11px]">
                  <div className="flex items-center gap-1.5 text-violet-300 font-medium">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Aria Sterling</span>
                  </div>
                  <p className="text-muted-foreground/80 leading-relaxed">22 yaşında lore büyücüsü. Kadim tapınak rünlerini okuma yeteneğine sahip yegane kişi.</p>
                </div>
              </div>
            </div>

            {/* Mock Writer Workspace Area */}
            <div className="lg:col-span-3 p-6 sm:p-8 flex flex-col justify-between relative bg-black/[0.05]">
              {/* Actual text area simulation */}
              <div className="prose prose-invert max-w-none text-left">
                <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground/70">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Son güncelleme: 3 saniye önce - Elif Demir</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold font-display text-white mb-4">Giriş: Gölgelerin Fısıltısı</h2>
                <div className="relative text-sm sm:text-base text-muted-foreground/90 leading-relaxed font-serif max-w-2xl min-h-[160px]">
                  {/* Typewriter animated text block */}
                  <p className="inline">
                    {typewriterText}
                  </p>
                  
                  {/* Simulated Dynamic Cursor of Kaan */}
                  <span className="inline-block w-0.5 h-5 bg-pink-400 ml-0.5 relative top-0.5 animate-pulse">
                    <span className="absolute left-1 top-[-16px] bg-pink-500 text-white font-sans font-bold text-[8px] px-1 rounded shadow-lg whitespace-nowrap pointer-events-none">
                      Kaan yazıyor...
                    </span>
                  </span>
                </div>
              </div>

              {/* Dynamic Collaboration Comment overlay bottom */}
              <div className="mt-8 border-t border-white/[0.05] pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-violet-600 flex items-center justify-center font-bold text-white text-xs">E</div>
                  <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 text-muted-foreground text-[11px] sm:text-xs">
                    <span className="text-violet-300 font-semibold mr-1">Elif:</span>
                    "Kaan, tapınak sahnesindeki diyalogu biraz daha gerilimli hale getirelim mi?"
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground bg-white/[0.02] border border-white/[0.06] px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-white/[0.04]">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Yanıtla</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── EDITORIAL PICKS ── */}
      <EditorialPicksSection />

      {/* ── STATS SECTION ── */}
      <section className="relative py-16 px-4 bg-black/[0.15]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.6, ease, delay: i * 0.08 }}
                className="bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-colors p-4 sm:p-6 rounded-2xl text-center flex flex-col justify-between"
              >
                <div>
                  <p className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-gradient">{s.value}</p>
                  <p className="text-xs sm:text-sm font-semibold text-white/90 mt-1.5 sm:mt-2">{s.label}</p>
                </div>
                <p className="hidden sm:block text-xs text-muted-foreground mt-2 leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE LORE WORKSPACE HUB ── */}
      <section className="relative py-24 px-4 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <motion.div {...fadeUp(0)}>
            <span className="text-primary text-xs font-semibold tracking-wider uppercase">Evren Tasarım Panosu</span>
            <h2 className="text-3xl sm:text-4xl font-display font-semibold text-white mt-2">
              Sadece Yazmayın; Tüm Evreni Birlikte Tasarlayın
            </h2>
            <p className="mt-4 text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto">
              Hikayenizin lore bilgilerini, kurgusal karakterlerini ve zaman çizelgesini tek bir yerden, karmaşa yaşamadan organize edin.
            </p>
          </motion.div>
        </div>

        {/* Tab selection buttons */}
        <div className="flex justify-center gap-2 p-1 bg-white/[0.02] border border-white/[0.06] rounded-xl max-w-md mx-auto mb-10">
          <button
            onClick={() => setActiveTab('codex')}
            className={cn(
              'flex-1 text-center py-2 text-xs font-medium rounded-lg transition-all duration-300',
              activeTab === 'codex' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-white'
            )}
          >
            Karakter Kartı
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={cn(
              'flex-1 text-center py-2 text-xs font-medium rounded-lg transition-all duration-300',
              activeTab === 'timeline' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-white'
            )}
          >
            Zaman Çizelgesi
          </button>
          <button
            onClick={() => setActiveTab('brainstorm')}
            className={cn(
              'flex-1 text-center py-2 text-xs font-medium rounded-lg transition-all duration-300',
              activeTab === 'brainstorm' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-white'
            )}
          >
            Beyin Fırtınası
          </button>
        </div>

        {/* Active Tab Mockup View */}
        <div className="min-h-[300px] w-full bg-white/[0.01] border border-white/[0.06] rounded-2xl p-6 sm:p-8 flex items-center justify-center backdrop-blur-md">
          <AnimatePresence mode="wait">
            {activeTab === 'codex' && (
              <motion.div
                key="codex"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl"
              >
                {/* Character preview card */}
                <div className="glass-card rounded-2xl p-6 border border-white/[0.08] space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
                      <User className="w-6 h-6 text-violet-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Aria Sterling</h3>
                      <p className="text-xs text-primary font-medium">Büyücü / Lore Arayıcısı</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-xs text-muted-foreground">
                    <div className="flex justify-between border-b border-white/[0.04] pb-1.5">
                      <span>Köken</span>
                      <span className="text-white font-medium">Kadim Sterling Hanedanı</span>
                    </div>
                    <div className="flex justify-between border-b border-white/[0.04] pb-1.5">
                      <span>Büyü Türü</span>
                      <span className="text-white font-medium">Rün Okuma & İllüzyon</span>
                    </div>
                    <div className="flex justify-between pb-1">
                      <span>Zayıflık</span>
                      <span className="text-white font-medium">Gümüş ve Soğuk Demir</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-center space-y-4 text-left">
                  <div className="inline-flex w-7 h-7 rounded-lg bg-violet-500/10 items-center justify-center">
                    <Sparkles className="w-4 h-4 text-violet-400" />
                  </div>
                  <h4 className="text-lg font-semibold text-white">Karakterleri Ortaklaşa Yaratın</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Siz diyalog yazarken, ortak yazarınız karakterin zayıflıklarını, hedeflerini veya köken hikayesini detaylandırabilir. Tüm değişiklikler anında bütün ekibin ekranında güncellenir.
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === 'timeline' && (
              <motion.div
                key="timeline"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl"
              >
                {/* Story Timeline nodes preview */}
                <div className="space-y-4">
                  <div className="relative pl-6 border-l border-white/[0.08] space-y-6 text-left">
                    <div className="relative">
                      <div className="absolute left-[-29px] top-1 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-primary/20" />
                      <span className="text-[10px] text-primary font-semibold uppercase">Evre 1</span>
                      <h5 className="text-xs font-semibold text-white mt-0.5">Gölgelerin Doğuşu</h5>
                      <p className="text-[11px] text-muted-foreground mt-1">Aria rünleri çözer ve antik tapınağın kilidini açar.</p>
                    </div>
                    <div className="relative">
                      <div className="absolute left-[-29px] top-1 w-2.5 h-2.5 rounded-full bg-white/20" />
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase">Evre 2</span>
                      <h5 className="text-xs font-semibold text-white/80 mt-0.5">Kayıp Muhafızlar</h5>
                      <p className="text-[11px] text-muted-foreground mt-1">Tapınağın derinliklerinde bekleyen kadim bekçiler uyanır.</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-center space-y-4 text-left">
                  <div className="inline-flex w-7 h-7 rounded-lg bg-primary/10 items-center justify-center">
                    <Layers className="w-4 h-4 text-primary" />
                  </div>
                  <h4 className="text-lg font-semibold text-white">Zaman Çizelgesini Canlı Tutun</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Kurgunun kronolojisini kaçırmayın. Hangi olayın ne zaman ve nerede yaşandığını ekibinizle ortak bir takvim ve çizelge üzerinden rahatça planlayın.
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === 'brainstorm' && (
              <motion.div
                key="brainstorm"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl"
              >
                {/* Brainstorming card ideas */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/[0.02] border border-white/[0.06] p-4 rounded-xl text-left space-y-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <h6 className="text-[11px] font-semibold text-white">Sihir Kuralları</h6>
                    <p className="text-[10px] text-muted-foreground leading-normal">Büyü yapmak kullanıcının yaşam gücünü mü azaltmalı?</p>
                  </div>
                  <div className="bg-white/[0.02] border border-white/[0.06] p-4 rounded-xl text-left space-y-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-pink-400" />
                    <h6 className="text-[11px] font-semibold text-white">Büyük İhanet</h6>
                    <p className="text-[10px] text-muted-foreground leading-normal">3. Bölümde Aria'nın koruyucusu aslında casus olmalı.</p>
                  </div>
                </div>

                <div className="flex flex-col justify-center space-y-4 text-left">
                  <div className="inline-flex w-7 h-7 rounded-lg bg-pink-500/10 items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-pink-400" />
                  </div>
                  <h4 className="text-lg font-semibold text-white">Ön Kurgu Fikirlerini Paylaşın</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Aklınıza gelen fikirleri kaybetmeyin. Ekibinizle kurguya dair tüm teorileri, beyin fırtınası panosunda renkli kartlarla gruplandırarak tartışın.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section className="relative py-24 px-4 border-t border-white/[0.04] bg-white/[0.01]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-primary text-xs font-semibold tracking-wider uppercase">Teknik Donanım</span>
            <h2 className="text-3xl sm:text-4xl font-display font-semibold text-white mt-2">
              Karmaşık Değil, Tam Da Yazarın İhtiyacı Olanlar
            </h2>
            <p className="mt-4 text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
              Gereksiz düğmeleri ve ayarları kaldırarak doğrudan yazma odağınızı koruyoruz.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, ease, delay: i * 0.06 }}
                className="bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] rounded-2xl p-6 transition-all duration-300 hover:translate-y-[-2px] group text-left flex flex-col justify-between min-h-[220px]"
              >
                <div>
                  <div className={cn(
                    'w-10 h-10 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4 transition-transform group-hover:scale-105 duration-300',
                    f.color
                  )}>
                    <f.icon className={cn('w-5 h-5', f.iconColor)} />
                  </div>
                  <h3 className="font-medium text-sm sm:text-base text-white">{f.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-2 leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WRITERS SPOTLIGHT ── */}
      <section className="relative py-24 px-4 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-primary text-xs font-semibold tracking-wider uppercase">Topluluk</span>
          <h2 className="text-3xl sm:text-4xl font-display font-semibold text-white mt-2">
            Kalemi Güçlü Yazarlarla Tanışın
          </h2>
          <p className="mt-4 text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
            Kendinize uygun evren tasarım ortakları bulun, aktif kurgu çalışmalarına katılın.
          </p>
        </div>

        {/* Dynamic visual preview of mock writers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: 'Murat Bal', username: 'mmuratb77_82c9', roles: ['Kurgu Lideri', 'Fantastik'], status: 'İşbirliğine Açık' },
            { name: 'Elif Şen', username: 'elif_writer99', roles: ['Diyalog Uzmanı', 'Gizem'], status: 'Aktif Yazıyor' },
            { name: 'Caner Kaya', username: 'caner_k', roles: ['Dünya İnşacısı', 'Bilim Kurgu'], status: 'İşbirliğine Açık' }
          ].map((writer, idx) => (
            <div key={writer.username} className="bg-white/[0.02] border border-white/[0.05] p-5 rounded-2xl flex flex-col justify-between text-left hover:border-white/[0.08] transition-colors">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/25 text-primary font-bold flex items-center justify-center text-sm">
                      {writer.name[0]}
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold text-white">{writer.name}</h4>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">@{writer.username}</p>
                    </div>
                  </div>
                  <span className={cn(
                    'text-[9px] px-2 py-0.5 rounded-full border font-medium shrink-0 whitespace-nowrap',
                    writer.status === 'İşbirliğine Açık' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-sky-500/10 border-sky-500/20 text-sky-400'
                  )}>
                    {writer.status}
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-1.5">
                  {writer.roles.map(r => (
                    <span key={r} className="text-[9px] px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-muted-foreground">
                      {r}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-white/[0.03] flex items-center justify-between text-xs">
                <span className="text-[10px] text-muted-foreground">12 Aktif Proje</span>
                <Link href={`/u/${writer.username}`} className="text-primary hover:underline flex items-center gap-1">
                  Profili İncele <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CALL TO ACTION (CTA) ── */}
      <section className="relative py-28 px-4 border-t border-white/[0.04]">
        <div aria-hidden="true" className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[600px] h-[350px] bg-violet-600/5 rounded-full blur-[100px]" />
        </div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease }}
          className="relative max-w-4xl mx-auto text-center space-y-6"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-semibold leading-tight text-white">
            Kelimeniz <span className="text-gradient">Yarım Kalmasın</span>
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Hemen şimdi kaydolun, ilk ortak evreninizi yaratın ve kalemi güçlü diğer yazarlar ile birlik kurgular oluşturmaya başlayın.
          </p>
          
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className={cn(
                buttonVariants({ size: 'lg' }), 
                'w-full sm:w-auto bg-primary hover:bg-primary/90 text-white px-8 py-5 rounded-xl font-semibold shadow-[0_0_40px_rgba(124,58,237,0.4)] transition-all'
              )}
            >
              Hemen Ücretsiz Başla
            </Link>
          </div>
          <p className="text-[11px] text-muted-foreground/60">Kurulum veya kredi kartı bilgisi gerekmez · Tüm temel özellikler ücretsizdir</p>
        </motion.div>
      </section>

      {/* ── MODERN MINIMALIST FOOTER ── */}
      <footer className="border-t border-white/[0.04] bg-black/[0.1] py-12 pb-24 sm:pb-12 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-10 text-left">
          
          <div className="space-y-4">
            <div className="flex items-center gap-2 font-display font-semibold text-white">
              <img src="/logo.png" className="w-6 h-6 rounded-lg object-cover border border-white/[0.08]" alt="Logo" />
              <span className="text-gradient font-bold">Kalem Birliği</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Yazarların ortak hikayeler, kurgu dünyaları ve lore kütüphaneleri oluşturabileceği modern işbirliği ağı.
            </p>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-semibold text-white tracking-wider uppercase">Keşfet</span>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><Link href="/explore" className="hover:text-primary transition-colors">Evrenleri Keşfet</Link></li>
              <li><Link href="/writers" className="hover:text-primary transition-colors">Yazarlar Topluluğu</Link></li>
              <li><Link href="/login" className="hover:text-primary transition-colors">Giriş Yap</Link></li>
            </ul>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-semibold text-white tracking-wider uppercase">Platform</span>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li><Link href="/explore?status=open" className="hover:text-primary transition-colors">Yazarlık Başvurusu</Link></li>
              <li><Link href="/signup" className="hover:text-primary transition-colors">Yeni Proje Oluştur</Link></li>
              <li><a href="#" className="hover:text-primary transition-colors">Topluluk Kuralları</a></li>
            </ul>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-semibold text-white tracking-wider uppercase">Gelişmelerden Haberdar Ol</span>
            <p className="text-xs text-muted-foreground">En yeni kurgulardan ve yeni özelliklerden haberiniz olsun.</p>
            <div className="flex items-center gap-2">
              <input 
                type="email" 
                placeholder="E-posta adresiniz" 
                className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60"
              />
              <button className="bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 p-2 rounded-lg transition-colors">
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>

        <div className="max-w-6xl mx-auto pt-6 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>© 2026 Kalem Birliği. Tüm hakları saklıdır.</span>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-white transition-colors">Kullanım Koşulları</a>
            <a href="#" className="hover:text-white transition-colors">Gizlilik Politikası</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
