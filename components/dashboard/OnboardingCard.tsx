import Link from 'next/link'
import { Sparkles, PenLine, Compass, Lightbulb, ArrowRight } from 'lucide-react'

const STEPS = [
  {
    icon: PenLine,
    title: 'İlk projeni oluştur',
    description: 'Kurgu evrenini tanımla, ekip rollerini belirle ve ilk bölümünü yazmaya başla.',
    href: '/projects/new',
    cta: 'Proje Oluştur',
    color: 'text-violet-400 bg-violet-500/15',
  },
  {
    icon: Compass,
    title: 'Açık projelere katıl',
    description: 'Yazar arayan projelere göz at, sana uyan role başvur ve bir ekibin parçası ol.',
    href: '/explore',
    cta: 'Keşfet',
    color: 'text-sky-400 bg-sky-500/15',
  },
  {
    icon: Lightbulb,
    title: 'Fikrini paylaş',
    description: 'Kafanda bir tohum fikir mi var? Fikir Odası\'na at, ilgilenenlerle ekip kur.',
    href: '/fikir-odasi',
    cta: 'Fikir Odası',
    color: 'text-amber-400 bg-amber-500/15',
  },
]

/** Yeni kullanıcı karşılama kartı — hiç projesi ve üyeliği olmayanlara gösterilir. */
export function OnboardingCard() {
  return (
    <section className="glass-card rounded-2xl p-6 sm:p-8 border border-primary/20 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-display font-bold">Kalem Birliği&apos;ne hoş geldin! 👋</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Başlaman için üç yol var — hangisi sana göre?</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {STEPS.map((step, i) => (
          <div key={step.title} className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${step.color}`}>
                <step.icon className="w-4 h-4" />
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Adım {i + 1}</span>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm">{step.title}</h3>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{step.description}</p>
            </div>
            <Link
              href={step.href}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-accent transition-colors"
            >
              {step.cta} <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        ))}
      </div>
    </section>
  )
}
