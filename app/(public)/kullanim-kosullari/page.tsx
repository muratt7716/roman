import type { Metadata } from 'next'
import Link from 'next/link'
import { ScrollText } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Kullanım Koşulları — Kalem Birliği',
  description: 'Kalem Birliği platformunun kullanım koşulları, yaş şartları ve içerik kuralları.',
}
export const dynamic = 'force-dynamic'

const SECTIONS = [
  {
    title: '1. Hizmetin Tanımı',
    body: `Kalem Birliği ("Platform"), yazarların tek başına veya ekip hâlinde hikâye yazabildiği, yazdıklarını yayımlayabildiği ve okuyabildiği; öğretmenlerin sınıf oluşturup yazma ödevleri verebildiği Türkçe bir ortak yazarlık platformudur. Platform, yazılan içeriklerin sahibi değildir; yazarların eserlerini oluşturması, saklaması ve paylaşması için altyapı sunar.`,
  },
  {
    title: '2. Yaş Şartı',
    body: `Platformu bireysel olarak kullanmak için en az 13 yaşında olmanız gerekir. 13 yaşından küçük kullanıcılar Platformu yalnızca Akademi (okul) modülü kapsamında, öğretmen gözetiminde ve velisinin bilgisi dâhilinde kullanabilir. 18 yaşından küçük tüm kullanıcıların kayıt için veli veya vasi onayına sahip olduğu kabul edilir. Yaş şartına aykırı açıldığı tespit edilen hesaplar kapatılabilir.`,
  },
  {
    title: '3. Hesap ve Güvenlik',
    body: `Kayıt sırasında doğru bilgi vermekle ve hesabınızın güvenliğinden (şifrenizin gizliliği dâhil) sorumlu olmakla yükümlüsünüz. Hesabınız üzerinden yapılan tüm işlemler size aittir. Hesabınızın izinsiz kullanıldığını fark ederseniz şifrenizi sıfırlayın ve bize bildirin.`,
  },
  {
    title: '4. İçerik ve Telif Hakları',
    body: `Yazdığınız tüm eserlerin telif hakkı size (ortak projelerde katkı sahiplerine) aittir. Platforma içerik yükleyerek, bu içeriğin Platform üzerinde görüntülenmesi, saklanması ve teknik olarak çoğaltılması (yedekleme, önbellekleme) için bize münhasır olmayan bir lisans vermiş olursunuz. Bu lisans, içeriğinizi silmenizle sona erer. Başkasına ait eserleri izinsiz kopyalayamaz, kendi eserinizmiş gibi paylaşamazsınız.`,
  },
  {
    title: '5. Ortak Projeler',
    body: `Bir projeye ortak yazar olarak katıldığınızda, katkılarınız projenin bir parçası hâline gelir. Proje sahibi projeyi yayımlama, tamamlama veya silme yetkisine sahiptir. Ortak projelerdeki katkı payları ve hak paylaşımı konusunda anlaşmazlık doğarsa, taraflar öncelikle kendi aralarında çözüm arar; Platform bu anlaşmazlıklarda taraf değildir.`,
  },
  {
    title: '6. Yasak İçerik ve Davranışlar',
    body: `Şunlar kesinlikle yasaktır: nefret söylemi, taciz, zorbalık ve tehdit; müstehcen veya çocukların güvenliğini tehlikeye atan içerik; şiddeti öven veya suça teşvik eden içerik; başkalarının kişisel verilerini izinsiz paylaşmak; spam, yanıltıcı içerik ve platformun işleyişini bozmaya yönelik teknik müdahaleler. Akademi modülü öğrencilere açık bir alandır; buradaki içerik ve iletişimde eğitim ortamına uygun dil kullanılması zorunludur.`,
  },
  {
    title: '7. Akademi (Okul) Modülü',
    body: `Sınıf oluşturan öğretmen, sınıfındaki içerik ve iletişimin uygunluğundan sorumludur. Öğrenci teslimleri varsayılan olarak yalnızca öğrenciye ve öğretmene görünür; öğretmen "sınıfa açık" yaptığı ödevlerde teslimlerin sınıf arkadaşlarınca okunabileceğini öğrencilere bildirmelidir. Veli rolü, yalnızca kendi öğrencisinin ödev ve notlarını görüntüleyebilir.`,
  },
  {
    title: '8. Hesabın Kapatılması',
    body: `Bu koşulları ihlal eden hesapları uyararak veya uyarmaksızın askıya alma ya da kapatma hakkımız saklıdır. Hesabınızı istediğiniz zaman kapatabilir, içeriklerinizi silebilirsiniz.`,
  },
  {
    title: '9. Sorumluluk Reddi',
    body: `Platform "olduğu gibi" sunulur. Kesintisiz veya hatasız çalışacağını garanti etmeyiz. Kullanıcıların oluşturduğu içeriklerden içeriği oluşturan kullanıcı sorumludur. Veri kaybına karşı önlem olarak versiyon geçmişi sunulur ancak önemli eserlerinizin yedeğini almanızı öneririz.`,
  },
  {
    title: '10. Değişiklikler',
    body: `Bu koşulları zaman zaman güncelleyebiliriz. Önemli değişikliklerde Platform üzerinden duyuru yaparız. Değişiklik sonrası Platformu kullanmaya devam etmeniz, güncel koşulları kabul ettiğiniz anlamına gelir.`,
  },
  {
    title: '11. İletişim',
    body: `Bu koşullarla ilgili sorularınız için Platform içindeki "Geri Bildirim Gönder" özelliğini kullanabilirsiniz.`,
  },
]

export default function TermsPage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground pb-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-10">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <ScrollText className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-3xl font-display font-bold text-white">Kullanım Koşulları</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Son güncelleme: 5 Temmuz 2026 · Kalem Birliği&apos;ni kullanarak bu koşulları kabul etmiş olursunuz.
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
          <Link href="/gizlilik-politikasi" className="text-primary hover:underline">Gizlilik Politikası</Link>
        </p>
      </div>
    </div>
  )
}
