export type RiskAnswerOption = {
  label: string;
  score: 1 | 2 | 3 | 4 | 5;
};

export type RiskQuestion = {
  id: number;
  category: string;
  question: string;
  options: RiskAnswerOption[];
};

export type RiskProfileKey = "very_cautious" | "cautious" | "balanced" | "growth" | "aggressive";

export type RiskProfile = {
  key: RiskProfileKey;
  min: number;
  max: number;
  title: string;
  shortDescription: string;
  reportIntro: string;
  strengths: string[];
  behavioralRisks: string[];
  portfolioSuggestions: string[];
  assetNotes: {
    stocks: string;
    fx: string;
    gold: string;
    crypto: string;
    cash: string;
  };
};

const legalWarning =
  "Bu test yatırım tavsiyesi değildir. Sonuçlar yalnızca eğitim ve farkındalık amacı taşır. Gerçek yatırım kararları kişisel mali durum, hedefler, vade, gelir, borçluluk, likidite ihtiyacı ve profesyonel danışmanlık çerçevesinde değerlendirilmelidir.";

export const riskTestLegalWarning = legalWarning;

export const riskQuestions: RiskQuestion[] = [
  {
    id: 1,
    category: "Belirsizlik Toleransı",
    question: "Piyasalar bir hafta içinde beklenmedik şekilde sert dalgalandığında ilk tepkin ne olur?",
    options: [
      { label: "Hemen pozisyonumu kapatmak ve uzaklaşmak isterim.", score: 1 },
      { label: "Endişelenirim, çoğunlukla riskimi azaltırım.", score: 2 },
      { label: "Önce ne olduğunu anlamaya çalışır, sonra karar veririm.", score: 3 },
      { label: "Dalgalanmayı fırsat olarak da değerlendirebilirim.", score: 4 },
      { label: "Sert dalgalanmalarda aktif fırsat ararım.", score: 5 },
    ],
  },
  {
    id: 2,
    category: "Kayıp Toleransı",
    question: "Sanal portföyün kısa sürede %5 değer kaybetse ne yaparsın?",
    options: [
      { label: "Çok rahatsız olur, hemen çıkmak isterim.", score: 1 },
      { label: "Rahatsız olurum ve pozisyonları azaltırım.", score: 2 },
      { label: "Neden düştüğünü inceler, plana göre karar veririm.", score: 3 },
      { label: "Eğer gerekçem hâlâ geçerliyse beklerim.", score: 4 },
      { label: "Düşüşü ekleme fırsatı olarak görebilirim.", score: 5 },
    ],
  },
  {
    id: 3,
    category: "Vade",
    question: "Bir varlığa yatırım mantığıyla baktığında ideal düşünme süren hangisine daha yakın?",
    options: [
      { label: "Günlük dalgalanmalar bile beni çok etkiler.", score: 1 },
      { label: "Birkaç gün veya birkaç hafta içinde sonuç görmek isterim.", score: 2 },
      { label: "Birkaç ay bekleyebilirim.", score: 3 },
      { label: "6 ay - 1 yıl arası sabredebilirim.", score: 4 },
      { label: "1 yıldan uzun süreli dalgalanmalara dayanabilirim.", score: 5 },
    ],
  },
  {
    id: 4,
    category: "Karar Davranışı",
    question: "Bir varlık hızlı yükselirken sen ne hissedersin?",
    options: [
      { label: "Uzak dururum; yükselmişse artık tehlikelidir.", score: 1 },
      { label: "Çok temkinli yaklaşırım.", score: 2 },
      { label: "Önce neden yükseldiğini anlamaya çalışırım.", score: 3 },
      { label: "Gerekçe güçlü ise sınırlı pozisyon düşünebilirim.", score: 4 },
      { label: "Güçlü momentum gördüğümde hızlı hareket edebilirim.", score: 5 },
    ],
  },
  {
    id: 5,
    category: "Portföy Dağılımı",
    question: "Sanal portföyünde tek bir varlığa yüksek ağırlık vermeye nasıl bakarsın?",
    options: [
      { label: "Kesinlikle istemem.", score: 1 },
      { label: "Çok sınırlı olabilir.", score: 2 },
      { label: "Belli şartlarda makul olabilir.", score: 3 },
      { label: "Fırsat güçlü ise yüksek ağırlık verebilirim.", score: 4 },
      { label: "Çok inandığım varlıkta yoğunlaşmaktan çekinmem.", score: 5 },
    ],
  },
  {
    id: 6,
    category: "Kripto Risk Algısı",
    question: "Bitcoin veya kripto paralardaki yüksek oynaklık sana ne hissettirir?",
    options: [
      { label: "Bana uygun değil; çok riskli bulurum.", score: 1 },
      { label: "Çok küçük oranla takip edebilirim.", score: 2 },
      { label: "Öğrenmek ve sınırlı denemek isterim.", score: 3 },
      { label: "Portföyde anlamlı yer verebilirim.", score: 4 },
      { label: "Yüksek oynaklığı fırsat olarak görürüm.", score: 5 },
    ],
  },
  {
    id: 7,
    category: "Döviz Riski",
    question: "Dolar/TL gibi döviz hareketlerini portföy açısından nasıl değerlendirirsin?",
    options: [
      { label: "Döviz hareketleri beni huzursuz eder.", score: 1 },
      { label: "Sadece koruma amaçlı sınırlı düşünürüm.", score: 2 },
      { label: "Dövizi portföy çeşitlendirme aracı olarak görürüm.", score: 3 },
      { label: "Döviz trendlerini aktif takip ederim.", score: 4 },
      { label: "Döviz dalgalanmalarını fırsat alanı olarak görürüm.", score: 5 },
    ],
  },
  {
    id: 8,
    category: "Borsa Risk Algısı",
    question: "Hisse senetlerinde kısa vadeli düşüşler seni nasıl etkiler?",
    options: [
      { label: "Çok rahatsız eder; hisse bana uygun değil gibi gelir.", score: 1 },
      { label: "Endişelenirim ve satma eğilimim artar.", score: 2 },
      { label: "Şirket ve piyasa koşullarını kontrol ederim.", score: 3 },
      { label: "Planım bozulmadıysa beklerim.", score: 4 },
      { label: "Düşüşlerde alım fırsatı ararım.", score: 5 },
    ],
  },
  {
    id: 9,
    category: "Altın ve Güvenli Liman",
    question: "Altın gibi daha geleneksel varlıklara bakışın nasıldır?",
    options: [
      { label: "Daha çok güvenli limanları tercih ederim.", score: 1 },
      { label: "Portföyümün önemli kısmı güvenli limanda olsun isterim.", score: 2 },
      { label: "Altın dengeli portföyün bir parçası olabilir.", score: 3 },
      { label: "Altını daha çok piyasa şartlarına göre kullanırım.", score: 4 },
      { label: "Altını düşük getiri potansiyelli bulup daha riskli varlıkları tercih ederim.", score: 5 },
    ],
  },
  {
    id: 10,
    category: "Haber Akışı",
    question: "Piyasayla ilgili olumsuz bir haber gördüğünde ne yaparsın?",
    options: [
      { label: "Hemen riskten çıkmak isterim.", score: 1 },
      { label: "Büyük ölçüde temkinli davranırım.", score: 2 },
      { label: "Haberin etkisini ve kaynağını incelerim.", score: 3 },
      { label: "Piyasa abartıyorsa fırsat görebilirim.", score: 4 },
      { label: "Panik hareketlerinde aktif işlem fırsatı ararım.", score: 5 },
    ],
  },
  {
    id: 11,
    category: "Bilgiye Güven",
    question: "Bir yatırım fikrini uygulamadan önce ne kadar araştırma yapmak istersin?",
    options: [
      { label: "Çok fazla araştırmadan asla hareket etmem.", score: 1 },
      { label: "En az birkaç güvenilir kaynak görmek isterim.", score: 2 },
      { label: "Temel bilgileri ve riskleri bilmem yeterlidir.", score: 3 },
      { label: "Hızlı analizle karar verebilirim.", score: 4 },
      { label: "Fırsat kaçmadan önce hızlı pozisyon almak isterim.", score: 5 },
    ],
  },
  {
    id: 12,
    category: "Kayıp Sonrası Davranış",
    question: "Üst üste birkaç yanlış karar verdiğinde ne yaparsın?",
    options: [
      { label: "Uzun süre piyasadan uzaklaşırım.", score: 1 },
      { label: "Riskimi ciddi biçimde azaltırım.", score: 2 },
      { label: "Hatalarımı not alıp stratejimi gözden geçiririm.", score: 3 },
      { label: "Daha seçici ama aktif kalırım.", score: 4 },
      { label: "Kayıpları telafi etmek için daha agresif davranabilirim.", score: 5 },
    ],
  },
  {
    id: 13,
    category: "Getiri Beklentisi",
    question: "Sanal portföy yarışmasında nasıl bir hedef seni daha çok motive eder?",
    options: [
      { label: "En az kayıpla istikrarlı kalmak.", score: 1 },
      { label: "Düşük riskle makul getiri.", score: 2 },
      { label: "Dengeli ve sürdürülebilir performans.", score: 3 },
      { label: "Ortalama üstü getiri.", score: 4 },
      { label: "Liderlik tablosunda en üst sıralar, yüksek getiri.", score: 5 },
    ],
  },
  {
    id: 14,
    category: "Likidite İhtiyacı",
    question: "Paraya kısa vadede ihtiyaç duyma ihtimalin olsa nasıl davranırsın?",
    options: [
      { label: "Riskli varlıklardan uzak dururum.", score: 1 },
      { label: "Büyük bölümü likit ve düşük riskli tutarım.", score: 2 },
      { label: "Bir kısmını riskli, bir kısmını güvenli ayırırım.", score: 3 },
      { label: "Yine de fırsat varsa risk alabilirim.", score: 4 },
      { label: "Kısa vadeli ihtiyaç olsa bile yüksek getiri arayabilirim.", score: 5 },
    ],
  },
  {
    id: 15,
    category: "Zaman Ayırma",
    question: "Piyasaları takip etmeye ne kadar zaman ayırabilirsin?",
    options: [
      { label: "Çok az; bu yüzden risk almak istemem.", score: 1 },
      { label: "Sınırlı takip ederim, temkinli kalırım.", score: 2 },
      { label: "Haftalık düzenli kontrol yapabilirim.", score: 3 },
      { label: "Günlük takip edebilirim.", score: 4 },
      { label: "Gün içinde sık sık takip edip aktif karar alabilirim.", score: 5 },
    ],
  },
  {
    id: 16,
    category: "Strateji Disiplini",
    question: "Önceden belirlediğin plana piyasa dalgalanınca ne kadar sadık kalırsın?",
    options: [
      { label: "Dalgalanma olursa planı bırakırım.", score: 1 },
      { label: "Çoğunlukla planı değiştiririm.", score: 2 },
      { label: "Planı kontrol eder, gerekirse revize ederim.", score: 3 },
      { label: "Planımın arkasında durabilirim.", score: 4 },
      { label: "Planı korurken fırsatlarda agresif ekleme yapabilirim.", score: 5 },
    ],
  },
  {
    id: 17,
    category: "Çeşitlendirme",
    question: "Portföy çeşitlendirmesi senin için ne ifade eder?",
    options: [
      { label: "Olmazsa olmaz; riskin çoğu dağıtılmalı.", score: 1 },
      { label: "Büyük ölçüde çeşitlendirme isterim.", score: 2 },
      { label: "Dengeli çeşitlendirme iyidir.", score: 3 },
      { label: "Fırsatlara göre bazı alanlarda yoğunlaşabilirim.", score: 4 },
      { label: "Fazla çeşitlendirme getiriyi düşürür; yoğunlaşmayı severim.", score: 5 },
    ],
  },
  {
    id: 18,
    category: "AI Kullanımı",
    question: "AI Asistanı bir varlık için \"bekle\" derken sen çok yükseliş bekliyorsan ne yaparsın?",
    options: [
      { label: "AI uyarısı varsa işlem yapmam.", score: 1 },
      { label: "Büyük ölçüde AI görüşüne uyarım.", score: 2 },
      { label: "AI görüşünü kendi analizimle birlikte değerlendiririm.", score: 3 },
      { label: "Kendi analizim güçlüyse sınırlı işlem yaparım.", score: 4 },
      { label: "AI uyarısına rağmen güçlü inancımla agresif davranabilirim.", score: 5 },
    ],
  },
  {
    id: 19,
    category: "Makroekonomi",
    question: "Faiz, enflasyon, merkez bankası kararları gibi makro konular kararlarında ne kadar etkili?",
    options: [
      { label: "Bu konuları bilmeden risk almak istemem.", score: 1 },
      { label: "Çok etkili; belirsizlikte temkinli olurum.", score: 2 },
      { label: "Önemli bir karar girdisi olarak kullanırım.", score: 3 },
      { label: "Makro kötü olsa bile fırsat arayabilirim.", score: 4 },
      { label: "Makro riskleri ikinci planda bırakıp fiyat hareketine odaklanırım.", score: 5 },
    ],
  },
  {
    id: 20,
    category: "Sosyal Etki / Topluluk",
    question: "Arkadaşların veya ligdeki diğer kullanıcılar yüksek getiri elde ediyorsa ne hissedersin?",
    options: [
      { label: "Etkilenmem, güvenli kalmayı tercih ederim.", score: 1 },
      { label: "Biraz etkilenirim ama temkinli kalırım.", score: 2 },
      { label: "Karşılaştırır, öğrenmeye çalışırım.", score: 3 },
      { label: "Daha aktif denemeler yapabilirim.", score: 4 },
      { label: "Geri kalmamak için agresif risk alabilirim.", score: 5 },
    ],
  },
  {
    id: 21,
    category: "FOMO",
    question: "Bir fırsatı kaçırdığını düşündüğünde ne yaparsın?",
    options: [
      { label: "Peşinden koşmam.", score: 1 },
      { label: "Genelde uzak dururum.", score: 2 },
      { label: "Yeni giriş için uygun seviye beklerim.", score: 3 },
      { label: "Sınırlı pozisyonla katılabilirim.", score: 4 },
      { label: "Fırsat kaçmadan hemen dahil olmak isterim.", score: 5 },
    ],
  },
  {
    id: 22,
    category: "Stop-Loss Disiplini",
    question: "Bir işlem beklediğin gibi gitmezse zarar kesme konusunda nasılsın?",
    options: [
      { label: "Zarar etmemek için riskli işleme zaten girmem.", score: 1 },
      { label: "Küçük zararda çıkma eğilimindeyim.", score: 2 },
      { label: "Önceden belirlediğim seviyeye göre çıkarım.", score: 3 },
      { label: "Gerekçem devam ediyorsa bekleyebilirim.", score: 4 },
      { label: "Zarar büyüse de geri döneceğine inanıp taşıyabilirim.", score: 5 },
    ],
  },
  {
    id: 23,
    category: "Kazanç Sonrası Davranış",
    question: "Sanal portföyün kısa sürede iyi getiri sağlarsa ne yaparsın?",
    options: [
      { label: "Kârı korumak için riskimi hemen azaltırım.", score: 1 },
      { label: "Bir kısmını güvenli alana çekerim.", score: 2 },
      { label: "Planıma göre dengelerim.", score: 3 },
      { label: "Trend devam ediyorsa pozisyonumu sürdürebilirim.", score: 4 },
      { label: "Başarı sonrası daha büyük risk alabilirim.", score: 5 },
    ],
  },
  {
    id: 24,
    category: "Öğrenme Yaklaşımı",
    question: "Finansal piyasalarda öğrenme tarzın hangisine daha yakın?",
    options: [
      { label: "Önce tamamen öğrenmek, sonra denemek isterim.", score: 1 },
      { label: "Çok küçük denemelerle öğrenirim.", score: 2 },
      { label: "Öğrenme ve denemeyi birlikte yürütürüm.", score: 3 },
      { label: "Deneyimleyerek hızlı öğrenirim.", score: 4 },
      { label: "Risk alarak ve sonuç görerek öğrenmeyi tercih ederim.", score: 5 },
    ],
  },
  {
    id: 25,
    category: "Varlık Seçimi",
    question: "Bilmediğin ama çok konuşulan yeni bir yatırım temasına yaklaşımın nasıl olur?",
    options: [
      { label: "Uzak dururum.", score: 1 },
      { label: "Önce uzun süre araştırırım.", score: 2 },
      { label: "Küçük sanal deneme yapabilirim.", score: 3 },
      { label: "Potansiyel görürsem anlamlı yer verebilirim.", score: 4 },
      { label: "Erken girmek için yüksek risk alabilirim.", score: 5 },
    ],
  },
  {
    id: 26,
    category: "Psikolojik Dayanıklılık",
    question: "Portföyün birkaç gün üst üste eksi yazarsa ruh halin nasıl etkilenir?",
    options: [
      { label: "Çok etkilenirim, piyasadan soğurum.", score: 1 },
      { label: "Moralimi bozar, riskimi azaltırım.", score: 2 },
      { label: "Etkilenirim ama analiz etmeye çalışırım.", score: 3 },
      { label: "Normal karşılarım.", score: 4 },
      { label: "Beni daha çok motive eder, fırsat ararım.", score: 5 },
    ],
  },
  {
    id: 27,
    category: "Kaldıraç Algısı",
    question: "Kaldıraçlı işlemler veya çok yüksek oynaklıklı araçlar hakkında ne düşünürsün?",
    options: [
      { label: "Kesinlikle bana uygun değil.", score: 1 },
      { label: "Çok riskli, uzak dururum.", score: 2 },
      { label: "Sadece eğitim amacıyla çok sınırlı incelerim.", score: 3 },
      { label: "Riskini anlarsam kontrollü deneyebilirim.", score: 4 },
      { label: "Yüksek getiri için cazip bulurum.", score: 5 },
    ],
  },
  {
    id: 28,
    category: "Hedef Belirleme",
    question: "Sanal portföy hedefi belirlerken hangisi sana daha yakın?",
    options: [
      { label: "Önce kaybetmemeyi hedeflerim.", score: 1 },
      { label: "Düşük riskli istikrarlı ilerleme isterim.", score: 2 },
      { label: "Dengeli getiri ve öğrenme hedeflerim.", score: 3 },
      { label: "Piyasa ortalamasını geçmek isterim.", score: 4 },
      { label: "En yüksek getiriyi hedeflerim.", score: 5 },
    ],
  },
  {
    id: 29,
    category: "Piyasa Düşüşü",
    question: "Genel piyasa %10 düşerse ne yaparsın?",
    options: [
      { label: "Riskli varlıklardan tamamen uzaklaşırım.", score: 1 },
      { label: "Riskimi azaltırım.", score: 2 },
      { label: "Düşüşün nedenini incelerim.", score: 3 },
      { label: "Kademeli alım fırsatı ararım.", score: 4 },
      { label: "Sert düşüşü büyük fırsat olarak görürüm.", score: 5 },
    ],
  },
  {
    id: 30,
    category: "Portföy Kontrolü",
    question: "Portföyünü ne sıklıkla kontrol etmek istersin?",
    options: [
      { label: "Çok sık bakmak beni strese sokar.", score: 1 },
      { label: "Haftada birkaç kez yeterli.", score: 2 },
      { label: "Günde bir kez bakabilirim.", score: 3 },
      { label: "Gün içinde birkaç kez kontrol ederim.", score: 4 },
      { label: "Sürekli izlemek ve hızlı karar almak isterim.", score: 5 },
    ],
  },
  {
    id: 31,
    category: "Karar Gerekçesi",
    question: "Bir sanal işlem yapmadan önce karar gerekçesi yazman istense ne düşünürsün?",
    options: [
      { label: "Çok iyi olur; yazmadan işlem yapmam.", score: 1 },
      { label: "Faydalı bulurum.", score: 2 },
      { label: "Bazen yazarım, bazen yazmam.", score: 3 },
      { label: "Hızımı kesebilir ama önemli işlemlerde yazarım.", score: 4 },
      { label: "Fırsatlar hızlıdır; gerekçe yazmakla zaman kaybetmek istemem.", score: 5 },
    ],
  },
  {
    id: 32,
    category: "Risk Limiti",
    question: "Bir pozisyonda maksimum ne kadar sanal kaybı tolere edebilirsin?",
    options: [
      { label: "%1-2 bile beni rahatsız eder.", score: 1 },
      { label: "%3-5 arası tolere edebilirim.", score: 2 },
      { label: "%5-10 arası planlıysa tolere edebilirim.", score: 3 },
      { label: "%10-20 arası dalgalanmayı kabul edebilirim.", score: 4 },
      { label: "%20 üzeri dalgalanma bile stratejime uygunsa kabul edebilirim.", score: 5 },
    ],
  },
  {
    id: 33,
    category: "Senaryo Düşünme",
    question: "Bir karar almadan önce \"yanılırsam ne olur?\" diye düşünür müsün?",
    options: [
      { label: "Her zaman; bu benim için en önemli sorudur.", score: 1 },
      { label: "Çoğu zaman düşünürüm.", score: 2 },
      { label: "Önemli kararlarda düşünürüm.", score: 3 },
      { label: "Bazen düşünürüm ama fırsata da bakarım.", score: 4 },
      { label: "Genelde önce fırsata odaklanırım.", score: 5 },
    ],
  },
  {
    id: 34,
    category: "Gelir / Sermaye Koruma Algısı",
    question: "Sermayeni korumak mı, büyütmek mi senin için daha öncelikli?",
    options: [
      { label: "Kesinlikle korumak.", score: 1 },
      { label: "Önce korumak, sonra sınırlı büyütmek.", score: 2 },
      { label: "Koruma ve büyüme dengesi.", score: 3 },
      { label: "Büyüme daha öncelikli.", score: 4 },
      { label: "Yüksek büyüme için yüksek riski kabul ederim.", score: 5 },
    ],
  },
  {
    id: 35,
    category: "Genel Risk Algısı",
    question: "Kendini piyasa riski açısından nasıl tanımlarsın?",
    options: [
      { label: "Çok temkinliyim.", score: 1 },
      { label: "Temkinliyim.", score: 2 },
      { label: "Dengeliyim.", score: 3 },
      { label: "Risk alabilirim.", score: 4 },
      { label: "Yüksek risk almaktan çekinmem.", score: 5 },
    ],
  },
];

