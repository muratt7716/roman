import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Gizlilik Politikası — Kalem Birliği',
  description: 'Kalem Birliği\'nin kişisel verileri işleme, saklama ve koruma esasları (KVKK aydınlatma metni).',
}
export const dynamic = 'force-dynamic'

const SECTIONS = [
  {
    title: '1. Kapsam ve Veri Sorumlusu',
    body: `Bu politika, Kalem Birliği platformunda ("Platform") işlenen kişisel verilere ilişkin olarak 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında aydınlatma amacı taşır. Veri sorumlusu, Platform işletmecisidir; iletişim için Platform içindeki "Geri Bildirim Gönder" özelliğini kullanabilirsiniz.`,
  },
  {
    title: '2. İşlenen Veriler',
    body: `Kayıt sırasında: e-posta adresi, kullanıcı adı, görünen ad ve (Google ile girişte) Google profil bilgileriniz (ad, e-posta, profil fotoğrafı). Kullanım sırasında: yazdığınız içerikler, yorumlar, tepkiler, okuma listeleri, takip ilişkileri, yazma istatistikleri (kelime sayısı, seri/streak) ve Akademi modülünde ödev teslimleri ile notlar. Teknik olarak: oturum çerezleri ve temel kullanım kayıtları.`,
  },
  {
    title: '3. İşleme Amaçları ve Hukuki Sebep',
    body: `Verileriniz; hesabınızı oluşturmak ve yönetmek, ortak yazım ve yayımlama özelliklerini sunmak, Akademi modülünde öğretmen-öğrenci-veli akışlarını işletmek, bildirim göndermek ve platform güvenliğini sağlamak amacıyla işlenir. Hukuki sebep, KVKK m.5/2(c) uyarınca sözleşmenin kurulması ve ifası ile m.5/2(f) uyarınca meşru menfaattir.`,
  },
  {
    title: '4. Çocukların Verileri',
    body: `Platform bireysel kullanım için 13 yaş ve üzerine yöneliktir. 13 yaş altı kullanıcılar yalnızca Akademi modülünde, öğretmen gözetiminde ve veli bilgisi dâhilinde yer alabilir. Küçüklere ait veriler yalnızca eğitim amacıyla (ödev, not, öğretmen geri bildirimi) işlenir; reklam veya profilleme amacıyla kullanılmaz. Velisi olduğu öğrencinin verilerine erişim talep eden veliler öğretmen aracılığıyla veli rolü alabilir.`,
  },
  {
    title: '5. Verilerin Paylaşımı ve Yurt Dışına Aktarım',
    body: `Verileriniz satılmaz ve reklam amacıyla üçüncü kişilerle paylaşılmaz. Altyapı hizmeti aldığımız tedarikçiler: Supabase (veritabanı ve kimlik doğrulama), Vercel (barındırma) ve tercih etmeniz hâlinde Google (OAuth ile giriş). Bu hizmetlerin sunucuları yurt dışında bulunabilir; kayıt olarak bu aktarıma açık rıza vermiş sayılırsınız. Yapay zekâ destekli yazma önerisi özelliğini kullanmanız hâlinde, gönderdiğiniz metin parçası öneri üretimi için Google Gemini API'ye iletilir.`,
  },
  {
    title: '6. Çerezler ve Yerel Depolama',
    body: `Platform yalnızca oturumunuzu sürdürmek için zorunlu kimlik doğrulama çerezleri kullanır. Reklam veya izleme çerezi kullanılmaz. Yazma serisi (streak) ve günlük yapay zekâ kullanım sayacı gibi bazı veriler yalnızca kendi cihazınızın yerel depolamasında tutulur.`,
  },
  {
    title: '7. Saklama Süresi',
    body: `Verileriniz hesabınız aktif olduğu sürece saklanır. Hesabınızı veya içeriklerinizi sildiğinizde ilgili veriler makul bir teknik süre içinde (yedekler dâhil) kalıcı olarak silinir.`,
  },
  {
    title: '8. Haklarınız (KVKK m.11)',
    body: `Kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, işleme amacını öğrenme, eksik veya yanlış işlenmişse düzeltilmesini isteme, silinmesini veya yok edilmesini isteme, aktarıldığı üçüncü kişileri bilme ve zarara uğramanız hâlinde giderilmesini talep etme haklarına sahipsiniz. Taleplerinizi Platform içindeki "Geri Bildirim Gönder" özelliğiyle iletebilirsiniz.`,
  },
  {
    title: '9. Güvenlik',
    body: `Verileriniz şifreli bağlantı (HTTPS) üzerinden taşınır; şifreler geri döndürülemez şekilde özetlenerek saklanır. Veritabanı erişimi satır düzeyinde yetkilendirme (RLS) ile korunur: özel projeler yalnızca üyelerine, öğrenci teslimleri yalnızca öğrenci, öğretmen ve yetkili veliye görünür.`,
  },
  {
    title: '10. Değişiklikler',
    body: `Bu politikada yapılacak önemli değişiklikler Platform üzerinden duyurulur. Güncel sürüm her zaman bu sayfada yayımlanır.`,
  },
]

export default function PrivacyPage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground pb-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-display font-bold text-white">Gizlilik Politikası</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Son güncelleme: 5 Temmuz 2026 · KVKK kapsamında aydınlatma metni
          </p>
        </div>

        <div className="space-y-6">
          {SECTIONS.map(s => (
            <section key={s.title} className="glass rounded-xl p-6 space-y-2">
              <h2 className="font-display font-semibold text-white">{s.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
            </section>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Ayrıca bkz.{' '}
          <Link href="/kullanim-kosullari" className="text-primary hover:underline">Kullanım Koşulları</Link>
        </p>
      </div>
    </div>
  )
}
