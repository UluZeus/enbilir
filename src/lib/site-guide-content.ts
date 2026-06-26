import enbilirIcerik2 from "@/data/enbilir-icerik2-content.json";

export type SiteGuideArticle = {
  id: string;
  eyebrow: string;
  title: string;
  excerpt: string;
  paragraphs: string[];
};

type GeneratedContentItem = {
  idBase: string;
  section: string;
  tr: { title: string; excerpt: string; body: string };
  en: { title: string; excerpt: string; body: string };
};

function getGeneratedSiteGuideArticles(locale: string): SiteGuideArticle[] {
  const items = enbilirIcerik2 as GeneratedContentItem[];

  return items
    .filter((item) => item.section === "SITE_GUIDE")
    .map((item) => {
      const copy = locale === "en" ? item.en : item.tr;

      return {
        id: item.idBase,
        eyebrow: locale === "en" ? "From the new guide" : "Yeni rehberden",
        title: copy.title,
        excerpt: copy.excerpt,
        paragraphs: copy.body.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean),
      };
    });
}

export function getSiteGuideArticles(locale: string): SiteGuideArticle[] {
  if (locale === "en") {
    return [
      {
        id: "how-to-start",
        eyebrow: "Start here",
        title: "How to get the most value from Enbilir",
        excerpt: "Read the concept, test it in the virtual portfolio, compare in the leaderboard, and review it with the AI assistant.",
        paragraphs: [
          "The best way to use Enbilir is not to look at one screen and rush into a quick conclusion. Think of the site as a learning chain. First you read the concept, then you test it in a virtual portfolio, then you compare the result through rankings and leagues, and finally you review the same decision with the AI Assistant and macro reports.",
          "I designed this structure as a learning space away from real-money pressure. A person who wants to understand markets first needs to see their own behavior. Where do they rush? Where do they follow the crowd? Where do they hold one idea too tightly? Where do they forget to keep cash? These patterns are easier to notice in a simulated environment.",
          "The first step is the Education page. This is where the shared language is built. Trend, volatility, diversification, drawdown, virtual balance, risk, and signal confidence should become familiar in plain language. The aim is not to exhaust users with technical terms; the aim is to create a calm market vocabulary.",
          "The second step is the Trade page. No real order is sent, no real money is used, and no exchange account is connected. The user chooses assets with a virtual balance, builds an allocation, and watches the result of their decisions.",
          "The third step is Leaderboard and Leagues. These areas make learning visible. A user does not only look at their own result; they also observe the rhythm of the community. The purpose is not merely to rank first, but to learn more disciplined decision-making.",
          "The fourth step is the AI Assistant and Macro Reports. This area reads markets together with technical indicators, news context, and macro framing. But the boundary is important: AI output is not an order. A signal is a helper that allows the user to ask better questions.",
          "So I would suggest this sequence: read, test, compare, discuss, review. When these five steps work together, Enbilir stops being just a website and becomes a regular financial-literacy workspace.",
        ],
      },
      {
        id: "virtual-trading-page",
        eyebrow: "Virtual portfolio",
        title: "How should the virtual trading page be used?",
        excerpt: "The Trade page does not send real orders; it is designed to let users test decision discipline in a safe environment.",
        paragraphs: [
          "The Trade page is one of the most practical education areas of Enbilir. A user does not trade with real money here. No brokerage account is connected, no order is sent, and no money transfer takes place. The entire structure exists for virtual portfolio education.",
          "A signed-in user first sees the total virtual portfolio, available cash, and existing positions. This matters because portfolio health is not only about which asset was bought. It is also about how much cash remains and whether the portfolio has become too concentrated.",
          "The product search area allows the user to search by symbol, asset name, or market type. Filters such as BIST, Nasdaq, Dow Jones, FX, crypto, commodities, bonds, and indices reduce screen noise, especially for beginners.",
          "After choosing an asset, the user selects buy or sell and enters a virtual USD amount. The key point is not to attach the entire virtual balance to one idea. From an educational perspective, it is more valuable to test different allocations and observe how the portfolio behaves.",
          "After the virtual trade is applied, the portfolio panel updates. The user can track asset weights, profit or loss, and cash share. This screen should not be viewed only as a scoreboard; it should be viewed as a decision journal.",
          "For example, one user may allocate the whole balance to technology shares and then see how strongly one sector affects the entire portfolio. Another user may spread the balance across gold, FX, equities, and cash, and observe a different behavior. That comparison is highly educational.",
          "The right use of the virtual trading page is simple: before each trade, write the reason. Why did you choose this asset? What time frame are you thinking about? What happens if you are wrong? The most valuable learning appears when the user returns to these questions after the result is visible.",
        ],
      },
      {
        id: "ai-assistant",
        eyebrow: "AI Assistant",
        title: "How does the AI Assistant work, and how should it be used?",
        excerpt: "The AI Assistant is not an order machine. It is a thinking aid that explains technical data and macro context for education.",
        paragraphs: [
          "It is important to understand the AI Assistant correctly. This screen does not make decisions on behalf of the user. Its purpose is to make market movement more readable, simplify technical indicators, and help the user ask better questions.",
          "The AI Assistant evaluates price movement, trend, volatility, technical indicators, risk notes, and market context together. In some areas, labels such as BUY or SELL may appear. These are not certain commands; they are educational signal language.",
          "A user can first look at the market radar to see where movement is concentrated. Then they can select favorite assets and follow them more regularly. Favorites help narrow the user’s attention inside both the terminal screen and the report flow.",
          "Macro reports provide a broader market frame at scheduled times. Gold, silver, the dollar, the euro, Turkish lira, oil, BIST 100, Dow Jones, Nasdaq, AI-related stocks, energy, and crypto can be evaluated together. This helps the user avoid becoming locked into one asset.",
          "The best way to benefit from the AI Assistant is to compare its output with your own reasoning. If the assistant says an asset has a positive technical view, ask: Which indicators support that view? What would invalidate it? How large is this risk inside my virtual portfolio?",
          "Time frame matters. A short-term signal is not the same thing as a long-term view. A one-hour movement may look strong while the daily picture remains cautious. A signal should always be read together with its horizon.",
          "What I expect from the AI Assistant is not that it takes over the user’s decision. I expect it to improve the quality of the user’s thinking. Used well, it teaches a calmer way to look at charts and market data. Used poorly, it turns into label chasing. Enbilir should always aim for the first outcome.",
        ],
      },
      {
        id: "leaderboard-community-leagues",
        eyebrow: "Community",
        title: "How should the leaderboard, leagues, and community areas be read?",
        excerpt: "These areas are designed not only for competition, but also to make learning visible and build a shared language.",
        paragraphs: [
          "At first glance, the leaderboard may look like a simple ranking screen. But in Enbilir, the leaderboard is not only there to show who is ahead. Its deeper value is to make virtual portfolio performance visible and give the learning process a regular rhythm.",
          "A user rising quickly in the short term does not always mean they used a good method. Sometimes one risky decision works for a while. Another user may be temporarily behind because they are using a more balanced approach, yet their process may be stronger for learning. This difference should not be forgotten.",
          "Leagues allow communities to build their own rhythm of competition and learning. Rotary, Rotaract, Interact, or private groups can come together through invite codes. Financial literacy then stops being only an individual study and becomes a safe community conversation.",
          "The Community area makes it easier to see users, friendship status, and league links. The aim is not to create noisy social media behavior. The aim is to help people on the same learning path notice each other and evaluate ideas together when needed.",
          "A healthy community question is: Why did you make that decision? Another healthy question is: What would you do if you were wrong? These two questions are much more valuable than simply saying buy or sell, because they move the person toward process rather than ready-made answers.",
          "When using leagues and leaderboards, success should not be measured only by outcome. How disciplined is the portfolio? Is the user overloaded in one asset? Are they tracking risk? Are they reviewing their own decisions? These are at least as important as ranking.",
          "My expectation from these areas is that they turn Enbilir into a living learning community. Competition creates motivation, but the deeper purpose is better thinking. The best community does not tell its members what to do; it helps them ask better questions.",
        ],
      },
      {
        id: "why-it-was-built",
        eyebrow: "Founding logic",
        title: "Why did Dr. Hakan Unsal build this site?",
        excerpt: "Enbilir was built to turn financial literacy from dry information into a living learning experience with virtual portfolios, community, and AI-supported interpretation.",
        paragraphs: [
          "The reason I built this site begins with a simple observation: financial markets are now on everyone’s agenda, but not everyone has a calm and correct place to learn. People see headlines, follow prices, read social media comments, but often do not know how to filter all that information.",
          "Financial literacy is not just knowing stock-market terminology. It is understanding risk, being able to write down the reason for a decision, accepting the possibility of being wrong, and reviewing the process after the result. I designed Enbilir to strengthen these habits.",
          "The virtual portfolio is especially important. When real money enters the picture, emotions change very quickly. Fear, greed, regret, and rushed decisions make learning harder. A virtual environment gives the person a chance to observe their own behavior first.",
          "The reason I added the AI Assistant is similar. Market data is abundant, and many users do not know where to start. AI can help simplify that complexity. But the user remains the owner of the decision. This line must be protected throughout the site.",
          "For Rotary and similar communities, this structure has additional meaning. These communities already have trust, regular meetings, and a culture of learning together. Financial literacy can develop more effectively inside that culture.",
          "The logic of Enbilir is not to promise wealth. On the contrary, it is to stay away from quick promises and encourage more conscious thinking. Every piece of content here is educational and is not investment advice.",
          "For me, a successful user is not always the person with the highest return. A successful user is someone who can explain their decision, recognize their risk, evaluate the result calmly, and become more disciplined over time. That is why Enbilir exists.",
        ],
      },
      ...getGeneratedSiteGuideArticles(locale),
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
    ...getGeneratedSiteGuideArticles(locale),
  ];
}