export const riskProfiles: RiskProfile[] = [
  {
    key: "very_cautious",
    min: 1,
    max: 1.8,
    title: "Çok Temkinli Risk Profili",
    shortDescription:
      "Belirsizlikten ciddi şekilde rahatsız olursun, sermaye kaybına karşı hassassın ve dalgalanmaya dayanıklılığın düşük olabilir.",
    reportIntro:
      "Senin risk profilin Çok Temkinli Risk Profili. Bu, piyasadan tamamen uzak kalman gerektiği anlamına gelmez; önce kavramları tanımaya, düşük volatiliteyi gözlemlemeye ve karar verirken panik tepkilerini fark etmeye daha çok ihtiyaç duyduğunu gösterir.",
    strengths: ["Sermaye koruma refleksin güçlü.", "Plansız riskleri erken fark edebilirsin.", "Öğrenme sürecinde acele etmeden ilerleme eğilimin var."],
    behavioralRisks: ["Kısa vadeli düşüşlerde panik satışa yaklaşabilirsin.", "Fırsatları sadece risk olarak görme eğilimin olabilir.", "Belirsizlik arttığında karar almak yerine tamamen geri çekilebilirsin."],
    portfolioSuggestions: ["Sanal portföyde önce düşük volatiliteyi gözlemle.", "Tek varlığa yoğunlaşma.", "Önce finansal okuryazarlık içeriklerini tamamla.", "Kısa vadeli fiyat hareketleriyle karar verme.", "Piyasa kavramlarını öğrenmeden yüksek riskli varlıklara yönelme."],
    assetNotes: {
      stocks: "Hisse senetlerini küçük sanal denemelerle ve sektör farkını öğrenerek izle.",
      fx: "Dövizi koruma ve çeşitlendirme kavramı üzerinden değerlendir.",
      gold: "Altın senin için güvenli liman davranışını anlamada iyi bir gözlem alanı olabilir.",
      crypto: "Kriptoyu önce eğitim ve gözlem konusu yap; yüksek oynaklığı küçük oranlarla simüle et.",
      cash: "Nakit ve düşük riskli alanlar, karar stresini azaltan bir denge unsuru olabilir.",
    },
  },
  {
    key: "cautious",
    min: 1.81,
    max: 2.6,
    title: "Temkinli Risk Profili",
    shortDescription:
      "Sınırlı risk alabilirsin ancak kayıplar arttığında karar kaliten bozulabilir. Korumacı ve dengeli yaklaşım sana daha uygun görünür.",
    reportIntro:
      "Senin risk profilin Temkinli Risk Profili. Bu profil, öğrenerek ilerleyen, önce riski anlamak isteyen ve kayıp senaryosunu baştan görmekten güç alan bir karar tarzına işaret eder.",
    strengths: ["Kayıp ihtimalini hesaba katma becerin var.", "Çeşitlendirme fikrine açıksın.", "AI ve raporları kararını sorgulamak için kullanabilirsin."],
    behavioralRisks: ["Kayıp büyüyünce aşırı savunmaya geçebilirsin.", "Bazen iyi planlanmış fırsatlarda fazla gecikebilirsin.", "Sosyal karşılaştırma risk algını bozabilir."],
    portfolioSuggestions: ["Portföy çeşitlendirmesini öğren.", "Düşük ve orta riskli varlıkları karşılaştır.", "Sanal işlemlerde küçük adımlarla ilerle.", "Kayıp senaryolarını önceden yaz.", "AI Asistanı'nı kararını sorgulamak için kullan."],
    assetNotes: {
      stocks: "Hisselerde geniş sepet, sektör farkı ve şirket kalitesi kavramlarına odaklan.",
      fx: "Dövizi tek başına getiri aracı değil, risk dengeleme parçası olarak düşün.",
      gold: "Altın portföyde denge ve psikolojik konfor sağlayabilir.",
      crypto: "Kripto için küçük sanal pay ve net kayıp limiti belirlemek daha sağlıklı olur.",
      cash: "Nakit payı, ani karar baskısını azaltan stratejik alan olarak kalabilir.",
    },
  },
  {
    key: "balanced",
    min: 2.61,
    max: 3.4,
    title: "Dengeli Risk Profili",
    shortDescription:
      "Risk ve getiri arasında denge kurmaya çalışırsın. Öğrenmeye, çeşitlendirmeye ve planlı denemeye uygunsun.",
    reportIntro:
      "Senin risk profilin Dengeli Risk Profili. Bu, piyasalardan tamamen kaçmadığını ama kontrolsüz risk almayı da tercih etmediğini gösteriyor. Enbilir'de sanal portföyünü oluştururken farklı varlık sınıflarını karşılaştırman, karar notu tutman ve AI Asistanı'nı bir al-sat sinyali değil, düşünme ortağı olarak kullanman uygun olur.",
    strengths: ["Risk ve fırsatı birlikte okuyabilirsin.", "Plan, öğrenme ve deneme arasında denge kurabilirsin.", "Makro, teknik ve haber akışını birlikte değerlendirmeye açıksın."],
    behavioralRisks: ["Bazen fazla veri bekleyip kararı geciktirebilirsin.", "Denge ararken net risk limiti yazmayı unutabilirsin.", "Tek bir güçlü sinyali gereğinden fazla önemseyebilirsin."],
    portfolioSuggestions: ["Sanal portföyde varlık dağılımı oluştur.", "Kısa, orta ve uzun vadeli senaryoları ayrı değerlendir.", "Karar notu tut.", "Tek bir sinyalle hareket etme.", "Makro rapor, teknik görünüm ve haber akışını birlikte oku."],
    assetNotes: {
      stocks: "Hisseler portföyde büyüme alanı olabilir; sektör ve vade ayrımı yap.",
      fx: "Döviz pozisyonunu makro senaryolarla birlikte değerlendir.",
      gold: "Altın, portföy oynaklığını dengelemek için karşılaştırma aracı olabilir.",
      crypto: "Kriptoyu sınırlı pay ve yazılı senaryo ile test etmek dengeni korur.",
      cash: "Nakit payı fırsat beklemek ve düşüşlerde planlı hareket etmek için işlevseldir.",
    },
  },
  {
    key: "growth",
    min: 3.41,
    max: 4.2,
    title: "Büyüme Odaklı Risk Profili",
    shortDescription:
      "Fırsatları takip etmeyi seversin ve dalgalanmalara daha dayanıklısın; ancak aşırı özgüven ve acele karar riski taşıyabilirsin.",
    reportIntro:
      "Senin risk profilin Büyüme Odaklı Risk Profili. Bu profil, fırsat arama enerjinin güçlü olduğunu ama karar kalitenin risk limiti, pozisyon büyüklüğü ve yazılı senaryo ile korunması gerektiğini anlatır.",
    strengths: ["Dalgalanma karşısında öğrenme ve fırsat arama gücün yüksek.", "Piyasa akışını düzenli takip edebilirsin.", "Büyüme potansiyeli olan temaları hızlı yakalayabilirsin."],
    behavioralRisks: ["FOMO ile erken veya fazla büyük pozisyon alabilirsin.", "Portföyde aşırı yoğunlaşma riski oluşabilir.", "Kâr sonrası daha büyük risk alma eğilimi doğabilir."],
    portfolioSuggestions: ["Risk limitlerini baştan belirle.", "Portföyde aşırı yoğunlaşmadan kaçın.", "Kâr kadar zarar senaryosunu da yaz.", "Kripto ve yüksek volatil varlıklarda pozisyon büyüklüğünü kontrol et.", "Sanal portföyde stratejini ölç, şansa bağlama."],
    assetNotes: {
      stocks: "Hisselerde büyüme temaları cazip olabilir; pozisyon büyüklüğü ve sektör dağılımını izle.",
      fx: "Döviz trendlerini aktif takip ederken makro riskleri ikinci plana atma.",
      gold: "Altını sadece düşük getiri alanı değil, stres testi ve denge aracı olarak oku.",
      crypto: "Kripto ve yüksek volatil araçlarda maksimum kayıp sınırını önceden yaz.",
      cash: "Nakit payı, fırsat kaçırma hissine karşı disiplinli bekleme alanı sağlar.",
    },
  },
  {
    key: "aggressive",
    min: 4.21,
    max: 5,
    title: "Agresif / Yüksek Risk Profili",
    shortDescription:
      "Yüksek getiri potansiyeli için yüksek dalgalanmayı kabul edebilirsin. En büyük tehlike kontrolsüz risk, aşırı işlem ve kaybı telafi etmeye çalışmaktır.",
    reportIntro:
      "Senin risk profilin Agresif / Yüksek Risk Profili. Bu profil yüksek enerji, hızlı karar ve fırsat arama isteği taşır; fakat Enbilir'de bu enerjiyi mutlaka yazılı kurallara, stop-loss disiplinine ve maksimum kayıp limitine bağlaman gerekir.",
    strengths: ["Belirsizlik ve oynaklık karşısında dayanıklılığın yüksek.", "Fırsatları hızlı fark edebilirsin.", "Sanal portföyde farklı stratejileri test etmeye isteklisin."],
    behavioralRisks: ["Aşırı işlem yapma eğilimi oluşabilir.", "Kayıp telafi etme psikolojisi yeni hatalara yol açabilir.", "Tek varlığa aşırı yüklenme ve stop-loss ihlali riski yüksektir."],
    portfolioSuggestions: ["Stop-loss, pozisyon büyüklüğü ve maksimum kayıp limitleri belirle.", "FOMO ile hareket etme.", "Aşırı işlem yapma eğilimini takip et.", "Sanal portföyde yüksek riskli stratejileri test ederken sonuçları mutlaka yazılı değerlendir.", "Getiri kadar maksimum düşüşü de izle.", "AI Asistanı'nı \"bu karar hangi durumda yanlış olur?\" sorusuyla kullan."],
    assetNotes: {
      stocks: "Hisselerde yoğunlaşma cazip gelebilir; her pozisyona çıkış planı yaz.",
      fx: "Döviz dalgalanmalarını fırsat görsen bile kaldıraç ve haber riskini sınırlı tut.",
      gold: "Altını portföy freni veya senaryo çeşitlendirme alanı olarak kullanmayı düşün.",
      crypto: "Kripto stratejilerinde maksimum kayıp, işlem sıklığı ve pozisyon büyüklüğü kuralı şart.",
      cash: "Nakit, agresif profilde bile fırsat için cephane ve psikolojik fren görevi görür.",
    },
  },
];

