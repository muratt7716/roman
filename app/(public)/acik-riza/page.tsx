import type { Metadata } from 'next'
import Link from 'next/link'
import { Globe2 } from 'lucide-react'
import { DATA_CONTROLLER, TERMS_UPDATED_LABEL } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Açık Rıza Metni',
  description: 'Kalem Birliği — kişisel verilerin yurt dışına aktarılmasına ilişkin açık rıza metni (KVKK m.9).',
}
export const dynamic = 'force-dynamic'

// Aydınlatma metninden AYRI tutulur: KVKK Kurulu açık rızanın aydınlatma
// metnine ya da sözleşmeye gömülü alınmasını geçersiz sayıyor.
const ITEMS = [
  ['Aktarılan veriler', 'Hesap ve profil bilgileriniz (e-posta, kullanıcı adı, görünen ad, profil fotoğrafı), Platform\'da oluşturduğunuz içerikler ve etkileşimler, Akademi modülündeki ödev ve not kayıtları, oturum ve IP kayıtları.'],
  ['Alıcılar ve ülkeler', 'Supabase Inc. (veritabanı, depolama, kimlik doğrulama) ve Vercel Inc. (barındırma) — sunucular ABD ve/veya Avrupa Birliği\'nde. Yalnızca ilgili özelliği kullanırsanız: Google LLC (Google ile giriş, Gemini yapay zekâ önerileri) ve SomaFM (müzik yayını, yalnızca IP adresi) — ABD.'],
  ['Amaç', 'Platform\'un çalışması: verilerinizin saklanması, oturum açmanız, içeriklerinizin size ve paylaştığınız kişilere sunulması. Platform\'un tüm altyapısı bu sağlayıcılar üzerinde çalıştığı için aktarım olmadan hizmet sunulamaz.'],
  ['Geri alma', `Rızanızı dilediğiniz zaman geri alabilirsiniz. Bunun için Ayarlar sayfasından hesabınızı silmeniz ya da ${DATA_CONTROLLER.channel} üzerinden talepte bulunmanız yeterlidir. Geri alma, o tarihe kadar yapılan aktarımların hukuka uygunluğunu etkilemez.`],
]

export default function ExplicitConsentPage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground pb-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 flex items-center justify-center">
              <Globe2 className="w-5 h-5 text-sky-400" />
            </div>
            <h1 className="text-3xl font-display font-bold text-white">Açık Rıza Metni</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Son güncelleme: {TERMS_UPDATED_LABEL} · Kişisel verilerin yurt dışına aktarılması (KVKK m.9)
          </p>
        </div>

        <section className="glass rounded-xl p-6 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {DATA_CONTROLLER.name} tarafından, <Link href="/gizlilik-politikasi" className="text-primary hover:underline">Aydınlatma Metni</Link>&apos;nde
            ayrıntılı olarak açıklanan kişisel verilerimin aşağıda belirtilen alıcılara ve ülkelere, belirtilen amaçla
            aktarılmasına özgür irademle, bilgilendirilmiş olarak açık rıza veriyorum.
          </p>
          <dl className="space-y-4">
            {ITEMS.map(([k, v]) => (
              <div key={k} className="space-y-1">
                <dt className="text-sm font-semibold text-white">{k}</dt>
                <dd className="text-sm text-muted-foreground leading-relaxed">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      </div>
    </div>
  )
}
