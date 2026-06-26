import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

function readEnvFile() {
  const envPath = path.resolve(".env");
  if (!fs.existsSync(envPath)) {
    return {};
  }

  return Object.fromEntries(
    fs.readFileSync(envPath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        const key = line.slice(0, index).trim();
        const value = line.slice(index + 1).trim().replace(/^["']|["']$/g, "");
        return [key, value];
      }),
  );
}

function getDatabasePath() {
  const env = { ...readEnvFile(), ...process.env };
  const databaseUrl = env.DATABASE_URL ?? "file:./dev.db";

  if (!databaseUrl.startsWith("file:")) {
    throw new Error(`Only SQLite file DATABASE_URL values are supported by this script. Received: ${databaseUrl}`);
  }

  const filePath = databaseUrl.replace(/^file:/, "");
  return path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
}

const posts = [
  {
    id: "managed-home-market-calm-decision",
    title: "Piyasayı Okumaya Başlarken: Önce Sakin Kalmak",
    excerpt: "Piyasada ilk ihtiyaç daha çok gösterge değil, doğru soruyu sorabilme alışkanlığıdır. Enbilir bu alışkanlığı sade, uygulanabilir ve ölçülebilir hale getirmek için kuruldu.",
    sortOrder: 300,
    body: `Piyasa okuryazarlığı bana göre ekrana daha fazla çizgi koymak değildir. Elbette grafik, RSI, MACD, trend çizgisi, hacim ve destek direnç bölgeleri önemlidir. Fakat bunların hiçbiri, kullanıcının ne aradığını bilmediği yerde tek başına doğru karar üretemez. Önce sakin kalmak gerekir. Sonra hangi soruya cevap aradığımızı belirlemek gerekir.

Bir varlığa bakarken ilk soru şu olmalı: Bu hareket gerçekten güçlü mü, yoksa sadece kısa süreli bir heyecan mı? Bu soruyu sormadan yapılan her işlem, çoğu zaman kişinin kendi sabırsızlığını piyasa yorumu zannetmesine neden olur. Enbilir'de sanal portföy yaklaşımını değerli bulmamın sebebi tam da budur. Kullanıcı gerçek para baskısı olmadan kendi refleksini görür.

Yeni başlayan bir kişi genellikle fiyatın son hareketine fazla önem verir. Yükselen şeyi kaçırdığını düşünür, düşen şeyde ise fırsat gördüğünü sanır. Oysa iyi bir piyasa okuması, fiyatın yalnızca nereye gittiğine değil, oraya nasıl gittiğine de bakar. Hacim eşlik ediyor mu? Haber akışı destekliyor mu? Genel piyasa havası buna uygun mu? Aynı anda döviz, faiz, emtia ve borsa tarafında ne oluyor?

Burada amaç kimseye al veya sat demek değildir. Zaten bunu yapmak doğru da değildir. Amaç, kullanıcının kendi kararını verirken daha düzenli düşünmesini sağlamaktır. Bir karar alınmadan önce zaman dilimi, risk seviyesi, hedef ve olası ters senaryo yazılmalıdır. Bunlar yazılmadığında işlem değil, tahmin yapılmış olur.

Piyasanın dili çoğu zaman karmaşık görünür. Fakat iyi anlatıldığında temel mantık çok sadedir. Trend bize yönü gösterir. Hacim, bu yönün ne kadar ciddiye alınabileceğini anlatır. RSI hareketin yorulup yorulmadığını gösterir. MACD ivmenin değişip değişmediğine dair bir uyarı verir. Hiçbiri tek başına karar değildir; birlikte okunduğunda anlam kazanır.

Benim önemsediğim taraf, kullanıcının bu göstergeleri ezberlemesi değil, kendi cümlesiyle açıklayabilmesidir. Bir kullanıcı “Bu varlık yükseliyor ama hacim zayıf, ayrıca genel piyasa risk iştahı düşük” diyebiliyorsa, orada okuryazarlık başlamış demektir. Bu cümleyi kuramıyorsa, grafik ne kadar güzel görünürse görünsün karar eksiktir.

Sanal portföyün en büyük avantajı, kişinin kendi davranış arşivini oluşturmasıdır. Nerede acele etmiş, nerede beklemiş, hangi habere fazla tepki vermiş, hangi göstergede yanılmış; bunlar zaman içinde görünür hale gelir. Piyasayı öğrenmek biraz da insanın kendisini öğrenmesidir.

Bu yüzden Enbilir'de raporlar, ligler ve portföy ekranı birbirinden ayrı parçalar gibi düşünülmemeli. Rapor piyasa resmini verir. Lig, topluluk ritmi oluşturur. Portföy ekranı kişinin karar izini tutar. Eğitim içerikleri ise bu kararların dilini güçlendirir. Hepsi birlikte çalıştığında öğrenme kalıcı hale gelir.

Piyasada her gün yeni bir haber çıkar. Bir gün petrol konuşulur, bir gün altın, bir gün teknoloji hisseleri, bir gün faiz beklentisi. Fakat her habere aynı ağırlığı vermek doğru değildir. Önemli olan, haberin fiyatın içine ne kadar girdiğini ve hangi varlık gruplarını etkilediğini ayırabilmektir.

Kullanıcıların en sık yaptığı hata, sonucun doğru çıkmasını iyi karar zannetmesidir. Oysa kısa vadede yanlış yöntemle doğru sonuç almak mümkündür. Enbilir'in eğitim tarafı bu nedenle sadece sonuçla ilgilenmez; kararın nasıl alındığına bakar. Çünkü uzun vadede kişiyi koruyan şey sonuç değil, yöntemdir.

Bu platformda yazılan her metnin arkasında aynı düşünce var: Piyasayı takip eden kişi daha bağımsız düşünebilsin, kendi riskini daha iyi tarif edebilsin ve kalabalığın heyecanına kapılmadan karar verebilsin. Bu bir günde olmaz. Ama düzenli tekrar, sade anlatım ve ölçülebilir pratikle olur.

Son olarak şunu özellikle belirtmek gerekir: Buradaki anlatımlar yatırım tavsiyesi değildir. Ama piyasayı daha sakin, daha disiplinli ve daha bilinçli okumak isteyen herkes için bir çalışma zemini sunar. Bence finansal okuryazarlık tam da böyle başlar: önce sakin kalmak, sonra neye baktığını bilmek.`,
  },
  {
    id: "managed-home-virtual-portfolio-serious",
    title: "Sanal Portföy Neden Ciddiye Alınmalı?",
    excerpt: "Sanal portföy oyun gibi görünse de doğru kullanıldığında kişinin risk anlayışını, sabrını ve karar disiplinini gösteren çok değerli bir aynadır.",
    sortOrder: 290,
    body: `Sanal portföy bazı kişilere ilk bakışta sadece deneme alanı gibi gelir. Oysa iyi tasarlanmış bir sanal portföy, kullanıcının piyasaya karşı davranışını ortaya çıkaran ciddi bir eğitim aracıdır. Çünkü gerçek parayla işlem yapmadan önce kişinin kendisini tanıması gerekir. Ne kadar acele ediyor, düşüşte paniğe kapılıyor mu, yükselişte fazla özgüvenli mi davranıyor; bunları görmek çok kıymetlidir.

Finansal okuryazarlığın önemli bir bölümü bilgi değil davranıştır. Kişi bir varlığın ne olduğunu okuyabilir, grafik göstergelerini öğrenebilir, haber akışını takip edebilir. Fakat karar anında disiplin bozuluyorsa, bilgi tek başına yeterli olmaz. Sanal portföy bu davranış tarafını görünür kılar.

Enbilir'deki yaklaşımın merkezinde bu yüzden sanal para ile gerçekçi karar ortamı vardır. Kullanıcı altın, gümüş, döviz, borsa endeksleri, teknoloji hisseleri, enerji tarafı veya kripto varlıklar arasında seçim yaparken aslında bir öncelik sırası kurar. Bu öncelik sırası zamanla kişinin piyasa karakterini gösterir.

Bir kullanıcı sürekli aynı varlığa dönüyorsa bunun sebebi incelenmelidir. Gerçekten o alanı mı iyi biliyor, yoksa tanıdık geldiği için mi orada kalıyor? Sürekli çok sayıda işlem yapıyorsa bu öğrenme isteği mi, yoksa sabırsızlık mı? Sanal portföy bu soruları konuşmak için iyi bir zemin sağlar.

Benim burada önemsediğim nokta, kullanıcının tek bir işlemde başarılı olması değildir. Önemli olan, kararların zaman içinde tutarlı hale gelmesidir. Bir hafta çok risk alıp sonraki hafta tamamen çekilmek, çoğu zaman piyasa bilgisinden çok duygusal dalgalanmayı gösterir. Bu da eğitimle düzeltilebilir.

Sanal portföy ayrıca topluluk içinde çok faydalıdır. Çünkü insanlar yalnızca kendi sonucunu değil, başkalarının karar tarzını da görür. Bir kişi daha temkinli davranırken başka biri daha agresif olabilir. Bu farklar doğru yönetildiğinde yargı değil öğrenme üretir. Rotary gibi topluluklarda bu taraf özellikle değerlidir.

Lig sistemi bu noktada motivasyon sağlar. Fakat lig yalnızca birincilik yarışı olarak görülmemelidir. Esas değer, kişinin kendi ilerlemesini takip edebilmesidir. Geçen hafta nasıl karar vermişti, bu hafta neyi değiştirdi, hangi hatayı tekrarlamadı? Bunlar görüldüğünde sanal portföy gerçek bir öğrenme defterine dönüşür.

Piyasa okuryazarlığında en zor konulardan biri risk algısıdır. Risk sadece kaybetme ihtimali değildir. Risk, ne kadarını riske attığını, hangi koşulda çıkacağını ve yanıldığında ne yapacağını bilmektir. Sanal portföy bu sorulara zarar vermeden cevap arama imkanı sunar.

Kullanıcıların raporları okuduktan sonra portföyde ne yaptığı da önemlidir. Makro raporda dolar güçleniyor deniyorsa herkes aynı kararı mı vermeli? Hayır. Kişinin vadesi, risk iştahı ve mevcut dağılımı farklıdır. Bu yüzden rapor bilgi verir, karar yine kullanıcıya aittir. Platformun doğru kullanımında bu ayrım net olmalıdır.

Sanal portföyün bir başka faydası da dili geliştirmesidir. Kullanıcı zamanla “aldım çünkü yükselecek” demek yerine, “bu varlıkta trend güçlü, hacim destekli, fakat kısa vadede aşırı alım bölgesine yaklaştığı için pozisyonu sınırlı tutuyorum” diyebilir. Bu cümle finansal okuryazarlığın ilerlediğini gösterir.

Bu metinlerin amacı kimseyi işlem yapmaya teşvik etmek değildir. Amaç, karar öncesi düşünmeyi öğretmektir. Her kullanıcı kendi kararından sorumludur. Burada verilen bilgiler, kişisel değerlendirme ve eğitim amaçlıdır.

Sanal portföy ciddiye alındığında, kullanıcı piyasayı sadece dışarıdan izleyen biri olmaktan çıkar. Kendi kararlarını, hatalarını ve gelişimini gören biri haline gelir. Bana göre Enbilir'in en güçlü taraflarından biri budur: Öğrenmeyi soyut bir bilgi olmaktan çıkarıp kullanıcının günlük pratiğine taşır.`,
  },
  {
    id: "managed-home-community-learning",
    title: "Toplulukla Öğrenmek: Piyasada Tek Başına Kalmamak",
    excerpt: "Piyasa takibi bireysel bir uğraş gibi görünür; fakat doğru topluluk içinde yapıldığında öğrenme daha düzenli, daha kalıcı ve daha keyifli hale gelir.",
    sortOrder: 280,
    body: `Piyasayı takip etmek çoğu zaman yalnız yapılan bir iş gibi görünür. Kişi ekranın başına geçer, fiyatlara bakar, haberleri okur ve kendi kararını verir. Fakat finansal okuryazarlık yalnızca bireysel bilgiyle büyümez. Doğru topluluk içinde tartışıldığında, soru sorulduğunda ve farklı bakışlar görüldüğünde çok daha sağlam gelişir.

Toplulukla öğrenmenin ilk faydası ritimdir. İnsan tek başına başladığı birçok şeyi yarıda bırakabilir. Ama bir grup içinde düzenli gündem oluştuğunda takip daha sürdürülebilir hale gelir. Haftalık ligler, dönemsel yarışmalar ve ortak rapor okumaları bu ritmi güçlendirir.

Rotary gibi güven ilişkisi olan topluluklarda bu yapı daha doğal işler. Çünkü insanlar yalnızca sonucu değil, düşünme biçimini de paylaşabilir. Bir üye neden altına ağırlık verdiğini anlatır, bir başkası teknoloji hisselerinde neden temkinli olduğunu söyler, başka biri döviz tarafındaki beklentisini açıklar. Bu konuşmalar doğru zeminde yapılırsa herkesin ufkunu açar.

Enbilir'in burada kurmak istediği şey, gürültülü bir yatırım forumu değildir. Tam tersine, daha sakin ve eğitim odaklı bir alan oluşturmaktır. Herkesin birbirine al veya sat dediği bir ortam yerine, “Bu kararı hangi gerekçeyle aldın?” sorusunun sorulduğu bir düzen daha kıymetlidir.

Toplulukta öğrenme aynı zamanda hatayı normalleştirir. Piyasada herkes yanılabilir. Önemli olan yanılmamak değil, yanıldığında bunu anlayabilmek ve aynı hatayı sürekli tekrar etmemektir. Sanal portföy ve lig yapısı, hataları güvenli bir alanda görünür kılar.

Bir kullanıcının portföyü yükselmiş olabilir, fakat karar süreci zayıf olabilir. Başka bir kullanıcının sonucu kısa vadede kötü olabilir, ama yöntemi sağlam olabilir. Topluluk içinde bu ayrımı konuşabilmek çok önemlidir. Çünkü finansal okuryazarlık sadece kazananı alkışlamakla gelişmez; doğru yöntemi anlamakla gelişir.

Makro raporlar da topluluk içinde daha anlamlı hale gelir. Altın, gümüş, dolar, euro, Türk lirası, BIST 100, Dow Jones, Nasdaq, petrol, enerji hisseleri, yapay zeka hisseleri veya Uzak Doğu borsaları tek tek değerlendirildiğinde bilgi verir. Fakat grup içinde bu bilgilerin portföye nasıl yansıdığı konuşulduğunda öğrenme derinleşir.

Burada dikkat edilmesi gereken sınır yatırım tavsiyesi vermemektir. Platformun dili bu yüzden kişisel görüş, eğitim ve değerlendirme çizgisinde kalmalıdır. Her kullanıcı kendi riskini, vadesini ve hedefini kendisi belirlemelidir. Topluluk, bu kararı onun yerine vermez; daha iyi düşünmesine yardımcı olur.

Katılımın büyümesi için içeriklerin de anlaşılır olması gerekir. Uzun uzun teknik terimler kullanmak bazen bilgi veriyor gibi görünür ama çoğu kişiyi dışarıda bırakır. İyi içerik, karmaşık konuyu hafife almadan sadeleştirir. Kullanıcı okuduğunda “Bunu ben de takip edebilirim” diyebilmelidir.

Benim sevdiğim öğrenme biçimi budur: önce sade anlatım, sonra örnek, sonra uygulama. Enbilir'de blog yazısı bir kavramı anlatır, rapor güncel piyasaya bağlar, sanal portföy uygulamayı gösterir, lig ise bu süreci topluluk içine taşır. Bu zincir kopmadığında platform sadece ziyaret edilen bir site değil, düzenli kullanılan bir öğrenme alanı olur.

Toplulukla öğrenmek aynı zamanda motivasyon üretir. İnsan başkalarının ilerlediğini gördüğünde kendi çalışmasını da ciddiye alır. Rozetler, sıralamalar ve dönemsel başarılar bu nedenle yalnızca süs değildir. Doğru kullanıldığında öğrenmenin devam etmesine yardımcı olur.

Sonuç olarak piyasada tek başına kalmamak, karar sorumluluğunu başkasına vermek anlamına gelmez. Tam tersine, daha bilinçli karar verebilmek için daha iyi bir çevre kurmak anlamına gelir. Enbilir'in topluluk tarafı bu yüzden önemlidir. Amaç, herkesin aynı şeyi düşünmesi değil; herkesin daha iyi düşünmeyi öğrenmesidir.`,
  },
  {
    id: "managed-bilanco-okuma-teknikleri",
    title: "Örneklerle Bilanço Okuma: Şirketin Fotoğrafına Nereden Bakmalı?",
    excerpt: "Bilanço okumak ezber işi değildir. Varlık, borç, özkaynak, nakit ve stok ilişkisini sade örneklerle okuyunca şirketin hikayesi daha görünür hale gelir.",
    sortOrder: 420,
    body: `Bilanço, bir şirketin belirli bir tarihte çekilmiş finansal fotoğrafıdır. Bu fotoğraf bize şirketin neye sahip olduğunu, ne kadar borcu bulunduğunu ve ortaklara ait özkaynağın hangi seviyede olduğunu gösterir. Ben bilanço okumaya başlarken önce karmaşık kalemlere değil, üç büyük başlığa bakılmasını öneririm: varlıklar, yükümlülükler ve özkaynaklar.

Basit formül şudur: Varlıklar eşittir borçlar artı özkaynaklar. Şirketin 100 birim varlığı varsa ve bunun 60 birimi borçla finanse edilmişse, 40 birim özkaynak vardır. Bu oran bize şirketin ne kadar kaldıraç kullandığını anlatır. Borç kötü bir şey değildir, ama borcun şirketin nakit üretme gücüyle uyumlu olması gerekir.

Örnek olarak iki şirket düşünelim. Birinci şirketin 1 milyar TL varlığı, 300 milyon TL borcu ve 700 milyon TL özkaynağı olsun. İkinci şirketin de 1 milyar TL varlığı var ama borcu 850 milyon TL olsun. İki şirketin varlık büyüklüğü aynı görünür, fakat risk profili aynı değildir. İkinci şirket daha yüksek borç taşıdığı için faiz, kur ve satış dalgalanmalarına daha hassas olabilir.

Bilanço okurken dönen varlıklar ile kısa vadeli borçlar ilişkisi ayrıca önemlidir. Dönen varlıklar nakit, ticari alacak, stok gibi bir yıl içinde nakde dönmesi beklenen kalemlerdir. Kısa vadeli borçlar ise yakın dönemde ödenmesi gereken yükümlülüklerdir. Şirketin kısa vadeli borcu dönen varlıklarından çok daha hızlı büyüyorsa dikkat gerekir.

Stok kalemi de iyi okunmalıdır. Stok artışı bazen büyüme hazırlığıdır, bazen de satılamayan ürün birikimidir. Bunu anlamak için gelir tablosuyla birlikte bakmak gerekir. Satışlar artarken stok makul ölçüde artıyorsa doğal olabilir. Satışlar zayıflarken stok hızla büyüyorsa işletme sermayesi baskısı oluşabilir.

Ticari alacaklar da aynı mantıkla okunur. Şirket satış yapıyor ama parasını geç tahsil ediyorsa kar kağıt üzerinde görünür, nakit kasaya zamanında girmeyebilir. Bu nedenle bilanço okurken yalnızca büyüklüklere değil, kalemlerin birbirleriyle konuşmasına bakmak gerekir.

Özkaynak tarafında geçmiş yıl karları ve dönem karı bize şirketin kendi içinde ne kadar kaynak biriktirdiğini gösterir. Sürekli zarar eden bir şirketin özkaynağı eriyebilir. Bu durum uzun vadede borçlanma kapasitesini ve yatırım gücünü etkiler.

Bilanço tek başına karar verdirmez. Gelir tablosu ve nakit akış tablosuyla birlikte okunmalıdır. Bilanço fotoğrafsa, gelir tablosu film şeridi, nakit akış tablosu ise gerçekten kasaya giren çıkan paradır. Üçü birlikte okunmadığında şirket eksik anlaşılır.

Bu yazının amacı herhangi bir şirket için al veya sat demek değildir. Ama kullanıcı bilanço okumayı öğrendiğinde piyasa haberini daha sağlıklı yorumlar. Bir şirketin fiyatı yükseliyor diye finansal yapısı güçlü sanmaz; önce bilançosuna, borcuna, nakdine ve işletme sermayesine bakar.`,
  },
  {
    id: "managed-finansci-olmayanlar-finansal-tablo",
    title: "Finansçı Olmayanlar İçin Finansal Tabloları Anlama Rehberi",
    excerpt: "Finansal tablolar göz korkutmak zorunda değildir. Üç tabloyu üç basit soruya indirince resim sadeleşir: Ne var, ne kazandı, kasaya ne girdi?",
    sortOrder: 410,
    body: `Finansçı olmayan kişiler için finansal tablolar ilk bakışta yorucu görünebilir. Satırlar, kalemler, dipnotlar ve oranlar insanı hızlıca uzaklaştırabilir. Oysa başlangıçta yapılması gereken şey bütün tabloyu aynı anda çözmeye çalışmak değildir. Önce üç ana soruyu sormak yeterlidir.

Birinci soru şudur: Şirketin neyi var ve ne kadar borcu var? Bu sorunun cevabı bilançodadır. Bilanço bize varlıkları, borçları ve özkaynağı gösterir. Bir şirketin binası, makinesi, nakdi, stokları ve alacakları varlık tarafında; banka kredileri, tedarikçi borçları ve diğer yükümlülükleri borç tarafında görülür.

İkinci soru şudur: Şirket bu dönem ne kadar satış yaptı ve bundan ne kadar kar kaldı? Bu sorunun cevabı gelir tablosundadır. Gelir tablosu satıştan başlar, maliyetleri ve giderleri düşer, sonunda dönem karına veya zararına ulaşır. Burada yalnızca son satıra değil, brüt kar, faaliyet karı ve net kar arasındaki ilişkiye bakmak gerekir.

Üçüncü soru şudur: Kağıt üzerindeki kar gerçekten nakde döndü mü? Bu sorunun cevabı nakit akış tablosundadır. Bazen şirket kar açıklayabilir ama tahsilat geciktiği için kasaya nakit girmemiş olabilir. Bazen de dönem karı düşük görünür ama operasyonel nakit akışı güçlü olabilir. Bu ayrım çok önemlidir.

Basit bir örnek verelim. Bir şirket 100 milyon TL satış yapmış, 10 milyon TL net kar açıklamış olsun. İlk bakışta iyi görünebilir. Fakat aynı dönemde ticari alacaklar çok büyümüş ve işletme faaliyetlerinden nakit akışı negatif olmuşsa, bu karın kalitesi sorgulanmalıdır. Çünkü satış yapılmış ama para henüz tahsil edilememiş olabilir.

Finansçı olmayan kullanıcı için oranlar da sade başlamalıdır. Cari oran kısa vadeli ödeme gücünü, borç/özkaynak oranı finansal kaldıraç düzeyini, net kar marjı satıştan ne kadar kar kaldığını, özkaynak karlılığı ise ortakların sermayesinin ne kadar verimli kullanıldığını gösterir.

Oranları tek başına mutlak doğru gibi okumamak gerekir. Her sektörün yapısı farklıdır. Market zinciriyle yazılım şirketi, banka ile sanayi şirketi aynı oranlarla değerlendirilmez. Bu yüzden şirketi hem kendi geçmişiyle hem de benzer şirketlerle karşılaştırmak daha doğru olur.

Finansal tablo okumada en sağlıklı yöntem küçük başlamaktır. Önce üç tabloyu tanıyın. Sonra beş temel oranı izleyin. Ardından aynı şirketin birkaç dönemini yan yana koyun. Satış, kar, borç, nakit ve özkaynak zaman içinde nasıl değişmiş, bunu görün.

Enbilir'de bu konuları anlatmamın sebebi, kullanıcıların fiyat hareketini finansal gerçeklikten kopuk okumamasıdır. Grafik önemlidir, ama şirketin sağlığı da önemlidir. Finansal tabloları temel düzeyde okuyabilen kullanıcı, piyasa gürültüsünün içinde daha sağlam durur.`,
  },
  {
    id: "managed-kripto-piyasasi-temel-kavramlar",
    title: "Kripto Piyasasına Sakin Bir Giriş: Bitcoin, Ethereum, Solana, BNB ve LINK Nedir?",
    excerpt: "Kripto varlıkları yalnızca fiyat hareketiyle değil, hangi problemi çözmeye çalıştıklarıyla anlamak gerekir.",
    sortOrder: 400,
    body: `Kripto piyasası çoğu kişi için önce fiyat hareketleriyle dikkat çeker. Bitcoin yükseldi, Ethereum düştü, Solana hızlı çıktı, BNB hareketlendi, LINK gündeme geldi gibi cümleler duyulur. Fakat bu varlıkları anlamak için önce fiyatı değil, mantığı konuşmak gerekir.

Bitcoin, merkezi bir otoriteye ihtiyaç duymadan değer transferi yapma fikriyle ortaya çıktı. Temel yaklaşım, kullanıcıların bir finansal aracıya güvenmek zorunda kalmadan, ağ üzerindeki kurallar ve kriptografik doğrulama ile işlem yapabilmesidir. Bitcoin bu yönüyle dijital kıtlık, merkeziyetsizlik ve güven ihtiyacını tartışmaya açtı.

Ethereum ise yalnızca para transferi fikrinin ötesine geçti. Ethereum ağında akıllı sözleşmeler çalışır. Akıllı sözleşme, belirli kurallara göre çalışan program gibi düşünülebilir. Bu yapı merkeziyetsiz finans, NFT, oyun, kimlik ve pek çok Web3 uygulamasının temelini oluşturdu. Ethereum'un para birimi ETH'dir.

Solana, yüksek işlem kapasitesi ve düşük maliyet hedefiyle öne çıkan bir blokzincir ekosistemidir. Solana'nın teknik anlatımlarında zaman sıralamasını verimli kurmaya çalışan Proof of History yaklaşımı sık geçer. Kullanıcı açısından sade anlatım şudur: Solana daha hızlı ve daha ucuz uygulama deneyimi sunmayı hedefleyen bir altyapıdır.

BNB, BNB Chain ekosisteminin kullanılan tokenidir. Bazı kullanıcılar bunu yanlışlıkla BNC diye söyleyebilir; doğru yaygın ad BNB'dir. BNB Chain üzerinde merkeziyetsiz uygulamalar, DeFi işlemleri ve farklı Web3 araçları çalışır. BNB burada ağ ücretleri, kullanım ve ekosistem işlevleri açısından rol oynar.

LINK ise Chainlink ağıyla ilişkilidir. Chainlink'in temel problemi şudur: Blokzincir üzerindeki akıllı sözleşmeler dış dünyadaki veriye nasıl güvenli erişir? Fiyat verisi, hava durumu, ödeme bilgisi veya başka bir dış veri gerekiyorsa, oracle denilen köprü mekanizmaları devreye girer. Chainlink bu alanda önemli bir altyapı oyuncusudur.

Kripto piyasasını anlamak için her coin'i aynı sepete koymamak gerekir. Bazıları değer saklama iddiasıyla öne çıkar, bazıları uygulama platformudur, bazıları veri altyapısı sağlar, bazıları borsa veya ekosistem tokenidir. Hepsinin riski, kullanım amacı ve piyasa davranışı farklıdır.

Bu piyasanın en önemli özelliklerinden biri yüksek volatilitedir. Fiyatlar kısa sürede sert hareket edebilir. Bu hareketler fırsat gibi görünse de risk aynı hızla büyür. Bu nedenle kripto varlıkları öğrenirken önce küçük kavramları anlamak, sonra sanal portföyde denemek daha sağlıklı bir yoldur.

Kripto tarafında hiçbir anlatım yatırım tavsiyesi olarak görülmemelidir. Buradaki amaç, kullanıcıya temel kavramları sadeleştirmek ve fiyat hareketinin arkasındaki teknolojik farkları göstermektir. Ne aldığını bilmeden sadece yükseldiği için bir varlığa yönelmek, finansal okuryazarlık değil kalabalık davranışıdır.`,
  },
  {
    id: "managed-kripto-para-dijital-para-farki",
    title: "Kripto Para ile Dijital Para Aynı Şey Değildir",
    excerpt: "Her kripto para dijitaldir ama her dijital para kripto değildir. Farkı anlamak, geleceğin para tartışmasını daha sağlıklı okumayı sağlar.",
    sortOrder: 390,
    body: `Kripto para ile dijital para çoğu zaman aynı şeymiş gibi kullanılıyor. Oysa bu iki kavram arasında önemli farklar var. Her kripto para dijital ortamda var olur, ama her dijital para kripto para değildir. Banka hesabınızdaki TL veya dolar da dijital olarak görünür; fakat bu onu kripto para yapmaz.

Dijital para en geniş anlamıyla elektronik ortamda temsil edilen paradır. Banka hesabınızdaki bakiye, kartla yaptığınız ödeme, mobil bankacılıktaki transfer veya merkez bankası dijital parası bu başlık altında düşünülebilir. Bu sistemlerde genellikle merkezi kurumlar, bankalar ve düzenleyici yapılar vardır.

Kripto para ise çoğu örnekte blokzincir veya benzeri dağıtık kayıt teknolojileri üzerinde çalışır. İşlemler ağ tarafından doğrulanır, kriptografi kullanılır ve bazı sistemlerde merkezi bir ihraççı yoktur. Bitcoin bunun en bilinen örneğidir. Ethereum ve Solana gibi ağlarda ise para transferinin yanında programlanabilir uygulamalar da vardır.

Merkezi dijital paranın avantajı düzenleme, geri alma mekanizmaları, kullanıcı koruması ve mevcut finans sistemiyle uyumdur. Dezavantajı ise kullanıcının merkezi kurumlara güvenmek zorunda olması, hesapların dondurulabilmesi veya para politikasının tamamen merkezi otoriteye bağlı olmasıdır.

Kripto paraların avantajı açık ağ yapısı, sınır ötesi erişim, programlanabilirlik ve bazı durumlarda sansüre dayanıklılık iddiasıdır. Dezavantajı ise yüksek fiyat oynaklığı, teknik karmaşıklık, dolandırıcılık riski, özel anahtar kaybı, düzenleyici belirsizlik ve kullanıcı hatalarının çoğu zaman geri alınamamasıdır.

Merkez bankası dijital paraları ise ayrı bir başlıktır. Bunlar kripto para gibi özel bir ağ tokeni değildir; merkez bankasının dijital formda çıkardığı para olarak düşünülür. Amaç ödeme sistemlerini hızlandırmak, maliyetleri düşürmek veya para altyapısını modernleştirmek olabilir.

Stabil coinler de bu tartışmanın ortasında durur. Bazı stabil coinler dolar gibi bir varlığa sabit kalmayı hedefler. Kullanıcıya kripto altyapısında daha istikrarlı bir değer birimi sunmaya çalışır. Ancak burada rezerv kalitesi, denetim, ihraççı riski ve düzenleme çok önemlidir.

Ben bu ayrımı özellikle önemsiyorum. Çünkü kullanıcı kavramları karıştırdığında riskleri de karıştırır. Bankadaki dijital para ile merkeziyetsiz kripto varlık aynı risklere sahip değildir. Merkez bankası dijital parası ile özel bir stabil coin de aynı şey değildir.

Finansal okuryazarlık, kavramların sınırını doğru çizmekle başlar. Dijital para, kripto para, stabil coin, token, merkez bankası dijital parası ve banka mevduatı aynı masada konuşulabilir; fakat aynı kutuya konulamaz.`,
  },
  {
    id: "managed-borsalara-yatirimda-dikkat",
    title: "Borsa ve Kripto Piyasalarında İşlem Yaparken Dikkat Edilecek Temel Noktalar",
    excerpt: "Piyasa fırsat kadar hata da üretir. Vade, risk, likidite, kaldıraç ve psikoloji birlikte düşünülmeden sağlıklı karar kurulamaz.",
    sortOrder: 380,
    body: `Borsaya veya kripto piyasasına bakarken en tehlikeli cümlelerden biri şudur: Herkes alıyor, ben de almalıyım. Kalabalık bazen haklı olabilir, ama kalabalığın haklı olması sizin riskinizi ortadan kaldırmaz. Bu yüzden piyasaya girerken önce kendi çerçevenizi kurmanız gerekir.

İlk temel nokta vadedir. Kısa vadeli mi düşünüyorsunuz, orta vadeli mi, uzun vadeli mi? Bir varlık kısa vadede pahalı görünebilir ama uzun vadeli hikayesi güçlü olabilir. Tersi de mümkündür. Vade net değilse, kullanıcı her fiyat hareketinde fikrini değiştirir.

İkinci nokta pozisyon büyüklüğüdür. Bir fikre ne kadar sermaye ayırdığınız, fikrin kendisi kadar önemlidir. Çok iyi görünen bir varlığa tüm portföyü bağlamak, yanılma ihtimalini yok saymak anlamına gelir. Piyasa ise en çok bu özgüveni cezalandırır.

Üçüncü nokta likiditedir. Özellikle küçük hisselerde veya düşük hacimli kripto varlıklarda alım satım farkı geniş olabilir. Kağıt üzerinde görünen fiyatla gerçekten işlem yapılabilen fiyat farklılaşabilir. Likidite zayıfsa çıkmak da girmek kadar zor olabilir.

Dördüncü nokta kaldıraçtır. Kaldıraç kazancı büyütebilir ama zararı da aynı hızla büyütür. Yeni başlayan kullanıcıların kaldıraçlı işlemleri öğrenme aracı gibi görmesi ciddi hatadır. Kaldıraç, piyasa yönünden emin olsanız bile zamanlama hatasında portföyü zorlayabilir.

Beşinci nokta haber etkisidir. Bir haber doğru olabilir ama fiyatın içine girmiş olabilir. Bir şirket iyi bilanço açıklayabilir ama piyasa daha iyisini beklediği için fiyat düşebilir. Kriptoda büyük bir gelişme duyurulabilir ama haber sonrası kar satışı gelebilir. Bu yüzden haber ile fiyat davranışı birlikte okunmalıdır.

Altıncı nokta psikolojidir. İnsan zarar ederken daha fazla risk almak isteyebilir, karda iken aşırı özgüvenli davranabilir, kaçırma korkusuyla geç kalmış bir harekete atlayabilir. Bu davranışlar teknik bilgiden bağımsızdır ve çoğu zaman portföyün gerçek düşmanıdır.

Örnek olarak bir kullanıcı kripto piyasasında çok hızlı yükselen bir coine sonradan girerse, aslında teknolojiyi değil momentumu satın alıyor olabilir. Başka bir kullanıcı bir hisseyi sadece düştü diye ucuz zannedebilir. Oysa düşüşün sebebi şirketin temel verilerinde bozulma olabilir.

Enbilir sanal portföyünün değeri burada ortaya çıkar. Kullanıcı bu hataları gerçek para riski olmadan görebilir. Bir varlığa fazla yüklenmenin, nakitsiz kalmanın, geç kalmış harekete atlamanın ve zarar telafi etmeye çalışmanın sonuçları sanal ortamda izlenebilir.

Bu yazı yatırım tavsiyesi değildir. Ama piyasalarda daha sağlıklı hareket etmek isteyen herkes için temel bir hatırlatmadır: Önce vade, sonra risk, sonra gerekçe, sonra işlem. Sıra bozulduğunda karar kalitesi düşer.`,
  },
  {
    id: "managed-rezerv-para-tarihi-dolar",
    title: "Rezerv Para Hep Dolar Değildi: Florinden Sterline, Sterlinden Dolara",
    excerpt: "Tarihte rezerv para liderliği değişti. Bugün dolar hala çok güçlü, ama her rezerv para düzeni gibi onun da sorgulandığı bir dönemden geçiyoruz.",
    sortOrder: 370,
    body: `Bugün dünya ticaretini, merkez bankası rezervlerini ve finansal piyasaları konuşurken Amerikan doları doğal merkez gibi görünür. Petrol fiyatı dolarla konuşulur, birçok ülkenin rezervinde dolar ağırlıklıdır, küresel borçlanmanın önemli kısmı dolar üzerinden yapılır. Fakat tarih bize şunu söyler: Rezerv para liderliği sonsuz değildir.

Geçmişte Hollanda florini, İspanyol gümüş paraları, Fransız frangı ve özellikle İngiliz sterlini farklı dönemlerde küresel ticaret ve finans açısından çok önemli roller oynadı. 19. yüzyılda ve 20. yüzyılın başlarında sterlin dünya finans sisteminin merkezindeydi. Londra'nın finansal gücü, İngiltere'nin ticaret ağı ve imparatorluk etkisi sterline büyük alan açmıştı.

Sonra dünya değişti. Savaşlar, borç yükleri, ekonomik güç kayması ve ABD'nin yükselişiyle dolar adım adım öne çıktı. Bretton Woods düzeniyle dolar altına bağlı merkez para konumuna geldi. 1971'de doların altınla doğrudan bağı kopsa da doların küresel rolü devam etti. Çünkü ABD piyasalarının derinliği, hazine tahvillerinin likiditesi ve küresel güven ağı sürdü.

Bugün dolar hala açık ara en önemli rezerv paradır. IMF ve Federal Reserve verileri doların küresel resmi rezervlerde en büyük paya sahip olduğunu gösteriyor. Ancak doların payı 2000'lerin başındaki zirvesinden gerilemiş durumda. Merkez bankaları zaman içinde euro, yen, sterlin, Kanada doları, Avustralya doları, renminbi ve altın gibi farklı varlıklara daha fazla alan açabiliyor.

Buradan hemen "dolar bitti" sonucu çıkarmak doğru değildir. Rezerv para değişimleri çok yavaş olur. Çünkü rezerv para yalnızca para birimi değildir; derin piyasa, güven, hukuk sistemi, askeri ve siyasi güç, ödeme altyapısı ve alışkanlıklar bütünüdür. Doların alternatifi olmak kolay değildir.

Ama "dolar sonsuza kadar tartışmasız kalır" demek de tarihsel olarak fazla rahat bir cümledir. ABD'nin borç dinamikleri, jeopolitik gerilimler, yaptırım mekanizmaları, alternatif ödeme sistemleri, merkez bankalarının altın alımları ve Çin gibi büyük ekonomilerin stratejileri dolar düzenini daha fazla tartışılır hale getiriyor.

Ben bu konuyu kesin bir çöküş kehaneti olarak değil, tarihsel döngü olarak okumayı doğru buluyorum. Her rezerv para döneminin güçlü bir başlangıcı, kurumsallaşma dönemi, zirvesi ve sonunda sorgulanma aşaması olur. Doların şu anda hala güçlü olması, sorgulanmadığı anlamına gelmez.

Finansal okuryazarlık açısından burada alınacak ders şudur: Hiçbir para birimi kutsal değildir. Güven, güç ve kurumlarla desteklendiği sürece merkezde kalır. Bu destek zayıfladığında dünya yavaş yavaş alternatifleri konuşmaya başlar.

Bu nedenle altın, dijital para, kripto varlıklar, merkez bankası rezerv tercihleri ve bölgesel para anlaşmaları aynı büyük tartışmanın parçalarıdır. Kullanıcı günlük fiyat hareketlerine bakarken bu uzun tarihsel çerçeveyi de aklında tutmalıdır.`,
  },
  {
    id: "managed-degerli-metaller-para-sistemi",
    title: "Altın, Gümüş ve Değerli Metaller Neden Yeniden Gündemde?",
    excerpt: "Merkez bankalarının altın ilgisi, para sistemine güven tartışması ve jeopolitik riskler değerli metalleri yeniden stratejik bir başlık haline getirdi.",
    sortOrder: 360,
    body: `Altın ve gümüş, finans tarihinde yalnızca süs eşyası veya emtia olarak görülmedi. Çok uzun dönemler boyunca para sisteminin merkezinde veya yakınında durdular. Bugün kağıt para ve dijital ödeme sistemleri hayatın merkezinde olsa da değerli metallerin önemi tamamen kaybolmuş değildir.

Son yıllarda merkez bankalarının altın alımları dikkat çekiyor. Bunun birkaç nedeni var. Birincisi rezerv çeşitlendirmesi. Merkez bankaları tüm rezervlerini tek bir para birimine veya tek bir finansal sisteme bağımlı tutmak istemeyebilir. İkincisi jeopolitik riskler. Yaptırımlar, savaşlar ve bloklaşma arttığında altın tarafsız rezerv varlık gibi görülebilir.

Üçüncü neden enflasyon ve para güvenidir. Para arzı, bütçe açıkları ve borç seviyeleri tartışıldığında yatırımcılar ve merkez bankaları satın alma gücünü koruyan varlıklara yeniden bakar. Altın bu noktada tarihsel hafızası güçlü bir varlıktır.

Altının avantajı, karşı taraf riski taşımamasıdır. Bir tahvil bir borçlunun ödeme sözüdür. Bir banka mevduatı bankacılık sistemine dayanır. Altın ise fiziksel olarak tutulduğunda başka bir tarafın yükümlülüğü değildir. Bu özellik kriz dönemlerinde önem kazanır.

Gümüş daha farklı bir yapıya sahiptir. Hem değerli metal hem de sanayi girdisidir. Güneş panelleri, elektronik ve farklı endüstriyel kullanım alanları gümüşü sadece parasal bir varlık olmaktan çıkarır. Bu yüzden gümüş bazen altından daha oynak davranabilir.

Değerli metallerin fiyatı yalnızca korkuyla yükselmez. Reel faizler, doların gücü, merkez bankası politikaları, jeopolitik risk, yatırım fonu akımları ve fiziki talep birlikte etkili olur. Örneğin dolar güçlenirken altın baskı altında kalabilir; fakat jeopolitik risk çok yüksekse bu ilişki zayıflayabilir.

"Altın yeniden paranın yerine geçer mi?" sorusu basit bir evet hayır sorusu değildir. Günümüz ekonomisinin işlem hacmi, kredi sistemi ve dijital altyapısı klasik altın standardına kolayca dönmeye uygun değildir. Fakat altının rezerv sistemi içindeki ağırlığının artması ve güven varlığı olarak daha fazla konuşulması mümkündür.

Kullanıcı açısından önemli olan, değerli metalleri tek yönlü hikaye gibi okumamaktır. Altın uzun vadeli güven varlığı olabilir ama kısa vadede sert düşebilir. Gümüş sanayi talebiyle desteklenebilir ama volatilitesi yüksek olabilir. Maden şirketleri ise metal fiyatından farklı olarak operasyonel risk taşır.

Enbilir'de değerli metalleri takip ederken bu nedenle hem makro rapora hem teknik görünüme hem de portföy dağılımına bakmak gerekir. Altın veya gümüş bir portföyde risk dengeleme aracı olabilir, fakat her fiyat seviyesinde aynı anlamı taşımaz. Yine temel kural değişmez: Amaç ezber değil, bağlamı doğru okumaktır.`,
  },
  {
    id: "managed-finansal-kararlarda-psikoloji",
    title: "Finansal Kararlarda En Zor Rakip Piyasa Değil, Kendi Davranışımızdır",
    excerpt: "Fırsatı kaçırma korkusu, zarar telafisi, aşırı özgüven ve kalabalığa uyma eğilimi finansal okuryazarlığın davranış tarafını oluşturur.",
    sortOrder: 350,
    body: `Piyasada herkes grafik, haber ve veri konuşur. Bunlar elbette önemlidir. Fakat çoğu zaman en büyük sorun veri eksikliği değil, davranış disiplinidir. İnsan doğru bilgiyi görse bile yanlış zamanda, yanlış büyüklükte ve yanlış duyguyla karar verebilir.

Fırsatı kaçırma korkusu en yaygın hatalardan biridir. Bir varlık hızla yükselir, herkes konuşmaya başlar, kullanıcı geç kalmış hisseder ve planı olmadan işleme girer. Bu noktada karar analize değil, dışarıda kalma korkusuna dayanır. Böyle işlemler kısa vadede kazandırsa bile kötü alışkanlık üretebilir.

Zarar telafisi bir başka tehlikeli davranıştır. Kullanıcı bir işlemde zarar eder ve bunu hemen geri almak ister. Daha büyük pozisyon açar, daha riskli varlığa geçer veya vadesini bozar. Oysa zarar sonrası ilk yapılması gereken şey daha fazla risk almak değil, karar sürecini incelemektir.

Aşırı özgüven de sessiz bir risktir. Birkaç doğru karar sonrası kullanıcı piyasanın kendisini onayladığını sanabilir. Pozisyon büyüklüğü artar, risk uyarıları önemsenmez, ters senaryo yazılmaz. Piyasa ise çoğu zaman en rahat hissedilen anda en sert dersi verir.

Kalabalığa uyma davranışı özellikle sosyal medya döneminde güçlendi. Çok kişi aynı şeyi söylüyorsa doğruymuş gibi gelebilir. Halbuki kalabalık bazen fiyat hareketinin en geç aşamasında oluşur. Herkesin konuştuğu varlık, bazen riskin en görünmez hale geldiği yerdir.

Bu davranışları düzeltmenin yolu kendini suçlamak değil, sistem kurmaktır. Her işlem öncesi gerekçe yazmak, pozisyon büyüklüğünü sınırlamak, nakit payını takip etmek, zarar sonrası bekleme kuralı koymak ve kararları sonradan değerlendirmek bu sistemin parçalarıdır.

Sanal portföy burada çok değerli bir eğitim alanıdır. Kullanıcı gerçek para kaybetmeden kendi davranış kalıplarını görebilir. Hep yükselene mi koşuyor? Düşüşte panik mi yapıyor? Tek varlığa mı bağlanıyor? Nakit tutmayı unutuyor mu? Bunlar görüldüğünde öğrenme başlar.

Finansal okuryazarlık sadece bilanço, grafik veya makro veri bilmek değildir. Aynı zamanda kendi psikolojini tanımaktır. Piyasa her gün değişir, ama insanın temel zaafları çok değişmez. Bu yüzden iyi yatırım eğitimi, davranış eğitimini de içermelidir.

Enbilir'in sanal portföy, lig ve AI rapor yapısı bu davranışları görünür kılmak için kullanılabilir. Kullanıcı kendi kararını, topluluk içindeki ritmi ve AI bağlamını birlikte değerlendirdiğinde daha sakin bir karar dili geliştirebilir.`,
  },
  {
    id: "managed-portfoy-gunlugu-tutmak",
    title: "Portföy Günlüğü Tutmak: Her İşlemden Önce Bir Cümle Yazın",
    excerpt: "Kararın gerekçesini yazmak, sonucu değerlendirmeyi kolaylaştırır ve kullanıcıyı anlık heyecandan daha disiplinli bir öğrenme sürecine taşır.",
    sortOrder: 340,
    body: `Piyasa öğrenmek isteyen herkese basit ama çok etkili bir alışkanlık öneririm: Her işlemden önce bir cümle yazın. Bu varlığı neden alıyorum veya neden satıyorum? Hangi vadede düşünüyorum? Hangi durumda yanıldığımı kabul ederim? Bu soruların cevabı yazılmadan yapılan işlem çoğu zaman dağınık kalır.

Portföy günlüğü tutmak profesyonel olmak için değil, kendini tanımak için gereklidir. İnsan karar anındaki düşüncesini sonradan farklı hatırlayabilir. Kazandıysa süreci olduğundan daha iyi, kaybettiyse piyasayı olduğundan daha haksız görebilir. Yazılı not bu yanılgıyı azaltır.

Basit bir portföy günlüğünde beş bilgi yeterlidir. Tarih, varlık, işlem yönü, gerekçe ve ters senaryo. Örneğin: "Altın alıyorum, çünkü dolar zayıflarken jeopolitik risk artıyor; yanılırsam nedenim reel faizlerin yeniden yükselmesi olur." Bu cümle mükemmel olmak zorunda değildir. Önemli olan düşünceyi görünür kılmasıdır.

Bir başka örnek kripto tarafında olabilir: "Ethereum izliyorum, çünkü ağ aktivitesi ve piyasa ilgisi artıyor; fakat genel risk iştahı bozulursa pozisyonu büyütmeyeceğim." Bu not kullanıcının sadece heyecanla değil, koşulla düşündüğünü gösterir.

Portföy günlüğü özellikle sanal portföyde çok faydalıdır. Çünkü kullanıcı gerçek para baskısı olmadan karar gerekçelerini test edebilir. Bir hafta sonra aynı notlara bakıp şunu sorabilir: Gerekçem doğru muydu? Yanlışsa nerede yanıldım? Sonuç iyi ama yöntem zayıf mıydı? Sonuç kötü ama süreç mantıklı mıydı?

Bu ayrım çok önemlidir. İyi sonuç her zaman iyi karar demek değildir. Kötü sonuç da her zaman kötü karar demek değildir. Piyasa kısa vadede şansa alan tanır. Portföy günlüğü, kullanıcının sonuç ile süreç arasındaki farkı öğrenmesine yardım eder.

Topluluk içinde portföy günlüğü daha da değerli hale gelir. Kullanıcılar birbirlerine ne aldın demek yerine, neden böyle düşündün diye sorabilir. Bu soru yatırım tavsiyesi üretmez; öğrenme üretir. Rotary gibi güvenli topluluklarda bu yaklaşım çok sağlıklı bir tartışma zemini sağlar.

Enbilir'de ileride bu alışkanlığı daha görünür hale getirecek özellikler eklenebilir. İşlem gerekçesi, karar notu, haftalık portföy değerlendirmesi ve AI ile karar günlüğü özeti gibi araçlar kullanıcıların gelişimini hızlandırabilir. Bence finansal okuryazarlığın en değerli parçalarından biri budur: kararını yazmak ve sonra kendine dürüstçe geri dönmek.`,
  },
];

const dbPath = getDatabasePath();
const db = new Database(dbPath);
const now = new Date().toISOString();

const stmt = db.prepare(`
  INSERT INTO ManagedContentItem (
    id, type, locale, title, excerpt, body, imageUrl, videoUrl, linkUrl, linkLabel,
    sortOrder, isFeatured, isActive, publishedAt, createdAt, updatedAt
  ) VALUES (
    @id, 'BLOG', 'tr', @title, @excerpt, @body, NULL, NULL, NULL, NULL,
    @sortOrder, 1, 1, @publishedAt, @createdAt, @updatedAt
  )
  ON CONFLICT(id) DO UPDATE SET
    type = excluded.type,
    locale = excluded.locale,
    title = excluded.title,
    excerpt = excluded.excerpt,
    body = excluded.body,
    sortOrder = excluded.sortOrder,
    isFeatured = excluded.isFeatured,
    isActive = excluded.isActive,
    publishedAt = excluded.publishedAt,
    updatedAt = excluded.updatedAt
`);

db.transaction(() => {
  for (const post of posts) {
    stmt.run({ ...post, publishedAt: now, createdAt: now, updatedAt: now });
  }
})();

console.log(`Upserted ${posts.length} managed blog posts into ${dbPath}`);