export function calculateAverageScore(answers: Record<number, number>) {
  const scores = riskQuestions.map((question) => answers[question.id]).filter((score): score is number => Number.isFinite(score));

  if (scores.length !== riskQuestions.length) {
    return null;
  }

  return scores.reduce((total, score) => total + score, 0) / scores.length;
}

export function formatRiskScore(score: number) {
  return score.toFixed(2);
}

export function getRiskProfile(averageScore: number) {
  return riskProfiles.find((profile) => averageScore >= profile.min && averageScore <= profile.max) ?? riskProfiles[riskProfiles.length - 1];
}

export function getRiskProfileByKey(key: string) {
  return riskProfiles.find((profile) => profile.key === key) ?? null;
}

export const recommendedNextSteps = [
  { title: "AI Asistanı'nı kullan", href: "/ai-piyasa-asistani" },
  { title: "Makro raporları oku", href: "/ai-piyasa-asistani/raporlar" },
  { title: "Sanal portföy oluştur", href: "/islem-yap" },
  { title: "İçerik Merkezi'nde risk yönetimi yazılarını incele", href: "/icerik-merkezi" },
] as const;

export const riskTestLegalWarningEn =
  "This test is not investment advice. The results are for education and awareness only. Real investment decisions should be evaluated in the context of personal financial situation, goals, time horizon, income, debt, liquidity needs, and professional advice.";

