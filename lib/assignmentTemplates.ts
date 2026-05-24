export interface PlatformTemplate {
  id: string
  category: string
  title: string
  description: string
}

export const PLATFORM_TEMPLATES: PlatformTemplate[] = [
  // Macera
  { id: 'pt-01', category: 'Macera', title: 'Kayıp Ada', description: 'Haritada olmayan bir adaya düştün. Hayatta kalmak için ne yaparsın? Adanın sırlarını keşfederken içindeki cesareti de keşfedeceksin. En az 3 karakter kullan ve bir çatışma sahnesi yaz.' },
  { id: 'pt-02', category: 'Macera', title: 'Zaman Makinesi', description: 'Bir zaman makinesine bindin ve istediğin bir tarihe gidebilirsin. Nereye giderdin, neler yapardın ve geri dönebilir miydin? Tarihsel bir olayı hikayene dahil et.' },
  { id: 'pt-03', category: 'Macera', title: 'Büyük Yolculuk', description: 'Küçük bir haritayla büyük bir yolculuğa çıktın. Yolda karşılaştığın üç engeli aş ve hedefe ulaş. Her engelin seni nasıl değiştirdiğini yaz.' },
  { id: 'pt-04', category: 'Macera', title: 'Gizli Kapı', description: 'Okulunun duvarında gizemli bir kapı keşfettin. İçeride ne var? Girmeye cesaret edebilir misin? Merak ile korku arasındaki gerilimi hisset.' },
  // Duygu
  { id: 'pt-05', category: 'Duygu', title: 'En Mutlu Anım', description: 'Hayatında yaşadığın en mutlu anı detaylarıyla yaz. Neredeydin, kimler vardı, ne hissediyordun? Okuyucunun o duyguyu hissetmesini sağla.' },
  { id: 'pt-06', category: 'Duygu', title: 'Elveda Mektubu', description: 'Bir şeye ya da birine elveda diyorsun. Bu bir yer, bir dönem ya da bir insan olabilir. Veda etmenin hem acısını hem de özgürlüğünü yaz.' },
  { id: 'pt-07', category: 'Duygu', title: 'İlk Kez', description: 'Hayatında bir şeyi ilk kez yaptığında neler hissedtin? İlk kez bisiklete binmek, sahneye çıkmak, yabancı biriyle konuşmak olabilir. O anı canlı tut.' },
  { id: 'pt-08', category: 'Duygu', title: 'Özür', description: 'Birine özür dilemek istiyorsun ama bir türlü dilini bağlıyor. Mektupta ne yazardın? Dürüst ve içten ol.' },
  // Korku / Gerilim
  { id: 'pt-09', category: 'Korku/Gerilim', title: 'Karanlık Koridor', description: 'Gece yarısı uyanıyorsun ve evin koridoru tamamen karanlık. Bir ses duyuyorsun. Gerilimi adım adım inşa et; canavarı gösterme, hissettir.' },
  { id: 'pt-10', category: 'Korku/Gerilim', title: 'Gece Yarısı Sesi', description: 'Her gece aynı saatte evin üst katından garip bir ses geliyor. Kimseye inandıramazsın. Tek başına araştırmaya karar veriyorsun.' },
  { id: 'pt-11', category: 'Korku/Gerilim', title: 'Kayıp Hafıza', description: 'Sabah uyandığında dün gece ne yaptığını hatırlamıyorsun. Ama masanın üstünde tanımadığın bir anahtar var. Geriye doğru iz sür.' },
  { id: 'pt-12', category: 'Korku/Gerilim', title: 'Son Gece', description: 'Kamp ateşinin etrafında herkes uyurken sen hâlâ uyanıksın. Ormandan gelen sesler seni tedirgin ediyor. Sabaha kadar bekle ama okuyucuyu da uyan tut.' },
  // Deneme
  { id: 'pt-13', category: 'Deneme', title: 'Teknoloji ve Biz', description: 'Teknoloji hayatımızı kolaylaştırıyor mu, yoksa bizi birbirinden uzaklaştırıyor mu? Kendi gözlemlerinden yola çıkarak düşüncelerini savun.' },
  { id: 'pt-14', category: 'Deneme', title: 'İdeal Dünya', description: 'Eğer dünyayı yeniden tasarlayabilseydin nasıl bir yer yapardın? Bir sorun seç ve çözümünü detaylıca açıkla.' },
  { id: 'pt-15', category: 'Deneme', title: 'Kitaplar mı, Ekranlar mı?', description: 'Kitap okumak ile dizi/video izlemek arasında ne fark var? Hangisinden daha çok şey öğreniyoruz? Bir deneyiminden örnekle.' },
  { id: 'pt-16', category: 'Deneme', title: 'Cesaret Nedir?', description: 'Sence cesaret ne demek? Sadece fiziksel tehlikeyle mi ilgili? Günlük hayatından bir örnek vererek cesaretin farklı yüzlerini anlat.' },
  // Fantezi
  { id: 'pt-17', category: 'Fantezi', title: 'Sihirli Güç', description: 'Bir gün uyandığında sihirli bir güce sahip olduğunu fark ettin. Bu gücü kimseye söyleyemezsin. İlk 24 saatte neler yaşadını yaz.' },
  { id: 'pt-18', category: 'Fantezi', title: 'Paralel Evren', description: 'Bir ayna önünde dururken paralel evrendeki sen sana bakıyor. Ama o sen, sen değil. Onunla ne konuşurdun? Farkları ve benzerlikleri keşfet.' },
  { id: 'pt-19', category: 'Fantezi', title: 'Hayvan Dili', description: 'Bir sabah tüm hayvanların dilini anlamaya başladın. İlk duyduğun şey seni şaşkına çevirdi. Ne duydun, ne yaptın?' },
  { id: 'pt-20', category: 'Fantezi', title: 'Büyücü Çırağı', description: 'Ünlü bir büyücünün yanına çırak olarak girdin. İlk dersin beklediğinden çok farklı. Ustanın sana öğretmek istediği gerçek sır nedir?' },
]
