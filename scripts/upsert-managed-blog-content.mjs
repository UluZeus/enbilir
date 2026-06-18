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