export const riskQuestionsEn: RiskQuestion[] = [
  {
    id: 1,
    category: "Uncertainty Tolerance",
    question: "What is your first reaction when markets move sharply and unexpectedly within a week?",
    options: [
      { label: "I want to close my position immediately and step away.", score: 1 },
      { label: "I get worried and usually reduce my risk.", score: 2 },
      { label: "I first try to understand what happened, then decide.", score: 3 },
      { label: "I may also see volatility as an opportunity.", score: 4 },
      { label: "I actively look for opportunities during sharp moves.", score: 5 },
    ],
  },
  {
    id: 2,
    category: "Loss Tolerance",
    question: "What would you do if your virtual portfolio lost 5% in a short time?",
    options: [
      { label: "I would feel very uncomfortable and want to exit immediately.", score: 1 },
      { label: "I would feel uncomfortable and reduce positions.", score: 2 },
      { label: "I would examine why it fell and decide according to my plan.", score: 3 },
      { label: "If my reasoning still holds, I would wait.", score: 4 },
      { label: "I could see the decline as a chance to add.", score: 5 },
    ],
  },
  {
    id: 3,
    category: "Time Horizon",
    question: "When you look at an asset with an investment mindset, which time horizon feels closest?",
    options: [
      { label: "Even daily moves affect me strongly.", score: 1 },
      { label: "I want to see results within days or weeks.", score: 2 },
      { label: "I can wait a few months.", score: 3 },
      { label: "I can be patient for 6 months to 1 year.", score: 4 },
      { label: "I can tolerate volatility for more than 1 year.", score: 5 },
    ],
  },
  {
    id: 4,
    category: "Decision Behavior",
    question: "How do you feel when an asset rises quickly?",
    options: [
      { label: "I stay away; if it has already risen, it is dangerous.", score: 1 },
      { label: "I approach very cautiously.", score: 2 },
      { label: "I first try to understand why it is rising.", score: 3 },
      { label: "If the reason is strong, I may consider a limited position.", score: 4 },
      { label: "When I see strong momentum, I can move quickly.", score: 5 },
    ],
  },
  {
    id: 5,
    category: "Portfolio Allocation",
    question: "How do you view giving a high weight to a single asset in your virtual portfolio?",
    options: [
      { label: "I definitely do not want that.", score: 1 },
      { label: "It can only be very limited.", score: 2 },
      { label: "It may be reasonable under certain conditions.", score: 3 },
      { label: "If the opportunity is strong, I can give it high weight.", score: 4 },
      { label: "I do not hesitate to concentrate in an asset I strongly believe in.", score: 5 },
    ],
  },
  {
    id: 6,
    category: "Crypto Risk Perception",
    question: "How does the high volatility of Bitcoin or cryptocurrencies make you feel?",
    options: [
      { label: "It is not suitable for me; I find it too risky.", score: 1 },
      { label: "I can follow it with a very small allocation.", score: 2 },
      { label: "I want to learn and try it in a limited way.", score: 3 },
      { label: "I can give it a meaningful place in a portfolio.", score: 4 },
      { label: "I see high volatility as an opportunity.", score: 5 },
    ],
  },
  {
    id: 7,
    category: "FX Risk",
    question: "How do you evaluate movements such as USD/TRY for a portfolio?",
    options: [
      { label: "Currency moves make me uneasy.", score: 1 },
      { label: "I only consider them in a limited way for protection.", score: 2 },
      { label: "I see FX as a portfolio diversification tool.", score: 3 },
      { label: "I actively follow currency trends.", score: 4 },
      { label: "I see FX volatility as an opportunity area.", score: 5 },
    ],
  },
  {
    id: 8,
    category: "Stock Market Risk Perception",
    question: "How do short-term declines in stocks affect you?",
    options: [
      { label: "They disturb me a lot; stocks may not be suitable for me.", score: 1 },
      { label: "I get worried and my tendency to sell increases.", score: 2 },
      { label: "I check the company and market conditions.", score: 3 },
      { label: "If my plan is not broken, I wait.", score: 4 },
      { label: "I look for buying opportunities during declines.", score: 5 },
    ],
  },
  {
    id: 9,
    category: "Gold and Safe Havens",
    question: "How do you view more traditional assets such as gold?",
    options: [
      { label: "I mostly prefer safe havens.", score: 1 },
      { label: "I want an important part of my portfolio in safe havens.", score: 2 },
      { label: "Gold can be part of a balanced portfolio.", score: 3 },
      { label: "I use gold mainly according to market conditions.", score: 4 },
      { label: "I find gold lower-return and prefer riskier assets.", score: 5 },
    ],
  },
  {
    id: 10,
    category: "News Flow",
    question: "What do you do when you see negative market news?",
    options: [
      { label: "I immediately want to get out of risk.", score: 1 },
      { label: "I act mostly cautiously.", score: 2 },
      { label: "I examine the source and likely impact of the news.", score: 3 },
      { label: "If the market overreacts, I may see opportunity.", score: 4 },
      { label: "I actively look for trades during panic moves.", score: 5 },
    ],
  },
  {
    id: 11,
    category: "Confidence in Information",
    question: "How much research do you want before acting on an investment idea?",
    options: [
      { label: "I never act without extensive research.", score: 1 },
      { label: "I want to see at least a few reliable sources.", score: 2 },
      { label: "Knowing the basics and risks is enough for me.", score: 3 },
      { label: "I can decide with quick analysis.", score: 4 },
      { label: "I want to position before the opportunity disappears.", score: 5 },
    ],
  },
  {
    id: 12,
    category: "After-Loss Behavior",
    question: "What do you do after several wrong decisions in a row?",
    options: [
      { label: "I stay away from markets for a long time.", score: 1 },
      { label: "I reduce my risk significantly.", score: 2 },
      { label: "I note my mistakes and review my strategy.", score: 3 },
      { label: "I stay active but become more selective.", score: 4 },
      { label: "I may become more aggressive to recover losses.", score: 5 },
    ],
  },
  {
    id: 13,
    category: "Return Expectations",
    question: "Which goal motivates you more in a virtual portfolio competition?",
    options: [
      { label: "Staying stable with minimal losses.", score: 1 },
      { label: "Reasonable return with low risk.", score: 2 },
      { label: "Balanced and sustainable performance.", score: 3 },
      { label: "Above-average return.", score: 4 },
      { label: "Top leaderboard ranks and high return.", score: 5 },
    ],
  },
  {
    id: 14,
    category: "Liquidity Need",
    question: "How would you act if you might need money in the short term?",
    options: [
      { label: "I stay away from risky assets.", score: 1 },
      { label: "I keep most of it liquid and low-risk.", score: 2 },
      { label: "I split part into risk and part into safety.", score: 3 },
      { label: "I can still take risk if there is opportunity.", score: 4 },
      { label: "Even with short-term needs, I may seek high return.", score: 5 },
    ],
  },
  {
    id: 15,
    category: "Time Available",
    question: "How much time can you spend following markets?",
    options: [
      { label: "Very little; therefore I do not want to take risk.", score: 1 },
      { label: "I follow in a limited way and stay cautious.", score: 2 },
      { label: "I can check regularly each week.", score: 3 },
      { label: "I can follow daily.", score: 4 },
      { label: "I can check often during the day and make active decisions.", score: 5 },
    ],
  },
  {
    id: 16,
    category: "Strategy Discipline",
    question: "How well do you stick to a prior plan when the market fluctuates?",
    options: [
      { label: "If volatility appears, I abandon the plan.", score: 1 },
      { label: "I usually change the plan.", score: 2 },
      { label: "I review the plan and revise if needed.", score: 3 },
      { label: "I can stand behind my plan.", score: 4 },
      { label: "I keep the plan but may add aggressively on opportunities.", score: 5 },
    ],
  },
  {
    id: 17,
    category: "Diversification",
    question: "What does portfolio diversification mean to you?",
    options: [
      { label: "Essential; most risk should be spread out.", score: 1 },
      { label: "I want broad diversification.", score: 2 },
      { label: "Balanced diversification is good.", score: 3 },
      { label: "I can concentrate in some areas depending on opportunity.", score: 4 },
      { label: "Too much diversification lowers return; I like concentration.", score: 5 },
    ],
  },
  {
    id: 18,
    category: "AI Usage",
    question: "If the AI Assistant says wait for an asset but you expect a strong rise, what do you do?",
    options: [
      { label: "If AI warns me, I do not trade.", score: 1 },
      { label: "I mostly follow the AI view.", score: 2 },
      { label: "I evaluate the AI view together with my own analysis.", score: 3 },
      { label: "If my analysis is strong, I may trade in a limited way.", score: 4 },
      { label: "Despite the AI warning, I may act aggressively on my conviction.", score: 5 },
    ],
  },
  {
    id: 19,
    category: "Macroeconomics",
    question: "How much do rates, inflation, and central bank decisions affect your decisions?",
    options: [
      { label: "I do not want to take risk without understanding these topics.", score: 1 },
      { label: "They matter a lot; I become cautious in uncertainty.", score: 2 },
      { label: "I use them as an important decision input.", score: 3 },
      { label: "I may seek opportunities even when macro is weak.", score: 4 },
      { label: "I put macro risks second and focus on price movement.", score: 5 },
    ],
  },
  {
    id: 20,
    category: "Social Influence / Community",
    question: "How do you feel when friends or league users earn high returns?",
    options: [
      { label: "I am not affected; I prefer to stay safe.", score: 1 },
      { label: "I am slightly affected but remain cautious.", score: 2 },
      { label: "I compare and try to learn.", score: 3 },
      { label: "I may try more active experiments.", score: 4 },
      { label: "I may take aggressive risk to avoid falling behind.", score: 5 },
    ],
  },
  {
    id: 21,
    category: "FOMO",
    question: "What do you do when you think you missed an opportunity?",
    options: [
      { label: "I do not chase it.", score: 1 },
      { label: "I usually stay away.", score: 2 },
      { label: "I wait for a better entry level.", score: 3 },
      { label: "I may join with a limited position.", score: 4 },
      { label: "I want to enter before it gets away.", score: 5 },
    ],
  },
  {
    id: 22,
    category: "Stop-Loss Discipline",
    question: "If a trade does not go as expected, how are you with cutting losses?",
    options: [
      { label: "I avoid risky trades in the first place to prevent losses.", score: 1 },
      { label: "I tend to exit at a small loss.", score: 2 },
      { label: "I exit according to a predefined level.", score: 3 },
      { label: "If my reasoning continues, I can wait.", score: 4 },
      { label: "Even if the loss grows, I may hold believing it will recover.", score: 5 },
    ],
  },
  {
    id: 23,
    category: "After-Gain Behavior",
    question: "What do you do if your virtual portfolio gains well in a short time?",
    options: [
      { label: "I immediately reduce risk to protect the gain.", score: 1 },
      { label: "I move part of it into safer areas.", score: 2 },
      { label: "I rebalance according to my plan.", score: 3 },
      { label: "If the trend continues, I can maintain the position.", score: 4 },
      { label: "After success, I may take larger risk.", score: 5 },
    ],
  },
  {
    id: 24,
    category: "Learning Approach",
    question: "Which learning style in financial markets feels closer to you?",
    options: [
      { label: "I want to learn fully first, then try.", score: 1 },
      { label: "I learn with very small experiments.", score: 2 },
      { label: "I combine learning and experimentation.", score: 3 },
      { label: "I learn quickly by experiencing.", score: 4 },
      { label: "I prefer learning by taking risk and seeing results.", score: 5 },
    ],
  },
  {
    id: 25,
    category: "Asset Selection",
    question: "How do you approach a new investment theme you do not know but everyone is discussing?",
    options: [
      { label: "I stay away.", score: 1 },
      { label: "I research for a long time first.", score: 2 },
      { label: "I may make a small virtual test.", score: 3 },
      { label: "If I see potential, I can allocate meaningfully.", score: 4 },
      { label: "I may take high risk to enter early.", score: 5 },
    ],
  },
  {
    id: 26,
    category: "Psychological Resilience",
    question: "How is your mood affected if your portfolio is negative for several days in a row?",
    options: [
      { label: "I am strongly affected and cool off from markets.", score: 1 },
      { label: "It lowers my morale and I reduce risk.", score: 2 },
      { label: "I am affected but try to analyze it.", score: 3 },
      { label: "I consider it normal.", score: 4 },
      { label: "It motivates me more and I look for opportunities.", score: 5 },
    ],
  },
  {
    id: 27,
    category: "Leverage Perception",
    question: "What do you think about leveraged trades or very high-volatility instruments?",
    options: [
      { label: "Definitely not suitable for me.", score: 1 },
      { label: "Very risky; I stay away.", score: 2 },
      { label: "I only examine them very limitedly for education.", score: 3 },
      { label: "If I understand the risk, I can test in a controlled way.", score: 4 },
      { label: "I find them attractive for high return.", score: 5 },
    ],
  },
  {
    id: 28,
    category: "Goal Setting",
    question: "Which virtual portfolio goal feels closer to you?",
    options: [
      { label: "First, I aim not to lose.", score: 1 },
      { label: "I want low-risk, steady progress.", score: 2 },
      { label: "I target balanced return and learning.", score: 3 },
      { label: "I want to beat the market average.", score: 4 },
      { label: "I target the highest return.", score: 5 },
    ],
  },
  {
    id: 29,
    category: "Market Decline",
    question: "What do you do if the broad market falls 10%?",
    options: [
      { label: "I move completely away from risky assets.", score: 1 },
      { label: "I reduce my risk.", score: 2 },
      { label: "I examine the reason for the decline.", score: 3 },
      { label: "I look for gradual buying opportunities.", score: 4 },
      { label: "I see a sharp decline as a major opportunity.", score: 5 },
    ],
  },
  {
    id: 30,
    category: "Portfolio Monitoring",
    question: "How often do you want to check your portfolio?",
    options: [
      { label: "Checking too often stresses me.", score: 1 },
      { label: "A few times a week is enough.", score: 2 },
      { label: "I can check once a day.", score: 3 },
      { label: "I check several times during the day.", score: 4 },
      { label: "I want to monitor constantly and decide quickly.", score: 5 },
    ],
  },
  {
    id: 31,
    category: "Decision Rationale",
    question: "What would you think if you had to write a reason before making a virtual trade?",
    options: [
      { label: "That would be great; I would not trade without writing.", score: 1 },
      { label: "I find it useful.", score: 2 },
      { label: "Sometimes I write, sometimes I do not.", score: 3 },
      { label: "It may slow me down, but I write for important trades.", score: 4 },
      { label: "Opportunities move fast; I do not want to lose time writing.", score: 5 },
    ],
  },
  {
    id: 32,
    category: "Risk Limit",
    question: "What maximum virtual loss can you tolerate in one position?",
    options: [
      { label: "Even 1-2% makes me uncomfortable.", score: 1 },
      { label: "I can tolerate 3-5%.", score: 2 },
      { label: "I can tolerate 5-10% if planned.", score: 3 },
      { label: "I can accept 10-20% volatility.", score: 4 },
      { label: "Even 20%+ volatility is acceptable if it fits my strategy.", score: 5 },
    ],
  },
  {
    id: 33,
    category: "Scenario Thinking",
    question: "Do you think, what happens if I am wrong, before making a decision?",
    options: [
      { label: "Always; this is the most important question for me.", score: 1 },
      { label: "I think about it most of the time.", score: 2 },
      { label: "I think about it for important decisions.", score: 3 },
      { label: "Sometimes, but I also look at the opportunity.", score: 4 },
      { label: "I usually focus on the opportunity first.", score: 5 },
    ],
  },
  {
    id: 34,
    category: "Capital Protection vs Growth",
    question: "Which is more important to you: protecting or growing your capital?",
    options: [
      { label: "Definitely protecting it.", score: 1 },
      { label: "Protect first, then grow in a limited way.", score: 2 },
      { label: "A balance between protection and growth.", score: 3 },
      { label: "Growth is more important.", score: 4 },
      { label: "I accept high risk for high growth.", score: 5 },
    ],
  },
  {
    id: 35,
    category: "General Risk Perception",
    question: "How would you define yourself in terms of market risk?",
    options: [
      { label: "Very cautious.", score: 1 },
      { label: "Cautious.", score: 2 },
      { label: "Balanced.", score: 3 },
      { label: "I can take risk.", score: 4 },
      { label: "I do not hesitate to take high risk.", score: 5 },
    ],
  },
];

