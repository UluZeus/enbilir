export type SiteGuideArticle = {
  id: string;
  eyebrow: string;
  title: string;
  excerpt: string;
  paragraphs: string[];
};

export function getSiteGuideArticles(locale: string): SiteGuideArticle[] {
  if (locale === "en") {
    return [
      {
        id: "how-to-start",
        eyebrow: "Start here",
        title: "How to get the most value from Enbilir",
        excerpt: "Read the concept, test it in the virtual portfolio, compare in the leaderboard, and review it with the AI assistant.",
        paragraphs: [
          "Enbilir is not designed as a place where a user looks at one signal and immediately makes a decision. Its real value appears when the user follows a simple learning chain: read the concept, test the idea virtually, compare the result, discuss it in a community, and review the same idea with AI-supported context.",
          "The first step is the Education area. This is where the common language is built. Terms such as trend, volatility, allocation, drawdown, virtual balance, and signal confidence should become familiar before the user starts comparing assets.",
          "The second step is the virtual trading page. No real order is sent and no exchange account is connected. The user practices with a simulated portfolio and observes how decisions behave in changing market conditions.",
          "The third step is the leaderboard and league structure. This turns individual learning into a shared rhythm. A user can see ranking, compare portfolio discipline, and discuss decisions without turning the community into an investment-advice room.",
          "The final step is the AI assistant and macro reports. These tools explain market context, technical signals, and risk notes. They should be used as a thinking aid, not as an automatic decision mechanism.",
        ],
      },
    ];
  }

  return [
    {
      id: "nereden-baslamali",
      eyebrow: "Başlangıç",
      title: "Enbilir'den en çok nasıl yararlanırsınız?",
      excerpt: "Önce kavramı okuyun, sonra sanal portföyde deneyin, liderlikte karşılaştırın ve AI Asistanı ile gözden geçirin.",
      paragraphs: [
        "Enbilir'i en doğru kullanma biçimi, tek bir ekrana bakıp hızlı karar vermek değildir. Bu siteyi bir öğrenme zinciri gibi düşünmek gerekir. Önce kavramı okuyacaksınız, sonra sanal portföyde deneyeceksiniz, ardından liderlik ve lig yapısı içinde sonucu göreceksiniz, en sonunda da AI Asistanı ve makro raporlarla aynı kararı daha geniş bir bağlama oturtacaksınız.",
        "Ben bu yapıyı özellikle gerçek para baskısından uzak bir öğrenme alanı olarak tasarladım. Çünkü piyasayı öğrenmek isteyen kişinin önce kendi davranışını görmesi gerekir. Nerede acele ediyor, nerede kalabalığa uyuyor, nerede tek bir fikre fazla bağlanıyor, nerede nakit tutmayı unutuyor; bunların hepsi sanal ortamda daha rahat fark edilir.",
        "İlk adım Eğitim sayfasıdır. Burada trend, volatilite, çeşitlendirme, geri çekilme, sanal bakiye, risk ve sinyal güveni gibi kavramlar sade bir dille anlatılır. Amaç kimseyi teknik terimlerle yormak değildir. Amaç, piyasa konuşurken ortak bir dil kurmaktır.",
        "İkinci adım İşlem Yap sayfasıdır. Burada gerçek emir gönderilmez, gerçek para kullanılmaz ve herhangi bir borsa hesabına bağlanılmaz. Kullanıcı sanal bakiyesiyle farklı varlıkları seçer, portföy dağılımını oluşturur ve kararlarının sonucunu izler.",
        "Üçüncü adım Liderlik ve Ligler bölümüdür. Bu alan, öğrenmeyi görünür hale getirir. Kullanıcı yalnızca kendi sonucuna değil, topluluğun genel ritmine de bakar. Burada amaç sadece birinci olmak değildir; daha disiplinli karar vermeyi öğrenmektir.",
        "Dördüncü adım AI Asistanı ve Makro Raporlardır. Bu bölüm piyasayı teknik göstergeler, haber akışı ve makro çerçeve ile birlikte okur. Fakat burada çok önemli bir sınır vardır: AI çıktısı emir değildir. Sinyal, kullanıcının daha iyi soru sorması için bir yardımcıdır.",
        "Bu nedenle Enbilir'i kullanırken kendinize şu sırayı önerin: Oku, dene, karşılaştır, tartış, gözden geçir. Bu beşli düzen çalıştığında site yalnızca ziyaret edilen bir web sayfası olmaktan çıkar; düzenli bir finansal okuryazarlık çalışma alanına dönüşür.",
      ],
    },
    {
      id: "sanal-islem-sayfasi",
      eyebrow: "Sanal portföy",
      title: "Sanal alım satım sayfası nasıl kullanılmalı?",
      excerpt: "İşlem Yap sayfası gerçek emir göndermez; kullanıcının karar disiplinini güvenli ortamda denemesi için hazırlanmıştır.",
      paragraphs: [
        "İşlem Yap sayfası, Enbilir'in en pratik eğitim alanlarından biridir. Bu sayfada kullanıcı gerçek para ile işlem yapmaz. Bir borsa hesabı bağlanmaz, emir gönderilmez, para transferi yapılmaz. Buradaki bütün yapı sanal portföy eğitimi içindir.",
        "Sayfaya giriş yapan kullanıcı önce toplam sanal portföyünü, nakit durumunu ve varsa mevcut pozisyonlarını görür. Bu alan, portföyün genel sağlığını anlamak için önemlidir. Sadece hangi varlığın alındığına değil, nakdin ne kadar kaldığına ve portföyün ne kadar yoğunlaştığına da bakmak gerekir.",
        "Ürün arama alanında sembol, ürün adı veya piyasa türüyle arama yapılabilir. Kullanıcı BIST, Nasdaq, Dow Jones, döviz, kripto, emtia, tahvil ve endeks gibi başlıklar arasında filtreleme yapabilir. Bu filtreler özellikle yeni başlayanlar için ekran kalabalığını azaltır.",
        "Bir varlık seçildiğinde kullanıcı alım veya satım yönünü belirler ve USD bazlı sanal tutarı yazar. Burada en önemli konu, tüm sanal bakiyeyi tek bir fikre bağlamamaktır. Eğitim açısından daha değerli olan şey, farklı dağılımları deneyip portföyün nasıl davrandığını görmektir.",
        "İşlemi uyguladıktan sonra portföy paneli güncellenir. Kullanıcı hangi varlıkta ne kadar ağırlık taşıdığını, kar veya zarar durumunu ve nakit payını izleyebilir. Bu ekranı bir skor tahtası gibi değil, karar defteri gibi görmek gerekir.",
        "Örneğin bir kullanıcı tüm bakiyesini sadece teknoloji hisselerine ayırırsa, teknoloji tarafındaki dalgalanma portföyün tamamını etkiler. Başka bir kullanıcı altın, döviz, hisse ve nakit arasında daha dengeli bir dağılım yaparsa farklı bir portföy davranışı görür. Bu karşılaştırma finansal okuryazarlık açısından çok öğreticidir.",
        "Sanal işlem sayfasının doğru kullanımı şudur: Her işlemden önce nedeninizi yazın. Bu varlığı neden seçtiniz? Hangi vadede düşünüyorsunuz? Yanılırsanız ne olur? Sonra sonucu izleyin. En değerli öğrenme, işlemden sonra bu sorulara geri dönüldüğünde oluşur.",
      ],
    },
    {
      id: "ai-asistani",
      eyebrow: "AI Asistanı",
      title: "AI Asistanı nasıl çalışır ve nasıl kullanılmalı?",
      excerpt: "AI Asistanı sinyal veren bir emir makinesi değil, teknik veri ve makro bağlamı eğitim amaçlı açıklayan bir düşünme yardımcısıdır.",
      paragraphs: [
        "AI Asistanı sayfasını doğru anlamak çok önemlidir. Bu ekran, kullanıcının yerine karar veren bir mekanizma değildir. Buradaki amaç, piyasadaki hareketleri daha okunabilir hale getirmek, teknik göstergeleri sadeleştirmek ve kullanıcının daha iyi soru sormasını sağlamaktır.",
        "AI Asistanı, takip edilen varlıklarda fiyat hareketi, trend, volatilite, teknik göstergeler, risk notları ve piyasa bağlamı gibi unsurları birlikte değerlendirir. Bazı alanlarda AL veya SAT gibi etiketler görülebilir. Bunlar kesin emir değildir; eğitim amaçlı sinyal dilidir.",
        "Kullanıcı önce piyasa radarına bakarak hangi varlıklarda hareket olduğunu görebilir. Sonra favori varlıklarını seçebilir ve bu varlıkların daha düzenli izlenmesini sağlayabilir. Favoriler, hem terminal ekranında hem de rapor mantığında kullanıcının ilgilendiği alanı daraltmasına yardımcı olur.",
        "Makro raporlar, günün belli saatlerinde daha geniş piyasa çerçevesi sunar. Altın, gümüş, dolar, euro, Türk lirası, petrol, BIST 100, Dow Jones, Nasdaq, yapay zeka hisseleri, enerji ve kripto gibi başlıklar bir arada değerlendirilebilir. Böylece kullanıcı tek bir varlığa kilitlenmek yerine piyasanın genel resmini görür.",
        "AI Asistanı'ndan yararlanmanın en iyi yolu, çıktıyı kendi düşüncenizle karşılaştırmaktır. Asistan bir varlık için olumlu teknik görünüm diyorsa şu soruyu sorun: Bu görünüm hangi göstergelerle destekleniyor? Hangi durumda geçersiz kalır? Benim sanal portföyümde bu risk ne kadar yer kaplar?",
        "AI tarafında dikkat edilmesi gereken bir başka konu da zaman dilimidir. Kısa vadeli bir sinyal, uzun vadeli bir düşünceyle aynı şey değildir. Bir saatlik hareket güçlü görünebilir ama günlük görünüm daha temkinli olabilir. Bu nedenle sinyali her zaman vade ile birlikte okumak gerekir.",
        "Benim AI Asistanı'ndan beklediğim şey, kullanıcının kararını devralması değil, kullanıcının düşünme kalitesini artırmasıdır. İyi kullanıldığında AI Asistanı, grafiklere ve piyasa verilerine daha sakin bakmayı öğretir. Kötü kullanıldığında ise kullanıcı sadece etiket kovalar. Enbilir'in amacı birincisi olmalıdır.",
      ],
    },
    {
      id: "liderlik-topluluk-ligler",
      eyebrow: "Topluluk",
      title: "Liderlik, ligler ve topluluk bölümü nasıl okunmalı?",
      excerpt: "Bu alanlar yalnızca rekabet için değil, öğrenmeyi görünür kılmak ve topluluk içinde ortak dil kurmak için tasarlanmıştır.",
      paragraphs: [
        "Liderlik tablosu ilk bakışta sadece bir sıralama ekranı gibi görünebilir. Fakat Enbilir'de liderlik bölümü yalnızca kimin önde olduğunu göstermek için yoktur. Asıl değer, kullanıcıların sanal portföy performansını görünür kılmak ve öğrenme sürecine düzenli bir ritim kazandırmaktır.",
        "Bir kullanıcının kısa vadede üst sıralara çıkması her zaman iyi yöntem kullandığı anlamına gelmez. Bazen tek bir riskli karar kısa vadede iyi sonuç verebilir. Başka bir kullanıcı daha dengeli karar verdiği için kısa vadede geride kalabilir ama öğrenme açısından daha sağlam ilerliyor olabilir. Liderlik tablosuna bakarken bu ayrımı unutmamak gerekir.",
        "Ligler, toplulukların kendi içinde yarışma ve öğrenme düzeni kurmasını sağlar. Rotary, Rotaract, Interact veya özel gruplar kendi davet kodlarıyla bir araya gelebilir. Böylece finansal okuryazarlık yalnızca bireysel bir çalışma olmaktan çıkar, güvenli bir topluluk sohbetine dönüşür.",
        "Topluluk bölümü kullanıcıları, arkadaşlık durumlarını ve lig bağlantılarını görmeyi kolaylaştırır. Burada amaç bir sosyal medya gürültüsü oluşturmak değildir. Amaç, aynı öğrenme yolunda olan kişilerin birbirinden haberdar olması ve gerektiğinde birlikte değerlendirme yapabilmesidir.",
        "Topluluk içinde en sağlıklı soru şudur: Bu kararı hangi gerekçeyle aldın? Bir başka sağlıklı soru da şudur: Yanılsaydın ne yapardın? Bu iki soru, al veya sat demekten çok daha değerlidir. Çünkü kişiyi hazır cevaba değil, düşünme sürecine götürür.",
        "Lig ve liderlik yapısını kullanırken başarıyı yalnızca sonuçla ölçmemek gerekir. Kullanıcı portföyünü ne kadar disiplinli yönetiyor, tek varlığa aşırı yükleniyor mu, riskini takip ediyor mu, kararlarını gözden geçiriyor mu? Bunlar da en az sıralama kadar önemlidir.",
        "Benim bu bölümlerden beklentim, Enbilir'i yaşayan bir öğrenme topluluğuna dönüştürmesidir. Rekabet motivasyon sağlar, ama asıl amaç daha iyi düşünmektir. En iyi topluluk, üyelerine ne yapacağını söyleyen değil, daha iyi soru sorduran topluluktur.",
      ],
    },
    {
      id: "neden-hazirlandi",
      eyebrow: "Kuruluş mantığı",
      title: "Dr. Hakan Ünsal bu siteyi neden hazırladı?",
      excerpt: "Enbilir, finansal okuryazarlığı kuru bilgi olmaktan çıkarıp sanal portföy, topluluk ve AI destekli yorumla yaşayan bir öğrenme deneyimine dönüştürmek için hazırlandı.",
      paragraphs: [
        "Bu siteyi hazırlama nedenim çok basit bir gözleme dayanıyor: Finansal piyasalar artık herkesin gündeminde, fakat herkesin sakin ve doğru bir öğrenme zemini yok. İnsanlar haberleri görüyor, fiyatları takip ediyor, sosyal medyada yorumlar okuyor; ama bütün bu bilgiyi nasıl süzeceğini çoğu zaman bilmiyor.",
        "Finansal okuryazarlık yalnızca borsa terimi bilmek değildir. Kişinin riskini anlaması, kendi kararını yazabilmesi, yanılma ihtimalini kabul etmesi ve sonuçtan sonra süreci değerlendirmesidir. Ben Enbilir'i bu alışkanlıkları güçlendirmek için kurguladım.",
        "Sanal portföy burada özellikle önemlidir. Çünkü gerçek para devreye girdiğinde insanın duyguları çok hızlı değişir. Korku, hırs, pişmanlık ve acele kararlar öğrenmeyi zorlaştırır. Sanal ortam ise kişiye önce kendi davranışını görme fırsatı verir.",
        "AI Asistanı'nı ekleme nedenim de aynıdır. Piyasa verisi çok fazladır ve çoğu kullanıcı nereden başlayacağını bilemez. AI, bu karmaşayı sadeleştirmeye yardım edebilir. Fakat kararın sahibi yine kullanıcıdır. Bu çizgi sitede özellikle korunmalıdır.",
        "Rotary ve benzeri topluluklar için bu yapı ayrıca anlamlıdır. Çünkü bu topluluklarda güven, düzenli buluşma ve birlikte öğrenme kültürü vardır. Finansal okuryazarlık da bu kültür içinde daha verimli gelişebilir.",
        "Enbilir'in mantığı, kimseye zenginlik vaadi sunmak değildir. Tam tersine, hızlı vaatlerden uzak durmak ve daha bilinçli düşünmeyi teşvik etmektir. Buradaki her içerik eğitim amaçlıdır ve yatırım tavsiyesi değildir.",
        "Benim için başarılı kullanıcı, her zaman en yüksek getiriyi yapan kişi değildir. Başarılı kullanıcı, kararını gerekçelendirebilen, riskini fark eden, sonucu soğukkanlı değerlendiren ve zaman içinde daha disiplinli hale gelen kişidir. Enbilir'in varlık nedeni budur.",
      ],
    },
  ];
}
