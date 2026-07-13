import type { Locale } from "@/i18n/config";

export type LegalSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
  note?: string;
};

export type LegalReference = {
  label: string;
  href: string;
};

export type LegalPageKey = "kvkk" | "explicitConsent" | "cookies" | "terms" | "investmentDisclaimer";

export type LegalPageContent = {
  title: string;
  updatedAt: string;
  intro: string;
  highlights: string[];
  sections: LegalSection[];
  references: LegalReference[];
};

const kvkkReferencesTr: LegalReference[] = [
  { label: "6698 sayılı Kişisel Verilerin Korunması Kanunu", href: "https://www.kvkk.gov.tr/Icerik/6649/Kisisel-Verilerin-Korunmasi-Kanunu" },
  { label: "Aydınlatma Yükümlülüğünün Yerine Getirilmesine İlişkin Tebliğ", href: "https://www.kvkk.gov.tr/Icerik/4132/aydinlatma-yukumlulugunun-yerine-getirilmesinde-uyulacak-usul-ve-esaslar-hakkinda-teblig" },
  { label: "Veri Sorumlusuna Başvuru Usul ve Esasları Hakkında Tebliğ", href: "https://www.kvkk.gov.tr/Icerik/4109/Veri-Sorumlusuna-Basvuru-Usul-ve-Esaslari-Hakkinda-Teblig-Resmi-Gazetede-yayinlanmistir" },
  { label: "Kişisel verilerin yurt dışına aktarılmasına ilişkin güncel açıklama", href: "https://www.kvkk.gov.tr/Icerik/2053/Yurtdisina-Aktarim" },
];

const kvkkReferencesEn: LegalReference[] = [
  { label: "Turkish Personal Data Protection Law No. 6698", href: "https://www.kvkk.gov.tr/Icerik/6649/Kisisel-Verilerin-Korunmasi-Kanunu" },
  { label: "Communiqué on the Procedures and Principles for Fulfilling the Obligation to Inform", href: "https://www.kvkk.gov.tr/Icerik/4132/aydinlatma-yukumlulugunun-yerine-getirilmesinde-uyulacak-usul-ve-esaslar-hakkinda-teblig" },
  { label: "Communiqué on Applications to the Data Controller", href: "https://www.kvkk.gov.tr/Icerik/4109/Veri-Sorumlusuna-Basvuru-Usul-ve-Esaslari-Hakkinda-Teblig-Resmi-Gazetede-yayinlanmistir" },
  { label: "Current KVKK guidance on international data transfers", href: "https://www.kvkk.gov.tr/Icerik/2053/Yurtdisina-Aktarim" },
];