export const riskProfilesEn: RiskProfile[] = [
  {
    key: "very_cautious",
    min: 1,
    max: 1.8,
    title: "Very Cautious Risk Profile",
    shortDescription: "You are highly uncomfortable with uncertainty, sensitive to capital loss, and may have low tolerance for volatility.",
    reportIntro:
      "Your profile is Very Cautious. This does not mean you must stay away from markets; it means you may benefit from first learning the concepts, observing low-volatility behavior, and recognizing panic reactions before making decisions.",
    strengths: ["Your capital-protection reflex is strong.", "You can notice unplanned risks early.", "You tend to move through learning without rushing."],
    behavioralRisks: ["You may approach panic selling during short-term declines.", "You may see opportunities mostly as danger.", "When uncertainty rises, you may withdraw completely instead of making a measured decision."],
    portfolioSuggestions: ["First observe low volatility in the virtual portfolio.", "Avoid concentrating in one asset.", "Complete financial literacy content first.", "Do not decide based only on short-term price moves.", "Do not move into high-risk assets before learning core market concepts."],
    assetNotes: {
      stocks: "Track stocks with small virtual experiments and learn sector differences.",
      fx: "Evaluate FX through protection and diversification concepts.",
      gold: "Gold may be a useful observation area for understanding safe-haven behavior.",
      crypto: "Treat crypto first as an education and observation topic; simulate high volatility with small weights.",
      cash: "Cash and lower-risk areas can reduce decision stress and provide balance.",
    },
  },
  {
    key: "cautious",
    min: 1.81,
    max: 2.6,
    title: "Cautious Risk Profile",
    shortDescription: "You can take limited risk, but larger losses may weaken decision quality. A protective and balanced approach looks more suitable.",
    reportIntro:
      "Your profile is Cautious. This points to a decision style that progresses by learning, wants to understand risk first, and gains strength from writing the loss scenario in advance.",
    strengths: ["You account for the possibility of loss.", "You are open to diversification.", "You can use AI and reports to challenge your decision."],
    behavioralRisks: ["You may become overly defensive when losses grow.", "You may sometimes be late to well-planned opportunities.", "Social comparison may distort your risk perception."],
    portfolioSuggestions: ["Learn portfolio diversification.", "Compare low- and medium-risk assets.", "Progress with small steps in virtual trades.", "Write loss scenarios in advance.", "Use the AI Assistant to question your decision."],
    assetNotes: {
      stocks: "Focus on broad baskets, sector differences, and company quality.",
      fx: "Think of FX as a risk-balancing component, not only a return tool.",
      gold: "Gold may provide balance and psychological comfort in a portfolio.",
      crypto: "A small virtual allocation and clear loss limit are healthier for crypto.",
      cash: "Cash can remain a strategic area that reduces pressure for sudden decisions.",
    },
  },
  {
    key: "balanced",
    min: 2.61,
    max: 3.4,
    title: "Balanced Risk Profile",
    shortDescription: "You try to balance risk and return. You are suited to learning, diversification, and planned experimentation.",
    reportIntro:
      "Your profile is Balanced. You do not fully avoid markets, but you also do not prefer uncontrolled risk. In Enbilir, it may suit you to compare asset classes, keep decision notes, and use the AI Assistant as a thinking partner rather than a buy-sell signal.",
    strengths: ["You can read risk and opportunity together.", "You can balance planning, learning, and experimentation.", "You are open to combining macro, technical, and news context."],
    behavioralRisks: ["You may sometimes delay decisions while waiting for too much data.", "You may forget to write a clear risk limit while seeking balance.", "You may give too much weight to one strong signal."],
    portfolioSuggestions: ["Create an asset allocation in the virtual portfolio.", "Evaluate short-, medium-, and long-term scenarios separately.", "Keep decision notes.", "Do not act on a single signal.", "Read macro reports, technical context, and news flow together."],
    assetNotes: {
      stocks: "Stocks can be a growth area; separate sectors and time horizons.",
      fx: "Evaluate FX positions together with macro scenarios.",
      gold: "Gold can be a comparison tool for balancing portfolio volatility.",
      crypto: "Testing crypto with limited weight and written scenarios helps preserve balance.",
      cash: "Cash is useful for waiting for opportunities and acting with a plan during declines.",
    },
  },
  {
    key: "growth",
    min: 3.41,
    max: 4.2,
    title: "Growth-Oriented Risk Profile",
    shortDescription: "You like following opportunities and tolerate volatility better, but overconfidence and rushed decisions can become risks.",
    reportIntro:
      "Your profile is Growth-Oriented. Your opportunity-seeking energy is strong, but decision quality should be protected with risk limits, position sizing, and written scenarios.",
    strengths: ["You have strong learning and opportunity-seeking ability during volatility.", "You can follow market flow regularly.", "You may quickly notice growth themes."],
    behavioralRisks: ["You may enter too early or too large because of FOMO.", "Overconcentration may appear in the portfolio.", "After gains, you may be tempted to take larger risk."],
    portfolioSuggestions: ["Define risk limits in advance.", "Avoid overconcentration in the portfolio.", "Write the loss scenario as clearly as the profit scenario.", "Control position size in crypto and high-volatility assets.", "Measure your strategy in the virtual portfolio; do not attribute it only to luck."],
    assetNotes: {
      stocks: "Growth themes may be attractive; monitor position size and sector allocation.",
      fx: "While actively following FX trends, do not push macro risks aside.",
      gold: "Read gold as a stress-test and balance tool, not only as a lower-return area.",
      crypto: "Write maximum loss limits before entering crypto and other high-volatility tools.",
      cash: "Cash creates disciplined waiting space against the feeling of missing opportunities.",
    },
  },
  {
    key: "aggressive",
    min: 4.21,
    max: 5,
    title: "Aggressive / High Risk Profile",
    shortDescription: "You may accept high volatility for high return potential. The main danger is uncontrolled risk, overtrading, and trying to recover losses.",
    reportIntro:
      "Your profile is Aggressive / High Risk. It carries high energy, fast decisions, and a strong search for opportunities; in Enbilir this energy should be tied to written rules, stop-loss discipline, and maximum loss limits.",
    strengths: ["You have high resilience to uncertainty and volatility.", "You can notice opportunities quickly.", "You are willing to test different strategies in the virtual portfolio."],
    behavioralRisks: ["Overtrading may appear.", "The psychology of recovering losses may lead to new mistakes.", "Overloading one asset and violating stop-loss rules are major risks."],
    portfolioSuggestions: ["Define stop-loss, position size, and maximum loss limits.", "Do not act with FOMO.", "Track your tendency to overtrade.", "When testing high-risk strategies in the virtual portfolio, review results in writing.", "Track maximum drawdown as much as return.", "Use the AI Assistant with the question: in what case would this decision be wrong?"],
    assetNotes: {
      stocks: "Concentration in stocks may feel attractive; write an exit plan for every position.",
      fx: "Even if FX volatility looks like opportunity, limit leverage and news risk.",
      gold: "Consider gold as a portfolio brake or scenario-diversification area.",
      crypto: "For crypto strategies, maximum loss, trade frequency, and position-size rules are essential.",
      cash: "Even for aggressive profiles, cash acts as both opportunity capital and a psychological brake.",
    },
  },
];

