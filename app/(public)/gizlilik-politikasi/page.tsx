import type { Metadata } from 'next'
import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { DATA_CONTROLLER, TERMS_UPDATED_LABEL } from '@/lib/legal'

export const metadata: Metadata = {
  title: 'Gizlilik Politikası',
  description: 'Kalem Birliği\'nin kişisel verileri işleme, saklama ve koruma esasları (KVKK aydınlatma metni).',
}
export const dynamic = 'force-dynamic'

const SECTIONS = [
  {
    title: '1. Veri Sorumlusu ve Başvuru',
    body: `Bu metin, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") m.10 uyarınca hazırlanmış aydınlatma metnidir. Veri sorumlusu ${DATA_CONTROLLER.name}'dir. KVKK m.11 kapsamındaki taleplerinizi ${DATA_CONTROLLER.channel} üzerinden iletebilirsiniz. Başvurular en geç 30 gün içinde ücretsiz olarak sonuçlandırılır.`,
  },
  {
    title: '2. İşlenen Veriler',
    body: `Kimlik ve iletişim: e-posta adresi, kullanıcı adı, görünen ad; Google ile girişte Google hesabınızdaki ad, e-posta ve profil fotoğrafı. Profil: biyografi, portföy bağlantısı ve yüklediğiniz profil fotoğrafı. İçerik: yazdığınız bölümler ve versiyonları, yorumlar, öneriler, tepkiler, okuma listeleri, takip ilişkileri, Fikir Odası mesajları, yazma istatistikleri (kelime sayısı, seri) ve Akademi modülünde ödev teslimleri, notlar ve öğretmen yorumları. İşlem güvenliği: oturum çerezleri, giriş zamanları ve kimlik doğrulama altyapısının tuttuğu IP adresi kayıtları. Onay kaydı: onay verdiğiniz tarih ve metin sürümü.`,
  },
  {
    title: '3. İşleme Amaçları ve Hukuki Sebepler',
    body: `Hesabınızı oluşturmak ve yönetmek, ortak yazım, yayımlama ve okuma özelliklerini sunmak, bildirim göndermek ve Akademi modülünde öğretmen-öğrenci-veli akışlarını işletmek için verileriniz KVKK m.5/2(c) (sözleşmenin kurulması ve ifası) kapsamında işlenir. Hesap güvenliği, kötüye kullanımın önlenmesi ve onay kayıtlarının saklanması m.5/2(ç) (hukuki yükümlülük) ve m.5/2(f) (meşru menfaat) kapsamındadır. Yurt dışına aktarım ise yalnızca açık rızanıza dayanır (bkz. madde 5).`,
  },
  {
    title: '4. Çocukların Verileri',
    body: `Platformu bireysel olarak kullanmak için en az 13 yaşında olmak gerekir. 13 yaşından küçükler yalnızca Akademi modülünde, öğretmen gözetiminde yer alabilir. 18 yaşından küçük kullanıcılar adına onaylar veli veya vasi tarafından verilir; kayıt sırasında bu beyan ayrıca alınır. Küçüklere ait veriler yalnızca eğitim amacıyla (ödev, not, öğretmen geri bildirimi) işlenir; reklam veya profilleme amacıyla kullanılmaz. Öğrenci teslimlerini ve notları yalnızca öğrencinin kendisi ve sınıfın öğretmeni görür; öğretmen bir ödevi "sınıfa açık" yaparsa, son teslim tarihinden sonra sınıf arkadaşları teslim edilen metni (not ve öğretmen yorumu olmadan) okuyabilir.`,
  },
  {
    title: '5. Verilerin Aktarıldığı Taraflar',
    body: `Verileriniz satılmaz ve reklam amacıyla kimseyle paylaşılmaz. Hizmetin çalışması için şu altyapı sağlayıcılarına aktarılır: Supabase (veritabanı, dosya depolama, kimlik doğrulama) ve Vercel (barındırma). Google ile giriş yaparsanız Google, yapay zekâ yazma önerisi veya karakter derinleştirme özelliğini kullanırsanız gönderdiğiniz metin parçası Google (Gemini API), müzik çaları başlatırsanız IP adresiniz yayını sağlayan SomaFM tarafından işlenir. Bu sağlayıcıların sunucuları Türkiye dışında (ABD ve/veya Avrupa Birliği) bulunur. Yurt dışına aktarım KVKK m.9 uyarınca açık rızanıza dayanır ve kayıt sırasında ayrı bir onay kutusuyla alınır; ayrıntılar Açık Rıza Metni'ndedir. Kamuya açık yaptığınız içerikler (yayımlanmış bölümler, profiliniz) herkes tarafından görülebilir.`,
  },
  {
    title: '6. Toplama Yöntemi',
    body: `Veriler; kayıt ve profil formları, Google ile giriş, Platform'daki yazma, yorumlama ve etkileşim işlemleriniz sırasında elektronik ortamda, otomatik veya kısmen otomatik yollarla toplanır.`,
  },
  {
    title: '7. Çerezler ve Yerel Depolama',
    body: `Platform yalnızca oturumunuzu sürdürmek için zorunlu kimlik doğrulama çerezleri kullanır. Reklam, analiz veya izleme çerezi kullanılmaz. Yazma serisi ve günlük yapay zekâ kullanım sayacı gibi bazı veriler yalnızca kendi cihazınızın yerel depolamasında tutulur ve bize iletilmez.`,
  },
  {
    title: '8. Saklama Süresi ve Silme',
    body: `Verileriniz hesabınız açık olduğu sürece saklanır. Hesabınızı Ayarlar sayfasından kalıcı olarak silebilirsiniz; bu işlemle profiliniz, profil fotoğrafınız, sahibi olduğunuz projeler ve kapak görselleri, yorumlarınız, tepkileriniz, bildirimleriniz ve onay kaydınız hemen silinir. Başkasının projesine yaptığınız yazım katkıları eserin bütünlüğü için projede kalır, ancak sizinle bağlantısı koparılır ve adınız görünmez.`,
  },
  {
    title: '9. Haklarınız (KVKK m.11)',
    body: `Kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, işleme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme, aktarıldığı üçüncü kişileri bilme, eksik veya yanlış işlenmişse düzeltilmesini, silinmesini veya yok edilmesini isteme, bu işlemlerin aktarılan üçüncü kişilere bildirilmesini isteme, münhasıran otomatik sistemlerle analiz sonucu aleyhinize bir sonuç çıkmasına itiraz etme ve zarara uğramanız hâlinde giderilmesini talep etme haklarına sahipsiniz. Açık rızanızı dilediğiniz zaman geri alabilirsiniz; yurt dışı aktarım olmadan hizmet sunulamadığı için bu, hesabın silinmesi anlamına gelir. Kişisel Verileri Koruma Kurulu'na şikâyet hakkınız saklıdır.`,
  },
  {
    title: '10. Güvenlik',
    body: `Verileriniz şifreli bağlantı (HTTPS) üzerinden taşınır; şifreler geri döndürülemez şekilde özetlenerek saklanır. Veritabanı erişimi satır düzeyinde yetkilendirme (RLS) ile korunur: özel projeler yalnızca üyelerine, öğrenci teslimleri yalnızca öğrencinin kendisine ve öğretmenine görünür.`,
  },
  {
    title: '11. Değişiklikler',
    body: `Bu metinde önemli bir değişiklik yapıldığında bir sonraki girişinizde güncel metinler size yeniden gösterilir ve onayınız istenir.`,
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
            Son güncelleme: {TERMS_UPDATED_LABEL} · KVKK kapsamında aydınlatma metni
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
          <Link href="/acik-riza" className="text-primary hover:underline">Açık Rıza Metni</Link>
          {' · '}
          <Link href="/kullanim-kosullari" className="text-primary hover:underline">Kullanım Koşulları</Link>
        </p>
      </div>
    </div>
  )
}