const legalContent: Record<Locale, Record<LegalPageKey, LegalPageContent>> = {
  tr: {
    kvkk: {
      title: "KVKK Aydınlatma Metni",
      updatedAt: "13 Temmuz 2026",
      intro: "Bu metin, Enbilir'i ziyaret ederken, üyelik oluştururken, sanal portföy ve liglere katılırken, yapay zekâ özelliklerini kullanırken veya bizimle iletişime geçerken kişisel verilerinizin Ultra Bilişsel Akıl Danışmanlık Bilişim Destek ve Servis Hizmetleri Limited Şirketi tarafından nasıl işlendiğini açıklar.",
      highlights: [
        "Veri sorumlusu: Ultra Bilişsel Akıl Danışmanlık Bilişim Destek ve Servis Hizmetleri Limited Şirketi",
        "Enbilir gerçek para ile yatırım işlemi yaptırmaz.",
        "KVKK kapsamındaki talepler en geç 30 gün içinde sonuçlandırılır.",
      ],
      sections: [
        {
          heading: "Veri sorumlusu, hizmet ve kapsam",
          paragraphs: [
            "6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) bakımından veri sorumlusu Ultra Bilişsel Akıl Danışmanlık Bilişim Destek ve Servis Hizmetleri Limited Şirketi'dir. Enbilir, Şirket tarafından enbilir.com alan adı üzerinden sunulan finansal okuryazarlık, eğitim, yapay zekâ destekli bilgi, sanal portföy ve yarışma hizmetidir.",
            "Bu aydınlatma metni; ziyaretçileri, üyeleri, üyelik başvurusu yapanları, topluluk ve sohbet özelliklerini kullananları, destek talebi iletenleri ve platformla başka bir nedenle iletişim kuran kişileri kapsar. Çalışanlar, tedarikçiler veya iş ortakları için yürütülen ayrı süreçler varsa bu süreçlere özgü metinler ayrıca uygulanır.",
          ],
          note: "Aydınlatma yükümlülüğü ile açık rıza birbirinden ayrıdır. Bu metnin okunması veya onay kutusuyla teyit edilmesi, tek başına açık rıza verildiği anlamına gelmez.",
        },
        {
          heading: "İşlediğimiz kişisel veri kategorileri",
          paragraphs: [
            "Kullandığınız özelliğe göre aşağıdaki verilerin tamamı veya bir bölümü işlenebilir. Platform, hizmet için gerekli olmayan özel nitelikli kişisel verileri sizden talep etmez; yapay zekâ veya sohbet alanlarına sağlık, biyometrik veri, siyasi görüş ya da benzeri hassas bilgileri yazmamanız gerekir.",
          ],
          bullets: [
            "Kimlik ve hesap bilgileri: ad soyad, kullanıcı adı veya takma ad, görüntülenecek ad tercihi, kullanıcı rolü, hesap durumu ve üyelik seviyesi.",
            "İletişim ve doğrulama bilgileri: e-posta adresi, doğrulama zamanı, iletişim tercihleri, destek ve talep yazışmaları.",
            "Güvenlik bilgileri: tek yönlü yöntemle özetlenmiş şifre, oturum belirteci, doğrulama belirteçleri, işlem tekrarını önleyen kayıtlar, tarih-saat ve teknik hata/güvenlik kayıtları.",
            "Sanal portföy ve yarışma verileri: sanal bakiye, varlıklar, sanal alış-satışlar, işlem gerekçesi, portföy görüntüleri, puan, lig, sıralama, rozet ve haftalık yarışma sonuçları.",
            "Tercih ve kullanım verileri: risk iştahı testi cevapları ve sonucu, eğitim ilerlemesi, favori varlıklar, yardım ve onboarding ilerlemesi, özellik kullanım olayları.",
            "Yapay zekâ ve topluluk verileri: asistana gönderilen metin veya ses, oluşturulan raporlar, favoriler, sohbet mesajları, oda ve anket katılımı, engelleme veya şikâyet kayıtları.",
            "Ödeme ve abonelik verileri: paket türü, üyelik başlangıç/bitiş tarihleri, ödeme durumuna ilişkin kayıtlar ve ödeme kuruluşuna yönlendirme bilgileri. Tam kart verileri Enbilir tarafından saklanmaz.",
          ],
        },
        {
          heading: "Kişisel verileri işleme amaçlarımız",
          paragraphs: [
            "Veriler, belirli, açık ve meşru amaçlarla; amaçla bağlantılı, sınırlı ve ölçülü şekilde işlenir. Aynı veri farklı bir amaç için kullanılacaksa ilgili hukuki sebep ve bilgilendirme yeniden değerlendirilir.",
          ],
          bullets: [
            "Üyelik oluşturmak, e-posta doğrulamak, güvenli oturum açmak ve hesap tercihlerini yönetmek.",
            "Sanal portföy işlemlerini, ligleri, sıralamaları, rozetleri ve haftalık/günlük raporları hesaplamak ve göstermek.",
            "Risk iştahı testi, eğitim ilerlemesi, yapay zekâ asistanı, AI piyasa terminali, rapor ve sohbet özelliklerini sunmak.",
            "Kullanıcı taleplerini yanıtlamak, hizmet duyurularını iletmek ve izin verilmişse elektronik ticari ileti göndermek.",
            "Dolandırıcılığı, mükerrer veya yetkisiz işlemleri, güvenlik ihlallerini ve topluluk kurallarına aykırı davranışları önlemek.",
            "Hizmet performansını ölçmek, hataları gidermek, kullanıcı deneyimini iyileştirmek ve anonim veya toplulaştırılmış istatistik üretmek.",
            "Abonelik haklarını tanımlamak, ödeme sürecini yürütmek, muhasebe ve hukuki yükümlülükleri yerine getirmek, uyuşmazlıklarda hakları korumak.",
          ],
        },
        {
          heading: "Hukuki sebepler",
          paragraphs: [
            "Kişisel verileriniz, somut sürece göre KVKK'nın 5. maddesindeki hukuki sebeplere dayanılarak işlenir. Açık rıza, ancak başka bir hukuki sebebin bulunmadığı ve mevzuatın rıza gerektirdiği isteğe bağlı işlemler için kullanılır.",
          ],
          bullets: [
            "Üyelik, sanal portföy ve abonelik hizmetlerinin kurulması veya ifası için gerekli olması (KVKK m.5/2-c).",
            "Elektronik kayıt, muhasebe, tüketici ve yetkili makam yükümlülükleri dahil veri sorumlusunun hukuki yükümlülüğünü yerine getirmesi (m.5/2-ç).",
            "Bir hakkın tesisi, kullanılması veya korunması; şikâyet, itiraz ve uyuşmazlıkların yönetilmesi (m.5/2-e).",
            "Hesap güvenliği, kötüye kullanımın önlenmesi, hizmetin geliştirilmesi ve ölçümlenmesi bakımından temel haklara zarar vermeyen meşru menfaat (m.5/2-f).",
            "Elektronik ticari ileti ve zorunlu olmayan izleme teknolojileri gibi isteğe bağlı işlemlerde, gerektiği ölçüde açık rıza (m.5/1).",
          ],
        },
        {
          heading: "Verilerin toplanma yöntemleri",
          paragraphs: [
            "Veriler; kayıt, giriş, profil, risk testi, işlem, yapay zekâ, sohbet, iletişim ve abonelik formlarına yazdığınız bilgilerden; platformdaki kullanımınız sırasında oluşan işlem kayıtlarından; zorunlu çerezler ve tarayıcı depolama teknolojilerinden otomatik veya kısmen otomatik yollarla toplanır.",
            "Google ile giriş seçeneğini kullanmanız halinde Google tarafından paylaşılan hesap tanımlayıcıları ve temel profil bilgileri alınabilir. Piyasa verileri ve haberler dış kaynaklardan sağlansa da bu kaynaklardan size ait kişisel veri elde edilmesi amaçlanmaz.",
          ],
        },
        {
          heading: "Aktarım yapılan alıcı grupları",
          paragraphs: [
            "Kişisel veriler yalnızca işleme amacı için gerekli olan ölçüde, gizlilik ve güvenlik yükümlülükleri gözetilerek hizmet sağlayıcılara veya yetkili mercilere aktarılabilir. Hizmet sağlayıcı seçimi ve sözleşmeleri veri koruma ilkelerine göre değerlendirilir.",
          ],
          bullets: [
            "Barındırma, veritabanı, e-posta, güvenlik, hata izleme ve teknik destek sağlayıcıları.",
            "Kullanıcının seçtiği özellik kapsamında Google kimlik doğrulama ve yapay zekâ/metin-ses işleme sağlayıcıları.",
            "Abonelik ödemesinin tamamlanması için ödeme kuruluşu; mali müşavir, hukuk danışmanı ve denetçiler.",
            "Kanunen yetkili kamu kurumları, mahkemeler ve icra mercileri.",
            "Kullanıcının görüntülenme tercihine göre diğer üyeler: lig, liderlik, rozet ve topluluk alanlarında ad veya takma ad ile sınırlı olmak üzere.",
          ],
          note: "Şifreler ve tam ödeme kartı bilgileri diğer kullanıcılara açıklanmaz. Kart bilgileri ödeme kuruluşunun güvenli ekranlarında işlenir.",
        },
        {
          heading: "Yapay zekâ, profil çıkarma ve herkese açık alanlar",
          paragraphs: [
            "Risk iştahı testi, verdiğiniz cevaplardan bir puan ve eğitim amaçlı profil üretir. Sanal portföy sıralaması ise sanal işlemler ve belirlenmiş yarışma kuralları üzerinden otomatik hesaplanır. Bu çıktılar hukuki sonuç doğuran kredi, yatırım uygunluğu veya müşteri kabul kararı değildir.",
            "Yapay zekâ asistanına gönderdiğiniz istemler, ses dökümleri ve bağlam verileri yanıt veya rapor üretmek için işlenebilir. Yapay zekâ çıktıları hatalı, eksik veya güncel olmayan bilgi içerebilir; hassas kişisel veri, gerçek ödeme bilgisi veya üçüncü kişilere ait gizli bilgi girmemelisiniz.",
            "Lig, liderlik ve topluluk alanlarında profil tercihinize göre adınız veya takma adınız, puanınız ve sanal performansınız diğer kullanıcılara görünebilir. Görüntülenecek ad tercihinizi hesap ayarlarından yönetebilirsiniz.",
          ],
        },
        {
          heading: "Yurt dışına veri aktarımı",
          paragraphs: [
            "Bulut, kimlik doğrulama, e-posta veya yapay zekâ hizmetlerinin altyapısının yurt dışında bulunması halinde kişisel veriler yurt dışına aktarılabilir. Böyle bir aktarım, KVKK'nın güncel 9. maddesindeki yeterlilik kararı, uygun güvence veya arızi aktarım şartlarından uygulanabilir olana dayanılarak yürütülür.",
            "Uygun güvence gereken hallerde standart sözleşme, bağlayıcı şirket kuralları, yetkili makamca onaylanmış taahhütname veya kanunda düzenlenen diğer mekanizmalar kullanılır ve gerekli bildirimler yapılır. Sağlayıcı ya da aktarım mekanizması esaslı şekilde değişirse metin güncellenir.",
          ],
        },
        {
          heading: "Saklama, silme ve anonimleştirme",
          paragraphs: [
            "Veriler; üyelik ve ilgili özelliğin devamı, hukuki yükümlülükler, zamanaşımı süreleri, güvenlik ve uyuşmazlıkların yönetimi için gereken süre boyunca saklanır. Süre sona erdiğinde veri, uygulanabilir yönteme göre silinir, yok edilir veya anonim hâle getirilir.",
            "Hesabınızı silme talebiniz aktif hizmet verilerini etkiler; ancak mali kayıtlar, ispat kayıtları, onay zamanları veya güvenlik kayıtları kanuni saklama ya da hakların korunması için zorunlu olduğu ölçüde kısıtlı erişimle tutulabilir. Anonim yarışma istatistikleri sizi belirlenebilir kılmadığı sürece saklanabilir.",
          ],
        },
        {
          heading: "Veri güvenliği ve veri doğruluğu",
          paragraphs: [
            "Şirket; yetki kontrolü, şifrelerin tek yönlü özetlenmesi, güvenli oturum çerezleri, erişim sınırlaması, yedekleme, kayıt tutma ve olay müdahalesi gibi riskle uyumlu idari ve teknik tedbirler uygular. Hiçbir internet hizmeti mutlak güvenlik taahhüt edemese de tespit edilen riskler düzenli olarak değerlendirilir.",
            "Hesap bilgilerinizin doğru ve güncel tutulmasına yardımcı olmanız, şifrenizi paylaşmamanız ve şüpheli bir işlem fark ettiğinizde destek kanalına bildirmeniz gerekir. Veri ihlali halinde mevzuatın gerektirdiği Kurul ve ilgili kişi bildirimleri yapılır.",
          ],
        },
        {
          heading: "KVKK kapsamındaki haklarınız ve başvuru",
          paragraphs: [
            "KVKK'nın 11. maddesi uyarınca verinizin işlenip işlenmediğini öğrenme; işlendi ise bilgi isteme; işleme amacını ve amaca uygun kullanılıp kullanılmadığını öğrenme; yurt içi veya yurt dışındaki alıcıları bilme; eksik veya yanlış verinin düzeltilmesini, şartları varsa silinmesini veya yok edilmesini ve bu işlemlerin alıcılara bildirilmesini isteme; yalnızca otomatik sistemlerce analiz sonucu aleyhinize bir sonuca itiraz etme ve kanuna aykırı işleme nedeniyle zararın giderilmesini talep etme haklarına sahipsiniz.",
            "Başvurunuzu ad-soyad, kimliğinizi ve talebinizi doğrulamaya yeterli bilgi ile info@ultraakil.com adresine, sistemde kayıtlı e-posta hesabınızdan iletebilir veya Altıntepe Mahallesi, İstasyon Yolu Sokak, No: 3/1, Maltepe / İstanbul adresine yazılı olarak gönderebilirsiniz. Mevzuatta öngörülen KEP, güvenli elektronik imza veya mobil imza yöntemleri de kullanılabilir. Güvenliğiniz için ek doğrulama istenebilir.",
            "Başvurular talebin niteliğine göre en kısa sürede ve en geç 30 gün içinde ücretsiz sonuçlandırılır. İşlemin ayrıca maliyet gerektirmesi halinde Kurulca belirlenen tarife uygulanabilir. Cevabı yetersiz bulmanız veya süresinde cevap alamamanız halinde kanuni süreler içinde Kişisel Verileri Koruma Kuruluna şikâyet hakkınız saklıdır.",
          ],
        },
      ],
      references: kvkkReferencesTr,
    },
    explicitConsent: {
      title: "Açık Rıza Metni",
      updatedAt: "13 Temmuz 2026",
      intro: "Bu metin, Enbilir'de yalnızca isteğe bağlı ve açık rıza gerektiren işlemlerde rızanızın nasıl istendiğini, kaydedildiğini ve geri alınabildiğini açıklar. Üyelik için gerekli sözleşme ve güvenlik işlemleri açık rızaya değil, ilgili diğer hukuki sebeplere dayanır.",
      highlights: [
        "Açık rıza belirli bir konuya ilişkin olmalıdır.",
        "Elektronik ticari ileti izni üyelik için zorunlu değildir.",
        "Rızanızı dilediğiniz zaman ileriye etkili olarak geri alabilirsiniz.",
      ],
      sections: [
        {
          heading: "Aydınlatma ile açık rıza arasındaki fark",
          paragraphs: [
            "KVKK Aydınlatma Metni, verilerin hangi amaç ve hukuki sebeplerle işlendiğine ilişkin bilgi verir. Açık rıza ise yalnızca belirli bir işleme özgü, bilgilendirmeye dayanan ve özgür iradeyle açıklanan olumlu tercihtir.",
            "Aydınlatma metninin okunduğunun teyidi, Kullanım Şartlarının kabulü veya yatırım uyarısının görülmesi açık rıza yerine geçmez. Enbilir bu kayıtları ayrı amaçlarla tutar ve rıza kutularını önceden işaretli sunmaz.",
          ],
        },
        {
          heading: "Geçerli rızanın koşulları",
          paragraphs: [
            "Bir açık rızanın geçerli olabilmesi için konusunun açıkça belirtilmesi, veri işleme faaliyeti hakkında yeterli bilgi verilmesi ve tercihin baskı altında kalmadan açıklanması gerekir. Sessizlik, hareketsizlik veya hizmeti kullanmaya devam etmek tek başına rıza sayılmaz.",
          ],
          bullets: [
            "Rıza, belirsiz veya gelecekteki tüm işlemleri kapsayan genel bir izin olarak yorumlanmaz.",
            "Birden fazla bağımsız amaç varsa tercihler mümkün olduğu ölçüde ayrı ayrı sunulur.",
            "Rızanın verildiğini ve hangi metin sürümüne ilişkin olduğunu ispat yükümlülüğü veri sorumlusundadır.",
            "Başka bir hukuki sebebe dayanan zorunlu işlem, sonradan yapay biçimde açık rızaya bağlanmaz.",
          ],
        },
        {
          heading: "Elektronik ticari ileti tercihi",
          paragraphs: [
            "Kayıt sırasında sunulan elektronik ileti seçeneği isteğe bağlıdır. İşaretlemeniz halinde Enbilir'in eğitim içerikleri, ürün ve özellik duyuruları, etkinlikler, üyelik fırsatları veya benzeri tanıtım ve bilgilendirme iletilerini kayıtlı iletişim kanalınıza göndermesine izin verirsiniz.",
            "Hizmetin çalışması için zorunlu olan e-posta doğrulama, şifre ve hesap güvenliği bildirimleri, işlem/abonelik teyitleri veya hukuki bilgilendirmeler pazarlama izninden bağımsız olarak gönderilebilir. İleti iznini vermemeniz üyelik oluşturmanızı engellemez.",
          ],
        },
        {
          heading: "Zorunlu olmayan çerez ve benzeri teknolojiler",
          paragraphs: [
            "Enbilir ileride analitik, kişiselleştirme veya pazarlama amacıyla zorunlu olmayan çerezler kullanırsa, bu teknolojiler gerekli bilgilendirme yapıldıktan sonra ayrı bir tercih paneli üzerinden etkinleştirilir. Çerez duvarı yoluyla genel ve koşulsuz rıza alınmaz.",
            "Mevcut zorunlu oturum ve güvenlik çerezleri, hizmetin kurulması, güvenliği ve veri sorumlusunun meşru menfaati gibi uygulanabilir hukuki sebeplere dayanabilir; bunlar için yanıltıcı biçimde açık rıza istenmez.",
          ],
        },
        {
          heading: "Yapay zekâ özelliklerinde kullanıcı kontrolü",
          paragraphs: [
            "Yapay zekâ asistanı, sesli istem, rapor veya piyasa analizi gibi isteğe bağlı özellikleri kullanmanız halinde gönderdiğiniz içerik, özelliği yerine getirmek için teknik hizmet sağlayıcılara iletilebilir. Bu işleme sözleşmenin ifası veya başka bir hukuki sebebe dayanmıyorsa gerekli ayrı açık rıza, özellik kullanılmadan önce ve kapsamı belirtilerek alınır.",
            "Rıza verilmiş olsa dahi özel nitelikli kişisel veri, gerçek kart/hesap bilgisi, erişim şifresi veya üçüncü kişilere ait gizli bilgi göndermemelisiniz. Yapay zekâ özelliğini kullanmamak, Enbilir'in temel üyelik ve sanal portföy işlevlerine erişimi ortadan kaldırmaz.",
          ],
        },
        {
          heading: "Rızanın kaydı ve ispatı",
          paragraphs: [
            "Rıza verdiğinizde seçimin konusu, metin sürümü, tarih-saat ve hesapla ilişkilendirilen teknik kayıt ispat ve tercih yönetimi amacıyla saklanabilir. Rıza vermediğiniz veya geri aldığınız bilgisi de aynı iletişimin tekrar gönderilmesini önlemek ve tercihinize uymak için tutulabilir.",
            "Rıza kayıtlarının saklanması, geri alınmış bir rızaya dayanarak yeni işleme yapılmasına izin vermez; kayıt yalnızca yükümlülüklerin ispatı ve uyuşmazlıkların yönetimi amacıyla sınırlı şekilde kullanılır.",
          ],
        },
        {
          heading: "Rızayı geri alma ve sonuçları",
          paragraphs: [
            "Açık rızanızı hesap tercihleri veya her ticari iletideki ret yöntemi üzerinden ya da info@ultraakil.com adresine kayıtlı e-posta hesabınızdan yazarak geri alabilirsiniz. Talep kimliğiniz doğrulandıktan sonra ilgili rızaya dayalı işlem makul olan en kısa sürede durdurulur.",
            "Geri alma işlemi ileriye etkilidir; geri alma öncesinde hukuka uygun yapılan işlemleri geçersiz kılmaz. Aynı veri için sözleşmenin ifası, hukuki yükümlülük veya hakların korunması gibi ayrı bir hukuki sebep devam ediyorsa veri yalnızca o sebebin gerektirdiği kapsamda işlenmeye devam edebilir.",
          ],
        },
        {
          heading: "Değişiklik ve iletişim",
          paragraphs: [
            "Rızanın kapsamını genişleten veya amacını değiştiren yeni bir işlem, eski rızaya dayanılarak başlatılmaz. Gerekli olduğunda güncel bilgilendirme sunulur ve yeni, ayrı bir tercih alınır.",
            "Açık rıza ve tercihlerinize ilişkin sorularınızı Şirkete info@ultraakil.com adresinden iletebilirsiniz. Kişisel verilerin işlenmesine ilişkin haklar için KVKK Aydınlatma Metnindeki başvuru usulü geçerlidir.",
          ],
        },
      ],
      references: [
        { label: "KVKK - Açık rıza alırken dikkat edilecek hususlar", href: "https://www.kvkk.gov.tr/Icerik/2037/Acik-Riza-Alirken-Dikkat-Edilecek-Hususlar" },
        { label: "Aydınlatma ve açık rıza metinlerinin ayrı düzenlenmesine ilişkin 2026/347 sayılı İlke Kararı", href: "https://www.kvkk.gov.tr/Icerik/8710/veri-sorumlulari-tarafindan-acik-riza-ve-aydinlatma-metinlerinin-ayri-ayri-duzenlenmesi-gerektigi-hakkinda-kisisel-verileri-koruma-kurulunun-18-02-2026-tarihli-ve-2026-347-sayili-ilke-kararina-iliskin-kamuoyu-duyurusu" },
      ],
    },
    cookies: {
      title: "Çerez Politikası",
      updatedAt: "13 Temmuz 2026",
      intro: "Bu politika, Enbilir'in güvenli oturum, kimlik doğrulama ve tercihlerin hatırlanması için kullandığı çerezleri; tarayıcıdaki localStorage ve sessionStorage gibi benzer teknolojileri ve bunları nasıl yönetebileceğinizi açıklar.",
      highlights: [
        "Oturum çerezi en fazla 7 gün süreyle ayarlanır.",
        "Pazarlama amaçlı çerez profillemesi şu anda kullanılmamaktadır.",
        "Tarayıcıda saklanan tercihleri istediğiniz zaman silebilirsiniz.",
      ],
      sections: [
        {
          heading: "Çerez ve benzer teknoloji nedir?",
          paragraphs: [
            "Çerez, bir internet sitesi tarafından tarayıcınıza bırakılan küçük metin kaydıdır. localStorage daha kalıcı, sessionStorage ise çoğunlukla sekme veya tarayıcı oturumu boyunca tutulan istemci depolama alanıdır. Bu teknolojiler tek başına bilgisayarınızdaki diğer dosyalara erişmez.",
            "Enbilir bu araçları hizmetin güvenli çalışması, tekrar eden işlemlerin önlenmesi ve seçtiğiniz ayarların hatırlanması için kullanır. Hukuki nitelendirme, teknolojinin adına değil kullanım amacına göre yapılır.",
          ],
        },
        {
          heading: "Kullanılan zorunlu çerezler",
          paragraphs: [
            "Aşağıdaki çerezler üyelik, kimlik doğrulama veya işlem güvenliği için gereklidir. HttpOnly özelliği kullanılan çerezlere tarayıcıdaki JavaScript erişemez; üretim ortamında Secure özelliği ile yalnızca HTTPS üzerinden gönderilir.",
          ],
          bullets: [
            "enbilir_session: giriş yapan kullanıcıyı tanır ve güvenli oturumu sürdürür. HttpOnly, SameSite=Lax ve üretimde Secure olarak ayarlanır; azami ömrü 7 gündür, çıkışta silinir.",
            "enbilir_google_oauth_state: Google ile giriş sırasında isteğin aynı tarayıcıdan başladığını doğrular ve yönlendirme saldırılarını azaltır. HttpOnly, SameSite=Lax, üretimde Secure; azami 10 dakika.",
            "enbilir_trade_[kullanıcı]: aynı sanal portföy emrinin yanlışlıkla iki kez kaydedilmesini önleyen tek kullanımlık işlem anahtarını tutar. HttpOnly, SameSite=Strict, üretimde Secure; azami 10 dakika.",
          ],
          note: "Zorunlu çerezler engellenirse giriş, Google ile kimlik doğrulama ve sanal işlem güvenliği işlevleri düzgün çalışmayabilir.",
        },
        {
          heading: "Tarayıcıda saklanan tercihler",
          paragraphs: [
            "Enbilir bazı bilgileri sunucuya göndermeden veya sunucudaki hesabınızla eş zamanlı olarak tarayıcı depolamasında tutar. Bu kayıtlar çerez değildir; ancak şeffaflık ve kullanıcı kontrolü bakımından bu politikada birlikte açıklanır.",
          ],
          bullets: [
            "Risk iştahı testindeki cevaplar, mevcut soru ve sonuç görünümü; testi kaldığınız yerden sürdürebilmeniz için localStorage'da tutulur.",
            "Kullanım kılavuzu, yönlendirmeli yardım ve eğitim adımlarının görülme/tamamlanma durumu localStorage veya sessionStorage'da tutulabilir.",
            "AI piyasa terminalindeki favori varlıklar, sesli uyarı tercihi ve aynı uyarının kısa sürede tekrar gösterilmesini önleyen kayıtlar localStorage'da tutulur; favoriler hesabınızla da eşitlenebilir.",
            "Kayıt veya onboarding ziyaretinin aynı oturumda birden fazla ölçülmesini önleyen rastgele oturum anahtarları sessionStorage'da tutulabilir.",
          ],
        },
        {
          heading: "Saklama süreleri",
          paragraphs: [
            "Süreli çerezler yukarıda belirtilen azami süre sonunda tarayıcı tarafından kaldırılır; kullanıcı çıkışı gibi olaylarda daha önce de silinebilir. sessionStorage kayıtları genellikle sekme veya tarayıcı oturumu kapandığında sona erer.",
            "localStorage kayıtlarının kendiliğinden sona eren sabit bir süresi olmayabilir. İlgili özelliğin sıfırlama seçeneğini kullanarak, site verilerini tarayıcı ayarlarından silerek veya uygulama güncellemesiyle geçersiz kılındığında kaldırılır. Hesapla eşitlenen veriler için KVKK Aydınlatma Metnindeki saklama esasları ayrıca geçerlidir.",
          ],
        },
        {
          heading: "Üçüncü taraf hizmet ve içerikler",
          paragraphs: [
            "Google ile giriş, ödeme sayfasına yönlendirme veya dış kaynaklı video/içerik gibi bir özelliği seçtiğinizde ilgili sağlayıcının alan adına geçebilir ya da içeriği tarayıcınıza yüklenebilir. Bu sağlayıcılar kendi çerez ve gizlilik kurallarını uygulayabilir.",
            "Zorunlu olmayan üçüncü taraf içeriğinin çerez veya benzeri tanımlayıcı kullanması halinde, mümkün olan yerde içerik yüklenmeden önce gerekli tercih mekanizması uygulanır. Harici bağlantıya geçtiğinizde sağlayıcının politikasını ayrıca incelemeniz gerekir.",
          ],
        },
        {
          heading: "Analitik ve pazarlama teknolojileri",
          paragraphs: [
            "Enbilir şu anda üçüncü taraf reklam takibi veya davranışsal pazarlama amacıyla çerez profili oluşturmamaktadır. Hizmet içi kullanım olayları, performans ve onboarding iyileştirmesi için birinci taraf sistemlerde hesap veya rastgele oturum anahtarıyla ölçülebilir.",
            "İleride zorunlu olmayan analitik, kişiselleştirme veya pazarlama çerezi eklenirse bu politika ve tercih paneli güncellenir. Açık rıza gerektiren teknoloji varsayılan olarak kapalı tutulur ve reddetme seçeneği kabul etme kadar erişilebilir sunulur.",
          ],
        },
        {
          heading: "Çerezleri ve depolamayı yönetme",
          paragraphs: [
            "Tarayıcınızın gizlilik veya site verileri bölümünden çerezleri görüntüleyebilir, silebilir, tümünü ya da üçüncü taraf çerezlerini engelleyebilirsiniz. localStorage ve sessionStorage kayıtları da çoğu tarayıcıda site verilerini temizleme seçeneğiyle silinir.",
            "Tüm site verilerini silmek oturumu kapatır; risk testi ilerlemesi, favoriler, ses ve yardım tercihleri kaybolabilir. Hesabınızda sunucuda saklanan kayıtlar yalnızca tarayıcı verilerini silmekle kaldırılmaz; bunlar için hesap ayarları veya KVKK başvuru kanalı kullanılmalıdır.",
          ],
        },
        {
          heading: "Güncellemeler ve iletişim",
          paragraphs: [
            "Çerezlerin adı, amacı veya süresi değiştiğinde bu politika güncellenir ve önemli değişiklikler uygun arayüz bildirimiyle duyurulur. Yeni bir açık rıza amacı eski bir tercihe dayanılarak etkinleştirilmez.",
            "Çerezler ve veri koruma tercihleri hakkında Şirkete info@ultraakil.com adresinden ulaşabilirsiniz.",
          ],
        },
      ],
      references: [
        { label: "KVKK - Çerez Uygulamaları Hakkında Rehber", href: "https://www.kvkk.gov.tr/Icerik/7353/Cerez-Uygulamalari-Hakkinda-Rehber" },
        { label: "Kişisel Verileri Koruma Kurulunun 2022/1358 sayılı çerez kararı", href: "https://www.kvkk.gov.tr/Icerik/7595/2022-1358" },
      ],
    },
    terms: {
      title: "Kullanım Şartları",
      updatedAt: "13 Temmuz 2026",
      intro: "Bu şartlar, Ultra Bilişsel Akıl Danışmanlık Bilişim Destek ve Servis Hizmetleri Limited Şirketi tarafından işletilen Enbilir'in web sitesi, üyelik, sanal portföy, lig, topluluk, eğitim, rapor ve yapay zekâ özelliklerinin kullanımına ilişkin tarafların hak ve sorumluluklarını düzenler.",
      highlights: [
        "Enbilir eğitim ve sanal yarışma platformudur.",
        "Gerçek para, emir iletimi veya yatırım hesabı bulunmaz.",
        "Toplulukta saygılı, hukuka uygun ve güvenli kullanım zorunludur.",
      ],
      sections: [
        {
          heading: "Taraflar ve şartların kabulü",
          paragraphs: [
            "Hizmet sağlayıcı Ultra Bilişsel Akıl Danışmanlık Bilişim Destek ve Servis Hizmetleri Limited Şirketi (Şirket), hizmet ise Enbilir'dir. Siteyi ziyaret eden kişi ziyaretçi; hesap oluşturan kişi kullanıcı veya üye olarak anılır.",
            "Üyelik oluşturmanız, Kullanım Şartlarını kabul etmeniz ve hizmeti kullanmanız bu metne tabi olduğunuz anlamına gelir. KVKK Aydınlatma Metni, Çerez Politikası ve Yatırım Tavsiyesi Değildir açıklaması bu şartları tamamlar; açık rıza gerektiren tercihler ayrıca alınır.",
          ],
        },
        {
          heading: "Platformun niteliği ve hizmet kapsamı",
          paragraphs: [
            "Enbilir finansal okuryazarlık, piyasa kavramlarını öğrenme, sanal portföy oluşturma, eğitim, lig ve topluluk deneyimi sunar. Platform yatırım kuruluşu, banka, aracı kurum, portföy yönetim şirketi veya yetkili yatırım danışmanı değildir.",
            "Enbilir üzerinden gerçek para yatırılmaz, saklanmaz veya çekilmez; borsa ya da kripto para platformuna emir iletilmez ve kullanıcı adına gerçek varlık alınmaz. Sanal bakiyeler ve skorlar yalnızca platform içi deneyimdir, paraya çevrilemez ve alacak hakkı oluşturmaz.",
          ],
        },
        {
          heading: "Üyelik koşulları ve hesap güvenliği",
          paragraphs: [
            "Kullanıcı kayıt sırasında doğru, güncel ve kendisine ait bilgi vermeli; e-posta doğrulamasını tamamlamalı ve en az 8 karakterli güçlü bir şifre seçmelidir. Başkasının kimliğiyle hesap açılamaz, hesap devredilemez veya satılamaz.",
            "Şifrenizin ve oturum açtığınız cihazların güvenliği sizin sorumluluğunuzdadır. Yetkisiz erişim şüphesinde şifrenizi değiştirip destek ekibine bildirmelisiniz. Şirket güvenlik amacıyla ek doğrulama isteyebilir, şüpheli oturumu sonlandırabilir veya hesabı geçici olarak kısıtlayabilir.",
            "Fiil ehliyetine ilişkin zorunlu mevzuat hükümleri saklıdır. Reşit olmayanların hizmeti kullanması, uygulanabilir hukuka ve gerektiğinde veli/vasi gözetimine tabidir; platform çocuklara yönelik tasarlanmamıştır.",
          ],
        },
        {
          heading: "Sanal portföy, işlemler ve fiyat verileri",
          paragraphs: [
            "Sanal işlemler, Enbilir'de görüntülenen fiyat ve zaman bilgisine göre kaydedilir. Dış piyasa kaynağındaki gecikme, kesinti, yuvarlama, kur farkı, piyasa kapanışı veya teknik hata nedeniyle Enbilir değeri gerçek piyasa fiyatından farklı olabilir.",
            "Kullanıcı sanal işlem miktarını ve gerekçesini kendi seçer. Sistem, mükerrer talebi önleme, bakiye kontrolü, varlık bulunabilirliği ve yarışma bütünlüğü için işlemi reddedebilir veya hatalı kaydı düzeltebilir. Sanal performans gerçek işlem maliyetleri, vergi, komisyon, likidite ve kayma etkilerini bütünüyle yansıtmayabilir.",
          ],
        },
        {
          heading: "Ligler, liderlik tabloları ve yarışma kuralları",
          paragraphs: [
            "Lig ve liderlik sonuçları ilan edilen dönem, başlangıç değeri, sanal portföy kârı ve ilgili yarışma kurallarıyla hesaplanır. Kullanıcının seçtiği görüntüleme biçimine göre adı veya takma adı, sırası, puanı, rozeti ve sanal getirisi diğer üyelere gösterilebilir.",
            "Çoklu hesap, otomasyon, sistem açığından yararlanma, fiyat hatasını kötüye kullanma, muvazaalı davranış veya diğer katılımcıların sonucunu manipüle etme yasaktır. Şirket açık hata veya kötüye kullanım halinde işlemi, puanı veya sıralamayı inceleyebilir; gerekçeli olarak düzeltebilir ya da yarışmadan çıkarabilir.",
            "Ödüllü bir kampanya veya yarışma düzenlenirse süre, katılım, ödül, vergiler, eşitlik bozma ve itiraz koşulları ayrıca yayımlanan özel kurallarda belirtilir. Platform içi olağan sıralama kendiliğinden ödül hakkı doğurmaz.",
          ],
        },
        {
          heading: "Risk testi, raporlar ve yapay zekâ özellikleri",
          paragraphs: [
            "Risk İştahı Testi cevaplarınızdan eğitim amaçlı genel bir profil oluşturur; sermaye piyasası mevzuatındaki yerindelik veya uygunluk testi değildir. Günlük/haftalık raporlar, AI Asistanı ve AI Piyasa Terminali genel bilgi üretir; kişisel mali durumunuzu eksiksiz bilmez.",
            "Yapay zekâ çıktıları olasılıksal olarak üretilir ve hata, uydurma bilgi, eksik bağlam veya güncellik sorunu içerebilir. Kritik bir karardan önce kaynak, tarih ve hesaplamaları doğrulamak kullanıcı sorumluluğundadır. Bu çıktılar gerçek yatırım kararı, hukuki, mali veya vergisel danışmanlık için tek başına kullanılmamalıdır.",
          ],
        },
        {
          heading: "Topluluk, sohbet ve kullanıcı içerikleri",
          paragraphs: [
            "Sohbet, oda, anket, profil veya işlem gerekçesi alanına yazdığınız içerikten siz sorumlusunuz. Kişilik haklarını ihlal eden, tehdit, taciz, nefret söylemi, spam, yanıltıcı yatırım vaadi, piyasa manipülasyonu, yasa dışı ürün/hizmet, zararlı yazılım veya üçüncü kişiye ait gizli veri içeren paylaşım yapılamaz.",
            "Şirket; bildirim üzerine veya güvenlik denetimi kapsamında içeriği inceleyebilir, görünürlüğünü kaldırabilir, kullanıcıyı uyarabilir, iletişim özelliklerini kısıtlayabilir ya da hesabı askıya alabilir. Bu moderasyon, kullanıcı içeriğinin doğruluğunun Şirket tarafından onaylandığı anlamına gelmez.",
            "Paylaştığınız içerik için gerekli haklara sahip olmalısınız. Hizmetin işletilmesi, gösterilmesi, güvenliği ve moderasyonu için Şirkete dünya çapında, münhasır olmayan, bedelsiz ve hesabınız/işleme amacı sürdüğü ölçüde geçerli teknik kullanım izni verirsiniz; içerik mülkiyeti kural olarak sizde kalır.",
          ],
        },
        {
          heading: "Ücretli üyelikler ve ödemeler",
          paragraphs: [
            "Standart veya VIP gibi ücretli paketler sunulduğunda fiyat, dönem, kapsam ve yenileme koşulları satın alma öncesinde gösterilir. Ödeme, yetkili ödeme kuruluşunun güvenli sayfasında tamamlanabilir; Enbilir tam kart numaranızı saklamaz.",
            "Cayma, iptal, iade ve tüketici hakları; hizmetin niteliği, ifaya başlama zamanı, satın alma ekranındaki ön bilgilendirme ve yürürlükteki tüketici mevzuatına göre uygulanır. Emredici tüketici haklarını ortadan kaldıran bir yorum yapılamaz.",
          ],
        },
        {
          heading: "Yasak kullanımlar",
          paragraphs: [
            "Kullanıcı platforma veya başka kullanıcıya zarar verecek faaliyetlerde bulunamaz. Şirket, makul güvenlik sınırları uygulayabilir ve ihlal şüphesini araştırabilir.",
          ],
          bullets: [
            "Yetkisiz erişim denemesi, güvenlik açığı taraması, tersine mühendislik veya teknik korumaları aşma.",
            "Robot, bot, scraper veya otomatik sorgu ile makul kullanım sınırlarını aşma; veriyi izinsiz toplama veya yeniden satma.",
            "Sahte hesap, kimlik taklidi, oltalama, kötü amaçlı bağlantı, spam veya platform ölçümlerini yapay biçimde etkileme.",
            "Fikri mülkiyet, kişisel veri, tüketici, sermaye piyasası veya diğer uygulanabilir mevzuatı ihlal etme.",
          ],
        },
        {
          heading: "Fikri mülkiyet ve üçüncü taraf kaynakları",
          paragraphs: [
            "Enbilir markası, arayüzü, yazılımı, özgün metinleri, görselleri, veri düzeni ve rapor şablonları üzerindeki haklar Şirkete veya lisans verenlerine aittir. Kişisel ve ticari olmayan olağan kullanım dışında çoğaltma, yayımlama, satma veya türev ürün oluşturma için yazılı izin gerekir.",
            "Piyasa fiyatı, haber, video, bağlantı ve bazı içerikler üçüncü taraflardan gelebilir. Kaynakların kullanım koşulları ve hakları saklıdır. Harici siteye geçiş, o sitenin Şirket tarafından işletildiği veya tüm içeriğinin onaylandığı anlamına gelmez.",
          ],
        },
        {
          heading: "Hizmet sürekliliği, değişiklik ve bakım",
          paragraphs: [
            "Şirket güvenlik, bakım, kapasite, sağlayıcı kesintisi, mücbir sebep veya mevzuat değişikliği nedeniyle hizmeti geçici olarak durdurabilir ya da özellikleri değiştirebilir. Makul olarak öngörülebilen önemli kesintiler mümkünse önceden duyurulur.",
            "Belirli bir özellik, piyasa verisi, yapay zekâ modeli veya üçüncü taraf entegrasyonunun süresiz sunulacağı taahhüt edilmez. Ücretli pakette esaslı değişiklik yapılırsa satın alma koşulları ve emredici kullanıcı hakları gözetilir.",
          ],
        },
        {
          heading: "Hesabın askıya alınması ve sona ermesi",
          paragraphs: [
            "Kullanıcı hesabının kapatılmasını isteyebilir. Şirket; bu şartların ağır veya tekrarlanan ihlali, güvenlik riski, sahtecilik, hukuki zorunluluk ya da diğer kullanıcıların korunması için hesabı geçici olarak askıya alabilir veya kapatabilir. Acil durumlar dışında uygun olduğunda açıklama ve itiraz kanalı sağlanır.",
            "Hesabın kapanması sanal bakiye, sıralama ve erişim haklarını sona erdirir. Kişisel veriler KVKK Aydınlatma Metnindeki saklama ve silme esaslarına göre yönetilir; kanunen saklanması gereken kayıtlar hesapla birlikte derhal silinmeyebilir.",
          ],
        },
        {
          heading: "Sorumluluğun sınırı",
          paragraphs: [
            "Şirket hizmeti özenle sunmaya çalışır; ancak kesintisiz erişim, piyasa verilerinin anlık ve hatasız olması, yapay zekâ çıktılarının doğruluğu veya sanal sonucun gerçek piyasada tekrarlanması garanti edilmez. Kullanıcının gerçek yatırım kararı ve üçüncü taraf platformdaki işlemi kendi sorumluluğundadır.",
            "Sorumluluğu sınırlayan hükümler kast, ağır kusur, kişisel verilerin korunması, tüketicinin emredici hakları veya kanunen sınırlandırılamayan diğer haller için uygulanmaz. Kullanıcı kusurundan, şart ihlalinden veya hukuka aykırı içeriğinden doğan doğrudan sonuçlardan sorumludur.",
          ],
        },
        {
          heading: "Uygulanacak hukuk, değişiklik ve iletişim",
          paragraphs: [
            "Bu şartlara Türk hukuku uygulanır. Emredici tüketici hükümleri saklı kalmak üzere uyuşmazlıklarda kanunen yetkili tüketici hakem heyetleri, tüketici mahkemeleri ve diğer yargı mercileri yetkilidir.",
            "Şartlar hizmet veya mevzuat değiştiğinde güncellenebilir. Kullanıcı aleyhine esaslı değişiklikler yürürlüğe girmeden önce uygun bir yöntemle duyurulur; gerekli hallerde yeniden kabul alınır. Sorularınızı info@ultraakil.com adresine iletebilirsiniz.",
          ],
        },
      ],
      references: [
        { label: "Sermaye Piyasası Kurulu - Yatırım Hizmetleri ve Kuruluşları Rehberi", href: "https://spk.gov.tr/kurumlar/yatirim-kuruluslari/araci-kurumlar/yatirim-hizmetleri-ve-kuruluslari-rehberi" },
        { label: "Kişisel Verileri Koruma Kurumu", href: "https://www.kvkk.gov.tr/" },
      ],
    },
    investmentDisclaimer: {
      title: "Yatırım Tavsiyesi Değildir",
      updatedAt: "13 Temmuz 2026",
      intro: "Enbilir'deki fiyatlar, haberler, grafikler, yapay zekâ yanıtları, raporlar, risk profilleri, sanal portföyler ve kullanıcı yorumları genel eğitim ve simülasyon amaçlıdır; yatırım danışmanlığı veya kişiye özel yatırım tavsiyesi değildir.",
      highlights: [
        "Enbilir SPK tarafından yetkilendirilmiş yatırım kuruluşu değildir.",
        "Sanal başarı gerçek piyasa getirisi garantisi vermez.",
        "Gerçek karar öncesinde veriyi doğrulayın ve yetkili uzmana danışın.",
      ],
      sections: [
        {
          heading: "Yatırım danışmanlığı sunulmaması",
          paragraphs: [
            "Sermaye piyasası mevzuatında yatırım danışmanlığı, yetkili kuruluş ile müşteri arasında kurulacak sözleşme çerçevesinde kişiye özel yönlendirici nitelikte yorum ve tavsiye sunulmasıdır. Şirket ve Enbilir bu kapsamda yetkilendirilmiş yatırım kuruluşu değildir.",
            "Platformdaki hiçbir içerik al, sat, tut, hedef fiyat, portföy dağılımı veya getiri vaadi olarak yorumlanmamalıdır. Enbilir kullanıcı adına emir iletmez, işlem gerçekleştirmez, varlık veya para saklamaz ve yatırım hesabı açmaz.",
          ],
        },
        {
          heading: "Genel bilgi ve eğitim içeriği",
          paragraphs: [
            "Piyasa açıklamaları, eğitim yazıları, günlük/haftalık raporlar ve örnek senaryolar genel bir kullanıcı kitlesine yöneliktir. Geliriniz, borçlarınız, yatırım süreniz, likidite ihtiyacınız, vergi durumunuz, bilgi düzeyiniz ve kayıp taşıma kapasiteniz eksiksiz değerlendirilmeden üretilir.",
            "Genel bilginin kişisel koşullarınıza uygun görünmesi onu kişiye özel tavsiyeye dönüştürmez. İçeriğe dayanarak işlem yapmadan önce bağımsız araştırma yapmalı ve gerekiyorsa SPK tarafından yetkilendirilmiş bir yatırım kuruluşundan hizmet almalısınız.",
          ],
        },
        {
          heading: "Risk İştahı Testinin sınırları",
          paragraphs: [
            "Enbilir Risk İştahı Testi, verdiğiniz cevapları puanlayarak eğitim amaçlı genel bir davranış profili üretir. Bu test sermaye piyasası mevzuatındaki yerindelik veya uygunluk testi değildir; yatırım hedeflerinizi ve mali durumunuzu düzenleyici standartlarda doğrulamaz.",
            "Test sonucu belirli bir varlığa, ürüne, kaldıraç düzeyine veya portföy oranına uygun olduğunuz anlamına gelmez. Koşullarınız değiştikçe cevaplar ve sonuç da geçerliliğini yitirebilir.",
          ],
        },
        {
          heading: "Yapay zekâ çıktılarının sınırları",
          paragraphs: [
            "AI Asistanı ve AI Piyasa Terminali; model çıktısı, sınırlı bağlam ve erişilebilen veri kaynaklarıyla çalışır. Yanıtlar uydurma bilgi, hesaplama hatası, yanlış sembol, gecikmiş fiyat, eksik haber veya hatalı yorum içerebilir.",
            "Yapay zekânın güvenli veya kendinden emin bir dil kullanması doğruluk garantisi değildir. Kaynak bağlantısını, veri zamanını, para birimini, dönem ve hesaplama yöntemini bağımsız biçimde doğrulamadan gerçek işlem kararı verilmemelidir.",
          ],
        },
        {
          heading: "Sanal portföy ve yarışma yanılgıları",
          paragraphs: [
            "Sanal portföydeki işlemler gerçek sermaye kaybı duygusunu, emir defteri derinliğini, likiditeyi, kaymayı, komisyonu, vergiyi ve bazı piyasa kısıtlarını tam olarak yansıtmayabilir. Bu nedenle sanal ortamda başarılı olmak aynı stratejinin gerçek piyasada aynı sonucu vereceğini göstermez.",
            "Liderlik tabloları yalnızca belirtilen yarışma dönemi ve sanal kurallar içindeki performansı sıralar. Yüksek getiri aşırı risk, yoğunlaşma veya kısa dönem şansından kaynaklanabilir; katılımcının uzmanlığına ya da gelecekteki performansına ilişkin onay değildir.",
          ],
        },
        {
          heading: "Piyasa verisi, grafik ve haber riski",
          paragraphs: [
            "Fiyatlar ve grafikler üçüncü taraf kaynaklardan alınabilir; gecikmeli, eksik, yuvarlanmış veya geçici olarak hatalı olabilir. Farklı piyasa, borsa, saat dilimi, kur ve veri sağlayıcısı aynı varlık için farklı değer gösterebilir.",
            "Haber başlıkları bağlamı eksik yansıtabilir; geçmiş veri ve teknik gösterge gelecekteki fiyatı garanti etmez. Bir içeriğin yayımlanması, doğruluğunun bağımsız olarak teyit edildiği veya ilgili varlığın desteklendiği anlamına gelmez.",
          ],
        },
        {
          heading: "Varlık sınıflarına özgü riskler",
          paragraphs: [
            "Pay senetleri şirket ve piyasa riski; döviz ve emtialar kur, faiz ve jeopolitik risk; kripto varlıklar yüksek oynaklık, likidite, saklama, siber güvenlik ve düzenleyici belirsizlik taşıyabilir. Kaldıraçlı ürünlerde kayıplar çok hızlı oluşabilir ve ürünün yapısına göre yatırılan tutarı aşan yükümlülükler doğabilir.",
            "Yabancı varlıklarda ek olarak saat farkı, ülke riski, vergi, transfer ve kur etkileri vardır. Buradaki kısa risk özeti her ürüne ait izahname, temel bilgi dokümanı veya yetkili kuruluş açıklamasının yerine geçmez.",
          ],
        },
        {
          heading: "Kullanıcı yorumları ve üçüncü taraf bağlantıları",
          paragraphs: [
            "Sohbet, lig, profil veya topluluk alanındaki yorumlar ilgili kullanıcıya aittir; Şirketin görüşü veya tavsiyesi değildir. Kullanıcıların çıkar çatışması bulunabilir, pozisyonu açıklanmamış olabilir veya içerik manipülatif olabilir.",
            "Harici bağlantı, video, haber veya ödeme/işlem platformuna yönlendirme o kuruluşun tavsiye edildiği anlamına gelmez. Üçüncü tarafın lisansını, ücretini, risk açıklamasını ve güvenliğini ayrıca kontrol etmelisiniz.",
          ],
        },
        {
          heading: "Geçmiş performans ve getiri garantisi",
          paragraphs: [
            "Geçmiş, varsayımsal, geriye dönük test edilmiş veya sanal performans gelecekteki sonuçların güvenilir göstergesi değildir. Seçilmiş başarılı örnekler kayıpları, başarısız stratejileri veya piyasa koşulu değişikliklerini görünmez kılabilir.",
            "Enbilir, Şirket, içerik üreticileri veya diğer kullanıcılar hiçbir getiri, ana para koruması ya da zarar sınırı garanti etmez. Her yatırım kararı kısmen veya tamamen kayıp riski taşır.",
          ],
        },
        {
          heading: "Karar vermeden önce",
          paragraphs: [
            "Gerçek işlemden önce ürünün yetkili dokümanlarını okuyun; fiyat ve haberi birden fazla güvenilir kaynaktan doğrulayın; ücret, vergi, likidite, vade, kaldıraç ve en kötü durum kaybını değerlendirin. Anlamadığınız üründe işlem yapmayın ve acil ihtiyaç paranızı riske atmayın.",
            "Kişisel durumunuza uygun değerlendirme için SPK tarafından yetkilendirilmiş yatırım kuruluşuna; vergi ve hukuk konularında ilgili yetkili uzmana başvurun. Enbilir içeriği tek başına gerçek işlem kararının dayanağı yapılmamalıdır.",
          ],
          note: "Platformu kullanarak riskleri gördüğünüzü teyit etmeniz, Şirketin kanundan doğan sorumluluklarını kaldırmaz ve size belirli bir işlemi önerdiğimiz anlamına gelmez.",
        },
      ],
      references: [
        { label: "Sermaye Piyasası Kurulu - Yatırım Hizmetleri ve Kuruluşları Rehberi", href: "https://spk.gov.tr/kurumlar/yatirim-kuruluslari/araci-kurumlar/yatirim-hizmetleri-ve-kuruluslari-rehberi" },
        { label: "Sermaye Piyasası Kurulu Mevzuat Sistemi", href: "https://mevzuat.spk.gov.tr/" },
      ],
    },
  },
  en: {
    kvkk: {
      title: "Privacy Notice under Turkish Data Protection Law",
      updatedAt: "July 13, 2026",
      intro: "This notice explains how Ultra Bilişsel Akıl Danışmanlık Bilişim Destek ve Servis Hizmetleri Limited Şirketi processes your personal data when you visit Enbilir, create an account, join virtual portfolios and leagues, use AI features, or contact us.",
      highlights: [
        "Data controller: Ultra Bilişsel Akıl Danışmanlık Bilişim Destek ve Servis Hizmetleri Limited Şirketi",
        "Enbilir does not execute real-money investment transactions.",
        "KVKK requests are answered within 30 days at the latest.",
      ],
      sections: [
        {
          heading: "Data controller, service, and scope",
          paragraphs: [
            "For the purposes of Turkish Personal Data Protection Law No. 6698 (KVKK), the data controller is Ultra Bilişsel Akıl Danışmanlık Bilişim Destek ve Servis Hizmetleri Limited Şirketi. Enbilir is the financial literacy, education, AI-assisted information, virtual portfolio, and competition service provided by the Company through enbilir.com.",
            "This notice covers visitors, members, applicants for membership, users of community and chat features, persons submitting support requests, and anyone contacting the platform for another reason. Separate notices apply where the Company conducts distinct employee, supplier, or business-partner processes.",
          ],
          note: "The duty to inform and explicit consent are separate. Reading or confirming this notice does not by itself mean that you have given explicit consent.",
        },
        {
          heading: "Categories of personal data we process",
          paragraphs: [
            "Depending on the feature you use, some or all of the following data may be processed. The platform does not request special-category data that is unnecessary for the service; do not enter health, biometric, political, or similarly sensitive information into AI or chat fields.",
          ],
          bullets: [
            "Identity and account data: name, username or nickname, display-name preference, user role, account status, and membership tier.",
            "Contact and verification data: email address, verification time, communication preferences, support requests, and correspondence.",
            "Security data: one-way password hash, session token, verification tokens, duplicate-action prevention records, timestamps, and technical error/security logs.",
            "Virtual portfolio and competition data: virtual balance, positions, virtual trades and trade reasons, portfolio snapshots, score, league, ranking, badges, and weekly competition results.",
            "Preference and usage data: risk-appetite answers and result, education progress, favorite assets, guided-help and onboarding progress, and feature-use events.",
            "AI and community data: text or voice submitted to the assistant, generated reports, favorites, chat messages, room and poll activity, blocks, and reports.",
            "Payment and subscription data: plan type, subscription dates, payment-status records, and payment-provider redirect details. Enbilir does not store full card details.",
          ],
        },
        {
          heading: "Purposes of processing",
          paragraphs: [
            "Data is processed for specified, explicit, and legitimate purposes and in a manner that is relevant, limited, and proportionate. A new purpose is reassessed for its legal basis and transparency requirements.",
          ],
          bullets: [
            "Creating memberships, verifying email, providing secure login, and managing account preferences.",
            "Calculating and displaying virtual trades, leagues, rankings, badges, and daily or weekly reports.",
            "Providing the risk-appetite test, education progress, AI assistant, AI market terminal, reports, and chat features.",
            "Answering requests, sending service notices, and, where permission exists, sending commercial electronic messages.",
            "Preventing fraud, duplicate or unauthorized actions, security incidents, and breaches of community rules.",
            "Measuring performance, fixing errors, improving user experience, and producing anonymous or aggregated statistics.",
            "Managing subscription entitlements and payments, meeting accounting and legal duties, and protecting rights in disputes.",
          ],
        },
        {
          heading: "Legal bases",
          paragraphs: [
            "Personal data is processed under the applicable legal basis in Article 5 of the KVKK. Explicit consent is used only for optional processing where no other legal basis applies and consent is required by law.",
          ],
          bullets: [
            "Necessity for entering into or performing membership, virtual portfolio, or subscription services (Art. 5/2-c).",
            "Compliance with the controller's legal duties, including electronic records, accounting, consumer, and competent-authority obligations (Art. 5/2-ç).",
            "Establishment, exercise, or protection of a right and management of complaints or disputes (Art. 5/2-e).",
            "Legitimate interests in account security, abuse prevention, service improvement, and measurement, without harming fundamental rights (Art. 5/2-f).",
            "Explicit consent, where required, for optional activities such as commercial electronic messages and non-essential tracking technologies (Art. 5/1).",
          ],
        },
        {
          heading: "Collection methods",
          paragraphs: [
            "Data is collected automatically or partly automatically from registration, login, profile, risk test, virtual trade, AI, chat, contact, and subscription forms; records created by your use; essential cookies; and browser-storage technologies.",
            "If you choose Google sign-in, we may receive the account identifiers and basic profile information Google shares. Market and news data comes from external sources, but those sources are not used with the intention of obtaining personal data about you.",
          ],
        },
        {
          heading: "Recipient groups",
          paragraphs: [
            "Personal data may be disclosed only to the extent necessary for the processing purpose, subject to confidentiality and security safeguards. Providers and contracts are assessed against data-protection principles.",
          ],
          bullets: [
            "Hosting, database, email, security, error-monitoring, and technical-support providers.",
            "Google authentication and AI or text/voice processing providers where you choose the relevant feature.",
            "The payment provider for subscriptions, and accountants, legal advisers, or auditors where necessary.",
            "Courts, enforcement bodies, and public authorities legally authorized to request data.",
            "Other members, limited to your chosen name or nickname, score, badges, league, and virtual performance in rankings and community areas.",
          ],
          note: "Passwords and full payment-card details are not disclosed to other users. Card data is processed on the payment provider's secure pages.",
        },
        {
          heading: "AI, profiling, and public areas",
          paragraphs: [
            "The risk-appetite test creates an educational score and profile from your answers. Virtual rankings are automatically calculated from virtual trades and published competition rules. These outputs do not make legally significant credit, investment-suitability, or customer-admission decisions.",
            "Prompts, voice transcripts, and context submitted to AI features may be processed to create responses or reports. Outputs may be inaccurate, incomplete, or outdated; do not enter sensitive personal data, real payment data, or another person's confidential information.",
            "In league, leaderboard, and community areas, your name or nickname, score, and virtual performance may be visible to others according to your profile preference. You can manage your display-name preference in account settings.",
          ],
        },
        {
          heading: "International transfers",
          paragraphs: [
            "Where cloud, authentication, email, or AI infrastructure is located abroad, personal data may be transferred internationally. Transfers are conducted under the applicable mechanism in current Article 9 of the KVKK, such as an adequacy decision, appropriate safeguards, or an exceptional transfer condition.",
            "Where safeguards are required, the Company uses standard contracts, binding corporate rules, an approved undertaking, or another statutory mechanism and makes required notifications. This notice is updated if a provider or transfer mechanism changes materially.",
          ],
        },
        {
          heading: "Retention, deletion, and anonymization",
          paragraphs: [
            "Data is kept for as long as needed for membership and the relevant feature, legal duties, limitation periods, security, and dispute management. At the end of that period, data is deleted, destroyed, or anonymized by an appropriate method.",
            "An account-deletion request affects active service data; however, financial records, proof of acceptance, consent timestamps, and security records may remain under restricted access where required by law or to protect rights. Anonymous competition statistics may be retained if they no longer identify you.",
          ],
        },
        {
          heading: "Security and data accuracy",
          paragraphs: [
            "The Company applies risk-appropriate measures such as access controls, one-way password hashing, secure session cookies, restricted privileges, backups, logging, and incident response. No internet service can promise absolute security, but identified risks are regularly assessed.",
            "You should keep account details accurate, avoid sharing passwords, and report suspicious activity. Where legally required, the Company notifies the Turkish Data Protection Board and affected persons of a personal-data breach.",
          ],
        },
        {
          heading: "Your KVKK rights and applications",
          paragraphs: [
            "Under Article 11 of the KVKK, you may ask whether data is processed; request information; learn the purpose and whether data is used accordingly; learn domestic or foreign recipients; request correction, and where conditions apply deletion or destruction, with notice to recipients; object to a result against you arising solely from automated analysis; and seek compensation for damage caused by unlawful processing.",
            "Submit your request with sufficient identity and request details from your registered email to info@ultraakil.com or in writing to Altıntepe Mahallesi, İstasyon Yolu Sokak, No: 3/1, Maltepe / Istanbul. Statutory registered electronic mail (KEP), secure electronic signature, or mobile-signature methods may also be used. Additional verification may be required for your security.",
            "Applications are answered free of charge as soon as possible and within 30 days at the latest. A Board-approved tariff may apply where processing creates an additional cost. Your statutory right to complain to the Turkish Data Protection Board remains available.",
          ],
        },
      ],
      references: kvkkReferencesEn,
    },
    explicitConsent: {
      title: "Explicit Consent Notice",
      updatedAt: "July 13, 2026",
      intro: "This notice explains how consent is requested, recorded, and withdrawn only for optional Enbilir activities that legally require explicit consent. Processing necessary for membership, security, or contracts relies on the relevant separate legal bases, not blanket consent.",
      highlights: [
        "Consent must relate to a specific purpose.",
        "Commercial-message consent is not required for membership.",
        "You may withdraw consent prospectively at any time.",
      ],
      sections: [
        {
          heading: "The difference between information and consent",
          paragraphs: [
            "The Privacy Notice explains the purposes and legal bases for processing. Explicit consent is a positive, informed, freely given choice for a specified processing activity.",
            "Confirming that you read the Privacy Notice, accepting the Terms of Use, or acknowledging the investment disclaimer does not constitute explicit consent. Enbilir records these actions for separate purposes and does not present consent boxes as preselected.",
          ],
        },
        {
          heading: "Conditions for valid consent",
          paragraphs: [
            "Valid consent must specify its subject, follow sufficient information, and reflect a choice made without pressure. Silence, inactivity, or continued use alone is not consent.",
          ],
          bullets: [
            "Consent is not interpreted as an indefinite permission for all current or future activities.",
            "Independent purposes are offered as separate choices where reasonably possible.",
            "The controller bears the burden of proving when, how, and for which notice version consent was given.",
            "Processing based on another legal ground is not artificially made conditional on consent.",
          ],
        },
        {
          heading: "Commercial electronic-message preference",
          paragraphs: [
            "The electronic-message option at registration is voluntary. If selected, it allows Enbilir to send educational content, product and feature announcements, events, membership offers, and similar promotional or informational messages to your registered channel.",
            "Email verification, password and account-security notices, transaction or subscription confirmations, and legal notices required to operate the service may be sent independently of marketing permission. Refusing marketing permission does not prevent account creation.",
          ],
        },
        {
          heading: "Non-essential cookies and similar technologies",
          paragraphs: [
            "If Enbilir later uses non-essential analytics, personalization, or marketing cookies, they will be activated through a separate preference panel after appropriate information. General consent is not obtained through a cookie wall.",
            "Essential session and security cookies may rely on performance of the service or legitimate interests. Enbilir does not misleadingly request consent where another legal basis properly applies.",
          ],
        },
        {
          heading: "User control in AI features",
          paragraphs: [
            "If you choose AI assistant, voice prompt, report, or market-analysis features, the content you submit may be sent to technical providers to perform the feature. Where this processing does not rely on contract performance or another legal basis, separate consent is requested before use with a clearly stated scope.",
            "Even when consent is given, do not submit special-category data, real card/account details, passwords, or third-party confidential information. Choosing not to use an AI feature does not remove access to Enbilir's core membership and virtual-portfolio functions.",
          ],
        },
        {
          heading: "Consent records and proof",
          paragraphs: [
            "When you consent, the subject, notice version, timestamp, and account-linked technical record may be retained to manage preferences and demonstrate compliance. A refusal or withdrawal record may also be kept to prevent repeat messages and respect your choice.",
            "Keeping proof of withdrawn consent does not authorize new consent-based processing; the record is used only to demonstrate compliance and manage disputes.",
          ],
        },
        {
          heading: "Withdrawal and its effects",
          paragraphs: [
            "Withdraw through account preferences, the opt-out method in each commercial message, or by writing from your registered email account to info@ultraakil.com. After identity verification, consent-based processing is stopped as soon as reasonably possible.",
            "Withdrawal operates prospectively and does not invalidate lawful prior processing. If the same data remains necessary under a separate basis such as contract performance, legal duty, or protection of rights, it may continue to be processed only within that basis.",
          ],
        },
        {
          heading: "Changes and contact",
          paragraphs: [
            "A new activity that expands the scope or changes the purpose is not started under old consent. Updated information and a new, separate choice are presented where required.",
            "Send consent questions to the Company at info@ultraakil.com. The application procedure in the Privacy Notice applies to personal-data rights.",
          ],
        },
      ],
      references: [
        { label: "KVKK guidance on obtaining explicit consent", href: "https://www.kvkk.gov.tr/Icerik/2037/Acik-Riza-Alirken-Dikkat-Edilecek-Hususlar" },
        { label: "2026/347 Principle Decision on keeping disclosure and explicit-consent texts separate", href: "https://www.kvkk.gov.tr/Icerik/8710/veri-sorumlulari-tarafindan-acik-riza-ve-aydinlatma-metinlerinin-ayri-ayri-duzenlenmesi-gerektigi-hakkinda-kisisel-verileri-koruma-kurulunun-18-02-2026-tarihli-ve-2026-347-sayili-ilke-kararina-iliskin-kamuoyu-duyurusu" },
      ],
    },
    cookies: {
      title: "Cookie Policy",
      updatedAt: "July 13, 2026",
      intro: "This policy explains the cookies Enbilir uses for secure sessions, authentication, and remembering preferences; similar technologies such as localStorage and sessionStorage; and how you can control them.",
      highlights: [
        "The session cookie is set for no more than 7 days.",
        "Behavioral marketing cookie profiling is not currently used.",
        "You can clear browser-stored preferences at any time.",
      ],
      sections: [
        {
          heading: "What are cookies and similar technologies?",
          paragraphs: [
            "A cookie is a small text record a website places in your browser. localStorage generally keeps browser-side data more persistently, while sessionStorage usually lasts for the tab or browser session. These technologies do not by themselves access unrelated files on your device.",
            "Enbilir uses them to operate securely, prevent duplicate actions, and remember settings you choose. Their legal treatment depends on purpose rather than the technology's name.",
          ],
        },
        {
          heading: "Essential cookies currently used",
          paragraphs: [
            "The following cookies are necessary for membership, authentication, or transaction security. HttpOnly cookies cannot be read by browser JavaScript; in production, Secure cookies are sent only over HTTPS.",
          ],
          bullets: [
            "enbilir_session: recognizes a signed-in user and maintains the secure session. HttpOnly, SameSite=Lax, Secure in production; maximum life 7 days and deleted on logout.",
            "enbilir_google_oauth_state: verifies that a Google sign-in request began in the same browser and reduces redirect attacks. HttpOnly, SameSite=Lax, Secure in production; maximum 10 minutes.",
            "enbilir_trade_[user]: stores a one-use action key to prevent the same virtual trade from being recorded twice accidentally. HttpOnly, SameSite=Strict, Secure in production; maximum 10 minutes.",
          ],
          note: "Blocking essential cookies may prevent login, Google authentication, and virtual-trade safety functions from working correctly.",
        },
        {
          heading: "Preferences stored in your browser",
          paragraphs: [
            "Enbilir keeps some data in browser storage without sending it to the server or while synchronizing it with your account. These records are not cookies, but we describe them here for transparency and user control.",
          ],
          bullets: [
            "Risk-appetite answers, current question, and result state are kept in localStorage so you can resume the test.",
            "User-guide, guided-help, and education-step viewed/completed status may be kept in localStorage or sessionStorage.",
            "AI market terminal favorites, sound-alert preference, and short-term repeat-alert suppression records are kept in localStorage; favorites may also synchronize with your account.",
            "Random session keys may be kept in sessionStorage to avoid measuring the same registration or onboarding visit more than once in one session.",
          ],
        },
        {
          heading: "Retention periods",
          paragraphs: [
            "Timed cookies are removed by the browser at the maximum period stated above and may be deleted earlier, such as on logout. sessionStorage usually ends when the tab or browser session closes.",
            "localStorage may not have a fixed automatic expiry. It is removed through a feature's reset option, your browser's clear-site-data control, or when an app update invalidates it. Data synchronized to your account is also governed by the Privacy Notice's retention rules.",
          ],
        },
        {
          heading: "Third-party services and content",
          paragraphs: [
            "If you choose Google sign-in, a payment redirect, or externally hosted video/content, your browser may visit or load the provider's domain. Those providers may apply their own cookie and privacy rules.",
            "Where non-essential third-party content uses identifiers, the required preference mechanism is applied before loading where practicable. Review the provider's policy when following an external link.",
          ],
        },
        {
          heading: "Analytics and marketing technologies",
          paragraphs: [
            "Enbilir currently does not build third-party advertising or behavioral-marketing profiles through cookies. First-party systems may measure feature use, performance, and onboarding with an account or random session key to improve the service.",
            "If non-essential analytics, personalization, or marketing cookies are added, this policy and the preference panel will be updated. Consent-based technologies will be off by default, and rejecting will be as accessible as accepting.",
          ],
        },
        {
          heading: "Managing cookies and storage",
          paragraphs: [
            "Use your browser's privacy or site-data settings to view, delete, or block cookies. localStorage and sessionStorage are usually removed with the browser's clear-site-data control.",
            "Clearing all site data signs you out and may remove risk-test progress, favorites, sound, and help preferences. Browser deletion does not remove server-side account records; use account controls or the KVKK application channel for those records.",
          ],
        },
        {
          heading: "Updates and contact",
          paragraphs: [
            "This policy is updated when cookie names, purposes, or periods change, with prominent changes announced through an appropriate interface. A new consent purpose is not activated under an old preference.",
            "Contact the Company at info@ultraakil.com about cookies and data-protection preferences.",
          ],
        },
      ],
      references: [
        { label: "KVKK Guide on Cookie Applications", href: "https://www.kvkk.gov.tr/Icerik/7353/Cerez-Uygulamalari-Hakkinda-Rehber" },
        { label: "Turkish Data Protection Board cookie decision no. 2022/1358", href: "https://www.kvkk.gov.tr/Icerik/7595/2022-1358" },
      ],
    },
    terms: {
      title: "Terms of Use",
      updatedAt: "July 13, 2026",
      intro: "These terms govern the rights and responsibilities relating to Enbilir's website, membership, virtual portfolio, league, community, education, reporting, and AI features operated by Ultra Bilişsel Akıl Danışmanlık Bilişim Destek ve Servis Hizmetleri Limited Şirketi.",
      highlights: [
        "Enbilir is an educational virtual-competition platform.",
        "There is no real money, order routing, or investment account.",
        "Lawful, respectful, and secure community use is required.",
      ],
      sections: [
        {
          heading: "Parties and acceptance",
          paragraphs: [
            "The service provider is Ultra Bilişsel Akıl Danışmanlık Bilişim Destek ve Servis Hizmetleri Limited Şirketi (the Company), and the service is Enbilir. A person browsing the site is a visitor; a person creating an account is a user or member.",
            "Creating an account, accepting these Terms, and using the service makes these provisions applicable. The Privacy Notice, Cookie Policy, and Not Investment Advice notice supplement them; optional explicit consent is requested separately.",
          ],
        },
        {
          heading: "Nature and scope of the platform",
          paragraphs: [
            "Enbilir provides financial literacy, market-learning, virtual portfolio, education, league, and community experiences. It is not an investment firm, bank, broker, portfolio manager, or authorized investment adviser.",
            "No real money is deposited, held, or withdrawn through Enbilir; no order is routed to an exchange or crypto platform, and no real asset is purchased for a user. Virtual balances and scores exist only within the platform, cannot be redeemed for cash, and create no receivable right.",
          ],
        },
        {
          heading: "Membership and account security",
          paragraphs: [
            "Users must provide accurate, current, personal information, complete email verification, and choose a strong password of at least eight characters. Accounts may not impersonate another person, be transferred, or sold.",
            "You are responsible for password and device security. If unauthorized access is suspected, change your password and contact support. The Company may request further verification, terminate a suspicious session, or temporarily restrict an account for security.",
            "Mandatory legal-capacity rules remain applicable. A minor's use is subject to applicable law and parental or guardian supervision where required; the platform is not designed for children.",
          ],
        },
        {
          heading: "Virtual portfolios, trades, and prices",
          paragraphs: [
            "Virtual trades are recorded using the price and time displayed by Enbilir. Delay, outage, rounding, exchange-rate differences, market closure, or technical error may cause an Enbilir value to differ from the real market.",
            "Users choose the virtual amount and trade reason. The system may reject or correct a record for duplicate prevention, balance checks, asset availability, or competition integrity. Virtual results may not fully reflect real commissions, taxes, liquidity, slippage, or trading restrictions.",
          ],
        },
        {
          heading: "Leagues, leaderboards, and competition rules",
          paragraphs: [
            "League and leaderboard results are calculated under the stated period, starting value, virtual profit, and competition rules. Your chosen name or nickname, rank, score, badges, and virtual return may be shown to other members.",
            "Multiple accounts, automation, exploiting vulnerabilities or price errors, collusion, and manipulation of another participant's result are prohibited. The Company may investigate and reasonably correct trades, points, or rankings or remove a participant for clear error or abuse.",
            "If a prize campaign or competition is offered, duration, eligibility, prize, tax, tie-breaker, and objection terms appear in separate official rules. An ordinary platform ranking does not itself create a prize right.",
          ],
        },
        {
          heading: "Risk test, reports, and AI features",
          paragraphs: [
            "The Risk Appetite Test creates a broad educational profile from your answers; it is not a statutory suitability or appropriateness assessment. Daily/weekly reports, AI Assistant, and AI Market Terminal provide general information and do not fully know your financial circumstances.",
            "AI outputs are probabilistic and may contain errors, fabricated information, missing context, or stale data. Users must verify sources, dates, and calculations before critical decisions. Outputs must not be used alone for real investments or legal, tax, or financial advice.",
          ],
        },
        {
          heading: "Community, chat, and user content",
          paragraphs: [
            "You are responsible for content posted in chat, rooms, polls, profiles, or trade reasons. Content may not infringe personal rights or include threats, harassment, hate speech, spam, misleading return promises, market manipulation, unlawful goods/services, malware, or confidential third-party data.",
            "The Company may review reported content or security signals, remove visibility, warn a user, restrict communication, or suspend an account. Moderation does not mean the Company verifies or endorses user content.",
            "You must hold necessary rights in submitted content. You grant the Company a worldwide, non-exclusive, royalty-free technical license to operate, display, secure, and moderate it while your account or the processing purpose continues; ownership generally remains with you.",
          ],
        },
        {
          heading: "Paid memberships and payments",
          paragraphs: [
            "Where Standard, VIP, or other paid plans are available, price, period, scope, and renewal terms are displayed before purchase. Payment may occur on an authorized provider's secure page; Enbilir does not store your full card number.",
            "Withdrawal, cancellation, refund, and consumer rights apply according to the service type, performance start, pre-contract information, and current consumer law. Nothing is interpreted to remove mandatory consumer rights.",
          ],
        },
        {
          heading: "Prohibited uses",
          paragraphs: [
            "Users may not engage in activities that harm the platform or others. The Company may apply reasonable security limits and investigate suspected violations.",
          ],
          bullets: [
            "Unauthorized access, vulnerability scanning, reverse engineering, or bypassing technical protections.",
            "Exceeding reasonable-use limits with bots, scrapers, or automated queries; unauthorized data collection or resale.",
            "Fake accounts, impersonation, phishing, malicious links, spam, or artificial manipulation of platform metrics.",
            "Violation of intellectual-property, privacy, consumer, capital-markets, or other applicable law.",
          ],
        },
        {
          heading: "Intellectual property and third-party sources",
          paragraphs: [
            "Rights in the Enbilir brand, interface, software, original texts, visuals, data organization, and report templates belong to the Company or licensors. Reproduction, publication, sale, or derivative products beyond ordinary personal, non-commercial use require written permission.",
            "Market prices, news, video, links, and some content may come from third parties, whose terms and rights remain applicable. An external link does not mean the Company operates the destination or endorses all its content.",
          ],
        },
        {
          heading: "Availability, changes, and maintenance",
          paragraphs: [
            "The Company may temporarily suspend or modify service for security, maintenance, capacity, provider outage, force majeure, or legal changes. Material foreseeable interruptions are announced in advance where reasonably possible.",
            "No feature, market feed, AI model, or third-party integration is promised indefinitely. Material paid-plan changes respect purchase terms and mandatory user rights.",
          ],
        },
        {
          heading: "Suspension and termination",
          paragraphs: [
            "Users may request account closure. The Company may suspend or close an account for serious or repeated violations, security risk, fraud, legal duty, or protection of others. Except in urgent cases, an explanation and objection channel are provided where appropriate.",
            "Closure ends virtual balances, rankings, and access rights. Personal data is handled under the Privacy Notice; records legally required to be kept may not be deleted immediately with the account.",
          ],
        },
        {
          heading: "Limits of responsibility",
          paragraphs: [
            "The Company uses care in providing the service but does not guarantee uninterrupted access, instant or error-free market data, accurate AI output, or repetition of virtual results in real markets. Users remain responsible for real investment decisions and actions on third-party platforms.",
            "Limitations do not apply to intent, gross negligence, personal-data duties, mandatory consumer rights, or other liability that cannot legally be limited. Users are responsible for direct consequences of their fault, breach, or unlawful content.",
          ],
        },
        {
          heading: "Governing law, changes, and contact",
          paragraphs: [
            "Turkish law governs these Terms. Subject to mandatory consumer protections, disputes fall within the legally competent consumer arbitration committees, consumer courts, and other authorities.",
            "Terms may be updated when the service or law changes. Material adverse changes are announced appropriately before taking effect, and renewed acceptance is obtained where required. Contact info@ultraakil.com with questions.",
          ],
        },
      ],
      references: [
        { label: "Capital Markets Board of Türkiye - Investment Services and Institutions Guide", href: "https://spk.gov.tr/kurumlar/yatirim-kuruluslari/araci-kurumlar/yatirim-hizmetleri-ve-kuruluslari-rehberi" },
        { label: "Turkish Personal Data Protection Authority", href: "https://www.kvkk.gov.tr/" },
      ],
    },
    investmentDisclaimer: {
      title: "Not Investment Advice",
      updatedAt: "July 13, 2026",
      intro: "Prices, news, charts, AI responses, reports, risk profiles, virtual portfolios, and user comments on Enbilir are for general education and simulation only; they are not investment advice or a personalized recommendation.",
      highlights: [
        "Enbilir is not an investment institution authorized by the CMB.",
        "Virtual success does not guarantee real-market returns.",
        "Verify data and consult an authorized professional before real decisions.",
      ],
      sections: [
        {
          heading: "No investment advisory service",
          paragraphs: [
            "Under Turkish capital-markets rules, investment advice is personalized, directive commentary and recommendations provided under an agreement by an authorized institution. The Company and Enbilir are not authorized investment institutions for this purpose.",
            "Nothing on the platform is an instruction to buy, sell, hold, use a target price, adopt a portfolio allocation, or expect a return. Enbilir does not route orders, execute trades, custody assets or money, or open investment accounts.",
          ],
        },
        {
          heading: "General information and education",
          paragraphs: [
            "Market explanations, articles, daily/weekly reports, and sample scenarios address a general audience. They are produced without fully assessing your income, debt, horizon, liquidity needs, tax position, knowledge, and loss capacity.",
            "General information does not become personalized advice merely because it seems relevant to you. Conduct independent research and, where needed, use an investment institution authorized by the Capital Markets Board of Türkiye (CMB).",
          ],
        },
        {
          heading: "Limits of the Risk Appetite Test",
          paragraphs: [
            "The Enbilir Risk Appetite Test scores your answers to create a broad educational behavior profile. It is not a statutory suitability or appropriateness assessment and does not verify your objectives or finances to regulatory standards.",
            "A result does not establish that a particular asset, product, leverage level, or allocation is suitable. Answers and results can become outdated as your circumstances change.",
          ],
        },
        {
          heading: "Limits of AI outputs",
          paragraphs: [
            "The AI Assistant and AI Market Terminal use model output, limited context, and available data sources. Responses may contain fabricated information, calculation errors, wrong symbols, delayed prices, missing news, or incorrect interpretation.",
            "Confident language is not a guarantee of accuracy. Independently verify the source, timestamp, currency, period, and calculation method before any real transaction decision.",
          ],
        },
        {
          heading: "Virtual portfolio and competition bias",
          paragraphs: [
            "Virtual trades may not fully reflect emotional loss, order-book depth, liquidity, slippage, commissions, taxes, or market restrictions. Success in simulation does not show that the same strategy will produce the same real result.",
            "Leaderboards rank performance only for the stated period and virtual rules. High returns can reflect extreme risk, concentration, or short-term luck and do not endorse expertise or future performance.",
          ],
        },
        {
          heading: "Market data, chart, and news risk",
          paragraphs: [
            "Prices and charts may come from third parties and may be delayed, incomplete, rounded, or temporarily wrong. Different markets, exchanges, time zones, currencies, and providers may show different values for the same asset.",
            "News headlines can omit context; historical data and technical indicators do not guarantee future prices. Publication does not mean independent verification or endorsement of the asset.",
          ],
        },
        {
          heading: "Asset-specific risks",
          paragraphs: [
            "Equities carry company and market risk; currencies and commodities carry exchange-rate, interest-rate, and geopolitical risk; crypto assets may involve extreme volatility, liquidity, custody, cybersecurity, and regulatory uncertainty. Leveraged products can create rapid losses and, depending on structure, liabilities beyond the initial amount.",
            "Foreign assets add time-zone, country, tax, transfer, and currency risks. This summary does not replace a product prospectus, key-information document, or authorized provider disclosure.",
          ],
        },
        {
          heading: "User comments and external links",
          paragraphs: [
            "Comments in chat, leagues, profiles, or community areas belong to their users and are not the Company's view or advice. Users may have undisclosed conflicts, positions, or manipulative intent.",
            "A link to external video, news, payment, or trading services is not an endorsement. Check the third party's license, fees, risk disclosure, and security separately.",
          ],
        },
        {
          heading: "Past performance and no guarantee",
          paragraphs: [
            "Past, hypothetical, back-tested, or virtual performance is not a reliable indicator of future results. Selected success stories may hide losses, failed strategies, or changing market conditions.",
            "Enbilir, the Company, content creators, and users do not guarantee returns, principal protection, or loss limits. Every investment decision can result in partial or total loss.",
          ],
        },
        {
          heading: "Before making a decision",
          paragraphs: [
            "Before a real transaction, read official product documents; verify prices and news with multiple reliable sources; and assess fees, tax, liquidity, maturity, leverage, and worst-case loss. Do not trade products you do not understand or risk money needed for essential expenses.",
            "For a personal assessment, consult a CMB-authorized investment institution and the relevant qualified professional for tax or legal matters. Do not use Enbilir content as the sole basis for a real transaction.",
          ],
          note: "Acknowledging these risks does not remove the Company's statutory responsibilities and does not mean we recommend any transaction.",
        },
      ],
      references: [
        { label: "Capital Markets Board of Türkiye - Investment Services and Institutions Guide", href: "https://spk.gov.tr/kurumlar/yatirim-kuruluslari/araci-kurumlar/yatirim-hizmetleri-ve-kuruluslari-rehberi" },
        { label: "Capital Markets Board of Türkiye legislation system", href: "https://mevzuat.spk.gov.tr/" },
      ],
    },
  },
};

export function getLegalPageContent(locale: Locale, key: LegalPageKey) {
  return legalContent[locale][key];
}