export const recommendedNextStepsEn = [
  { title: "Use the AI Assistant", href: "/ai-piyasa-asistani" },
  { title: "Read macro reports", href: "/ai-piyasa-asistani/raporlar" },
  { title: "Create a virtual portfolio", href: "/islem-yap" },
  { title: "Review risk-management content in the Content Hub", href: "/icerik-merkezi" },
] as const;

const activeRiskQuestionIds = [1, 2, 3, 5, 6, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 20, 21, 27, 32, 35] as const;

function selectActiveRiskQuestions(source: RiskQuestion[]) {
  const questionsById = new Map(source.map((question) => [question.id, question]));

  return activeRiskQuestionIds.map((sourceId, index) => {
    const question = questionsById.get(sourceId);
    if (!question) {
      throw new Error(`Risk question ${sourceId} is missing.`);
    }

    return { ...question, id: index + 1 };
  });
}

export function getRiskQuestionsForLocale(locale: string) {
  return selectActiveRiskQuestions(locale === "en" ? riskQuestionsEn : riskQuestions);
}

export function getRiskProfilesForLocale(locale: string) {
  return locale === "en" ? riskProfilesEn : riskProfiles;
}

export function getRiskLegalWarningForLocale(locale: string) {
  return locale === "en" ? riskTestLegalWarningEn : riskTestLegalWarning;
}

export function getRecommendedNextStepsForLocale(locale: string) {
  return locale === "en" ? recommendedNextStepsEn : recommendedNextSteps;
}

export function calculateAverageScoreForQuestions(questions: RiskQuestion[], answers: Record<number, number>) {
  const scores = questions.map((question) => answers[question.id]).filter((score): score is number => Number.isFinite(score));

  if (scores.length !== questions.length) {
    return null;
  }

  return scores.reduce((total, score) => total + score, 0) / scores.length;
}

export function getRiskProfileForLocale(averageScore: number, locale: string) {
  const profiles = getRiskProfilesForLocale(locale);
  return profiles.find((profile) => averageScore >= profile.min && averageScore <= profile.max) ?? profiles[profiles.length - 1];
}

export function getRiskProfileByKeyForLocale(key: string, locale: string) {
  return getRiskProfilesForLocale(locale).find((profile) => profile.key === key) ?? null;
}
