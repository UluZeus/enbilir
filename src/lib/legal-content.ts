import type { Locale } from "@/i18n/config";

export type LegalSection = {
  heading: string;
  paragraphs: string[];
};

export type LegalPageKey = "kvkk" | "explicitConsent" | "cookies" | "terms" | "investmentDisclaimer";

type LegalPageContent = {
  title: string;
  updatedAt: string;
  sections: LegalSection[];
};

const legalContent: Record<Locale, Record<LegalPageKey, LegalPageContent>> = {
  tr: {
    kvkk: {
      title: "KVKK Aydınlatma Metni",
      updatedAt: "4 Mayıs 2026",
      sections: [
        {
          heading: "Veri sorumlusu ve kapsam",
          paragraphs: [
            "Enbilir, kullanıcılarına finansal okuryazarlık, eğitim içerikleri ve sanal portföy yarışması deneyimi sunmak amacıyla geliştirilen bir platformdur. Bu aydınlatma metni, platforma üye olan veya platformla iletişime geçen kişilerin kişisel verilerinin hangi amaçlarla işlendiğini açıklar.",
            "Platform gerçek para ile işlem yaptırmaz; kullanıcıların oluşturduğu portföyler sanal yarışma ve eğitim amacı taşır.",
          ],
        },
        {
          heading: "İşlenen veriler ve işleme amaçları",
          paragraphs: [
            "Ad soyad, e-posta adresi, şifre hash bilgisi, kullanıcı rolü, yarışma puanı, kayıt onayları ve iletişim tercihleri üyelik, oturum yönetimi, yarışma katılımı, iletişim, duyuru ve güvenlik amaçlarıyla işlenir.",
            "Şifreler düz metin olarak saklanmaz; tek yönlü hash yöntemiyle korunur. Elektronik ileti izni isteğe bağlıdır ve kullanıcı tercihine göre saklanır.",
          ],
        },
        {
          heading: "Haklarınız",
          paragraphs: [
            "Kullanıcılar kişisel verilerinin işlenip işlenmediğini öğrenme, düzeltilmesini isteme, işleme amacını sorgulama ve mevzuatta öngörülen şartlar kapsamında silinmesini talep etme haklarına sahiptir.",
            "Kullanıcı dilediğinde hesabının silinmesini talep edebilir. Silme talebi, mevzuattan doğan saklama yükümlülükleri saklı kalmak kaydıyla değerlendirilir.",
          ],
        },
      ],
    },
    explicitConsent: {
      title: "Açık Rıza Metni",
      updatedAt: "4 Mayıs 2026",
      sections: [
        {
          heading: "Açık rızanın konusu",
          paragraphs: [
            "Bu metin, Enbilir platformunda üyelik, yarışma, iletişim ve duyuru süreçleri kapsamında isteğe bağlı olarak verilen açık rıza tercihlerini açıklar.",
            "Elektronik ileti izni verilmesi zorunlu değildir. Kullanıcı, platform duyuruları ve bilgilendirme mesajları almak istemezse bu onayı vermeden de üyelik oluşturabilir.",
          ],
        },
        {
          heading: "Geri alma hakkı",
          paragraphs: [
            "Kullanıcı açık rızasını dilediği zaman geri alabilir. Rızanın geri alınması, geri alma tarihinden önce rızaya dayalı olarak yapılan işlemleri hukuka aykırı hale getirmez.",
            "Hesap silme veya iletişim iznini kaldırma talepleri platform iletişim kanalları üzerinden iletilebilir.",
          ],
        },
      ],
    },
    cookies: {
      title: "Çerez Politikası",
      updatedAt: "4 Mayıs 2026",
      sections: [
        {
          heading: "Çerez kullanım amacı",
          paragraphs: [
            "Enbilir, oturum güvenliği, kullanıcı girişinin korunması, dil tercihi ve temel uygulama performansı için zorunlu çerezler kullanabilir.",
            "Oturum çerezleri kullanıcı hesabına güvenli erişim sağlamak için kullanılır. Bu çerezler pazarlama amacıyla değil, üyelik ve güvenlik amacıyla işlenir.",
          ],
        },
        {
          heading: "Tercihler ve kontrol",
          paragraphs: [
            "Kullanıcılar tarayıcı ayarları üzerinden çerezleri silebilir veya engelleyebilir. Zorunlu çerezlerin engellenmesi giriş, panel ve admin gibi alanların çalışmasını engelleyebilir.",
            "Platformun ilerleyen sürümlerinde analitik veya pazarlama çerezleri eklenirse kullanıcıya ayrıca bilgi verilir ve gerekli onay mekanizmaları sağlanır.",
          ],
        },
      ],
    },
    terms: {
      title: "Kullanım Şartları",
      updatedAt: "4 Mayıs 2026",
      sections: [
        {
          heading: "Platformun niteliği",
          paragraphs: [
            "Enbilir bir eğitim ve finansal okuryazarlık platformudur. Platform gerçek para ile işlem yaptırmaz; sunulan sanal portföy yarışması gerçek yatırım işlemi değildir.",
            "Kullanıcılar platformu yalnızca hukuka uygun, kişisel eğitim ve yarışma amaçlarıyla kullanmayı kabul eder.",
          ],
        },
        {
          heading: "Kullanıcı yükümlülükleri",
          paragraphs: [
            "Kullanıcı, kayıt sırasında doğru bilgi vermek, hesabının güvenliğini korumak ve hesabı üzerinden yapılan işlemlerden sorumlu olduğunu kabul eder.",
            "Platformda yer alan eğitim içerikleri, piyasa örnekleri ve sanal yarışma verileri yatırım danışmanlığı kapsamında değildir.",
          ],
        },
        {
          heading: "Hesap ve veri talepleri",
          paragraphs: [
            "Kullanıcı dilediğinde hesabının silinmesini talep edebilir. Talep üzerine hesap ve üyelik verileri, yasal saklama zorunlulukları saklı kalmak üzere değerlendirilir.",
            "Enbilir, güvenlik, kötüye kullanımın önlenmesi ve hizmetin sürekliliği için gerekli teknik tedbirleri alma hakkını saklı tutar.",
          ],
        },
      ],
    },
    investmentDisclaimer: {
      title: "Yatırım Tavsiyesi Değildir",
      updatedAt: "4 Mayıs 2026",
      sections: [
        {
          heading: "Yatırım danışmanlığı değildir",
          paragraphs: [
            "Enbilir üzerinde yer alan hiçbir bilgi, yorum, eğitim içeriği, örnek portföy, skor veya piyasa senaryosu yatırım danışmanlığı kapsamında değildir.",
            "Buradaki bilgiler genel nitelikli eğitim ve finansal okuryazarlık amacı taşır. Kullanıcıların gerçek yatırım kararlarını kendi risk profilleri, mali durumları ve yetkili uzman görüşleri doğrultusunda değerlendirmesi gerekir.",
          ],
        },
        {
          heading: "Sanal yarışma niteliği",
          paragraphs: [
            "Platform gerçek para ile işlem yaptırmaz. Sanal portföy yarışması, kullanıcıların finansal kavramları deneyimleyerek öğrenmesini amaçlayan bir simülasyon alanıdır.",
            "Sanal yarışma sonuçları, gerçek piyasada aynı sonucun elde edileceği anlamına gelmez ve herhangi bir getiri vaadi içermez.",
          ],
        },
      ],
    },
  },
  en: {
    kvkk: {
      title: "Privacy Notice",
      updatedAt: "May 4, 2026",
      sections: [
        {
          heading: "Data controller and scope",
          paragraphs: [
            "Enbilir is a platform designed to provide financial literacy, educational content, and a virtual portfolio competition experience. This notice explains why personal data is processed for people who create an account or contact the platform.",
            "The platform does not process real-money trades; portfolios created by users are for virtual competition and education purposes.",
          ],
        },
        {
          heading: "Processed data and purposes",
          paragraphs: [
            "Full name, email address, password hash, user role, competition score, registration consents, and communication preferences are processed for membership, session management, competition participation, communication, announcements, and security.",
            "Passwords are not stored as plain text; they are protected with one-way hashing. Electronic communication consent is optional and stored according to user preference.",
          ],
        },
        {
          heading: "Your rights",
          paragraphs: [
            "Users may request information about whether their personal data is processed, ask for corrections, question processing purposes, and request deletion where permitted by applicable law.",
            "Users may request account deletion. Deletion requests are assessed while preserving any retention obligations required by law.",
          ],
        },
      ],
    },
    explicitConsent: {
      title: "Explicit Consent Notice",
      updatedAt: "May 4, 2026",
      sections: [
        {
          heading: "Subject of consent",
          paragraphs: [
            "This notice explains optional explicit consent preferences used for membership, competition, communication, and announcement processes on Enbilir.",
            "Electronic communication consent is not mandatory. Users can create an account without giving this consent if they do not want platform announcements or informational messages.",
          ],
        },
        {
          heading: "Right to withdraw",
          paragraphs: [
            "Users may withdraw explicit consent at any time. Withdrawal does not make processing performed before the withdrawal date unlawful.",
            "Account deletion or communication opt-out requests can be submitted through the platform contact channels.",
          ],
        },
      ],
    },
    cookies: {
      title: "Cookie Policy",
      updatedAt: "May 4, 2026",
      sections: [
        {
          heading: "Purpose of cookies",
          paragraphs: [
            "Enbilir may use essential cookies for session security, keeping users signed in, language preferences, and core application performance.",
            "Session cookies are used to provide secure access to user accounts. These cookies are processed for membership and security purposes, not for marketing.",
          ],
        },
        {
          heading: "Preferences and control",
          paragraphs: [
            "Users can delete or block cookies through browser settings. Blocking essential cookies may prevent login, dashboard, and admin areas from working correctly.",
            "If analytics or marketing cookies are added in future versions, users will be informed separately and any required consent mechanisms will be provided.",
          ],
        },
      ],
    },
    terms: {
      title: "Terms of Use",
      updatedAt: "May 4, 2026",
      sections: [
        {
          heading: "Nature of the platform",
          paragraphs: [
            "Enbilir is an education and financial literacy platform. It does not process real-money trades; the virtual portfolio competition is not a real investment transaction.",
            "Users agree to use the platform only for lawful, personal education and competition purposes.",
          ],
        },
        {
          heading: "User responsibilities",
          paragraphs: [
            "Users agree to provide accurate information during registration, keep their accounts secure, and remain responsible for actions performed through their accounts.",
            "Educational content, market examples, and virtual competition data on the platform are not investment advisory services.",
          ],
        },
        {
          heading: "Account and data requests",
          paragraphs: [
            "Users may request account deletion at any time. Account and membership data are assessed for deletion subject to legal retention obligations.",
            "Enbilir reserves the right to take technical measures required for security, abuse prevention, and service continuity.",
          ],
        },
      ],
    },
    investmentDisclaimer: {
      title: "Not Investment Advice",
      updatedAt: "May 4, 2026",
      sections: [
        {
          heading: "No investment advisory service",
          paragraphs: [
            "No information, commentary, educational content, sample portfolio, score, or market scenario on Enbilir is investment advice.",
            "The information is general and intended for education and financial literacy. Users should evaluate real investment decisions according to their own risk profile, financial situation, and qualified professional guidance.",
          ],
        },
        {
          heading: "Virtual competition only",
          paragraphs: [
            "The platform does not process real-money trades. The virtual portfolio competition is a simulation area designed to help users learn financial concepts through experience.",
            "Virtual competition results do not imply that the same outcome can be achieved in real markets and do not include any promise of return.",
          ],
        },
      ],
    },
  },
};

export function getLegalPageContent(locale: Locale, key: LegalPageKey) {
  return legalContent[locale][key];
}
