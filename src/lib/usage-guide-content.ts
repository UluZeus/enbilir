import type { Locale } from "@/i18n/config";
import { getSiteUrl } from "@/lib/site-url";

export type UsageGuideReadItem = {
  menu: string;
  title: string;
  href: string;
  note: string;
};

export type UsageGuideStep = {
  id: string;
  order: string;
  title: string;
  summary: string;
  body: string[];
  readItems?: UsageGuideReadItem[];
};

export type UsageGuideContent = {
  eyebrow: string;
  title: string;
  subtitle: string;
  intro: string;
  modalTitle: string;
  modalBody: string;
  startLabel: string;
  closeLabel: string;
  pageLabel: string;
  steps: UsageGuideStep[];
  footerNote: string;
};

export function getUsageGuideContent(locale: Locale): UsageGuideContent {
  if (locale === "en") {
    return {
      eyebrow: "Usage Guide",
      title: "Enbilir Usage Guide",
      subtitle: "A calm step-by-step path for using Enbilir without getting lost in the many tools.",
      intro:
        "Enbilir is most useful when it is used as a learning cycle: register, choose a league, understand your risk profile, read before trading, practice in the virtual portfolio, review reports, and compare your process with the community.",
      modalTitle: "Welcome to Enbilir",
      modalBody: "Start here to understand the recommended learning path before using the tools.",
      startLabel: "Open Usage Guide",
      closeLabel: "Continue to site",
      pageLabel: "USAGE GUIDE",
      footerNote:
        "Enbilir is designed for education, simulation, and financial awareness. Nothing in this guide is investment advice.",
      steps: [
        {
          id: "register",
          order: "01",
          title: "Create your membership first",
          summary: "Start with one account so your virtual balance, league, notes, and learning flow stay connected.",
          body: [
            "Use the Register menu to create your account. After registration, confirm your e-mail address if you registered with e-mail and password.",
            "Every user starts with a virtual balance. This balance is not real money; it exists so you can practice decision-making without financial pressure.",
          ],
        },
        {
          id: "league",
          order: "02",
          title: "Choose your league",
          summary: "League selection gives the learning journey a community rhythm.",
          body: [
            "After creating your account, choose the league that fits your context from the Leagues menu. Rotary, Rotaract, and open/free league options help users compare results in a fairer community setting.",
            "The aim is not only to rank high. The real aim is to compare decision quality, consistency, risk awareness, and learning discipline.",
          ],
        },
        {
          id: "risk",
          order: "03",
          title: "Complete the Risk Appetite Test",
          summary: "Before trading, understand how you react to volatility, loss, FOMO, and uncertainty.",
          body: [
            "Open Risk Test and complete the 35-question test. The result will show your risk profile and give portfolio-use suggestions.",
            "Use the profile as a mirror, not as a command. It does not tell you what to buy or sell; it helps you notice how you make decisions.",
          ],
        },
        {
          id: "read",
          order: "04",
          title: "Read the essential pages before trading",
          summary: "A virtual trade becomes much more useful when there is a concept and a reason behind it.",
          body: [
            "Before using the virtual portfolio, read the basic guide and education pages. These pages explain how to think about risk, reports, signals, portfolio discipline, and market context.",
            "If you are unsure where to begin, follow the reading list below in order.",
          ],
          readItems: [
            {
              menu: "Usage Guide",
              title: "Enbilir Usage Guide",
              href: "/kullanim-kilavuzu",
              note: "The page you can return to whenever you need the overall path.",
            },
            {
              menu: "Understand Site",
              title: "How should Enbilir be used?",
              href: "/siteyi-anlamak#enbilir-nasil-kullanilmali",
              note: "Explains the site as a learning system, not only a set of pages.",
            },
            {
              menu: "Education",
              title: "Financial literacy and risk-management modules",
              href: "/egitim",
              note: "Start here for volatility, diversification, drawdown, virtual balance, and decision discipline.",
            },
            {
              menu: "Content Hub",
              title: "Risk-management and financial-analysis articles",
              href: "/icerik-merkezi",
              note: "Use search for risk, portfolio, patience, inflation, currency, and financial statements.",
            },
            {
              menu: "Risk Test",
              title: "Risk Appetite Test",
              href: "/risk-istahi-testi",
              note: "Use the result to decide how cautious your virtual practice should be.",
            },
            {
              menu: "Not Investment Advice",
              title: "Legal and educational disclaimer",
              href: "/yatirim-tavsiyesi-degildir",
              note: "Read this before interpreting any signal, report, or ranking.",
            },
          ],
        },
        {
          id: "portfolio",
          order: "05",
          title: "Trade in the virtual portfolio according to your risk profile",
          summary: "Use the virtual portfolio as a decision journal, not as a guessing game.",
          body: [
            "Open Trade and place small, intentional virtual trades. Before each trade, write down why the idea makes sense and what would make it wrong.",
            "If your risk test result is cautious, start with smaller and more diversified virtual positions. If it is aggressive, write clear position-size, stop-loss, and maximum-loss rules before experimenting.",
          ],
        },
        {
          id: "reports",
          order: "06",
          title: "Follow daily and weekly reports",
          summary: "Reports help you place price moves inside a broader market context.",
          body: [
            "Use Macro Report and AI Market Assistant reports to understand the day, the week, macro conditions, technical signals, news flow, and risk notes.",
            "A report is not a command. Read it as a map: what is being watched, what could change the view, and which risks deserve attention?",
          ],
        },
        {
          id: "understand-reports",
          order: "07",
          title: "Learn how to read reports",
          summary: "A good report reading habit asks better questions instead of looking for a single answer.",
          body: [
            "When reading a report, separate trend, risk, macro context, technical signal, and news flow. Do not make a virtual trade because of one sentence alone.",
            "Ask: What supports this view? What would invalidate it? How large would this risk be inside my virtual portfolio? What is my time horizon?",
          ],
        },
        {
          id: "follow",
          order: "08",
          title: "Track regularly and review decisions",
          summary: "The learning value comes from repeated review, not from one lucky result.",
          body: [
            "Check your virtual portfolio regularly. Compare what you expected with what happened. Review both profitable and losing decisions.",
            "A winning trade can still be a weak decision; a losing trade can still be a disciplined decision. Enbilir helps you learn that difference.",
          ],
        },
        {
          id: "community",
          order: "09",
          title: "Invite friends and support the competition logic",
          summary: "The platform becomes stronger when users learn together and compare process quality.",
          body: [
            "Recommend Enbilir to friends who want to learn financial literacy in a safer, simulation-based environment.",
            "Support league participation and fair competition. Encourage users to discuss reasoning, risk, diversification, and reports, not only rankings.",
          ],
        },
      ],
    };
  }

  return {
    eyebrow: "Kullanım Kılavuzu",
    title: "Enbilir Kullanım Kılavuzu",
    subtitle: "Sitedeki araçlar çoğaldıkça kaybolmamak için sakin, adım adım ilerleyen öğrenme yolu.",
    intro:
      "Enbilir en verimli şekilde bir öğrenme döngüsü olarak kullanılır: üye ol, ligini seç, risk profilini tanı, işlemden önce oku, sanal portföyde dene, raporlarla gözden geçir ve toplulukla karşılaştır.",
    modalTitle: "Enbilir'e hoş geldiniz",
    modalBody: "Araçları kullanmadan önce önerilen öğrenme yolunu görmek için buradan başlayın.",
    startLabel: "Kullanım Kılavuzunu Aç",
    closeLabel: "Siteye Devam Et",
    pageLabel: "KULLANIM KILAVUZU",
    footerNote:
      "Enbilir eğitim, simülasyon ve finansal farkındalık amacıyla hazırlanmıştır. Bu kılavuzdaki hiçbir ifade yatırım tavsiyesi değildir.",
    steps: [
      {
        id: "uye-ol",
        order: "01",
        title: "Önce üye ol",
        summary: "Sanal bakiyen, liglerin, karar notların ve öğrenme akışın tek hesap altında toplansın.",
        body: [
          "Kayıt menüsünden hesabını oluştur. E-posta ve şifre ile kayıt olduysan gelen doğrulama bağlantısıyla hesabını aktif et.",
          "Her kullanıcı sanal bakiye ile başlar. Bu bakiye gerçek para değildir; finansal baskı olmadan karar alma pratiği yapman için vardır.",
        ],
      },
      {
        id: "ligini-sec",
        order: "02",
        title: "Ligini seç",
        summary: "Lig seçimi öğrenme yolculuğuna topluluk ritmi ve adil karşılaştırma alanı kazandırır.",
        body: [
          "Hesabını oluşturduktan sonra Ligler menüsünden sana uygun ligi seç. Rotaryen, Rotaract ve Serbest lig seçenekleri kullanıcıların daha anlamlı bir topluluk içinde karşılaştırma yapmasını sağlar.",
          "Amaç yalnızca üst sıraya çıkmak değildir. Asıl amaç karar kalitesini, istikrarı, risk farkındalığını ve öğrenme disiplinini geliştirmektir.",
        ],
      },
      {
        id: "risk-analizi",
        order: "03",
        title: "Risk analizini yap",
        summary: "İşlem yapmadan önce dalgalanma, kayıp, FOMO ve belirsizlik karşısındaki davranışını tanı.",
        body: [
          "Risk Testi menüsünden 35 soruluk Risk İştahı Testi'ni tamamla. Sonuç ekranı sana risk profilini ve sanal portföy kullanım önerilerini gösterir.",
          "Bu sonucu emir gibi değil, ayna gibi kullan. Test ne alıp satacağını söylemez; nasıl karar verdiğini fark etmeni sağlar.",
        ],
      },
      {
        id: "once-oku",
        order: "04",
        title: "İşlem yapmadan önce gerekli sayfaları oku",
        summary: "Sanal işlem, arkasında kavram ve gerekçe olduğunda gerçek bir öğrenme deneyimine dönüşür.",
        body: [
          "Sanal portföyü kullanmadan önce temel kılavuz ve eğitim sayfalarını oku. Bu sayfalar risk, rapor, sinyal, portföy disiplini ve piyasa bağlamını nasıl okuyacağını anlatır.",
          "Nereden başlayacağını bilmiyorsan aşağıdaki okuma listesini sırayla takip et.",
        ],
        readItems: [
          {
            menu: "Kullanım Kılavuzu",
            title: "Enbilir Kullanım Kılavuzu",
            href: "/kullanim-kilavuzu",
            note: "Genel yolu unuttuğunda döneceğin ana rehber.",
          },
          {
            menu: "Siteyi Anlamak",
            title: "Enbilir nasıl kullanılmalı?",
            href: "/siteyi-anlamak#enbilir-nasil-kullanilmali",
            note: "Siteyi sayfa toplamı değil, öğrenme sistemi olarak açıklar.",
          },
          {
            menu: "Eğitim",
            title: "Finansal okuryazarlık ve risk yönetimi modülleri",
            href: "/egitim",
            note: "Volatilite, çeşitlendirme, geri çekilme, sanal bakiye ve karar disiplini için buradan başla.",
          },
          {
            menu: "İçerik Merkezi",
            title: "Risk yönetimi ve finansal analiz yazıları",
            href: "/icerik-merkezi",
            note: "Risk, portföy, sabır, faiz, döviz, enflasyon ve finansal tablo başlıklarını burada ara.",
          },
          {
            menu: "Risk Testi",
            title: "Risk İştahı Testi",
            href: "/risk-istahi-testi",
            note: "Sanal işlem pratiğini ne kadar temkinli kurman gerektiğini anlamak için kullan.",
          },
          {
            menu: "Yatırım Tavsiyesi Değildir",
            title: "Yasal ve eğitsel uyarı",
            href: "/yatirim-tavsiyesi-degildir",
            note: "Sinyal, rapor ve sıralama yorumlamadan önce mutlaka oku.",
          },
        ],
      },
      {
        id: "sanal-portfoy",
        order: "05",
        title: "Risk sonucuna göre sanal portföyde işlem yap",
        summary: "Sanal portföyü tahmin oyunu değil, karar günlüğü gibi kullan.",
        body: [
          "İşlem Yap menüsünden küçük ve bilinçli sanal işlemlerle başla. Her işlemden önce fikrin neden mantıklı olduğunu ve hangi durumda yanlışlanacağını yaz.",
          "Risk testin temkinli çıktıysa daha küçük ve daha dağılmış sanal pozisyonlarla başla. Agresif çıktıysa pozisyon büyüklüğü, stop-loss ve maksimum kayıp kuralını yazmadan deneme yapma.",
        ],
      },
      {
        id: "raporlar",
        order: "06",
        title: "Günlük ve haftalık raporları takip et",
        summary: "Raporlar fiyat hareketlerini daha geniş piyasa bağlamına yerleştirmeni sağlar.",
        body: [
          "Makro Rapor ve AI Piyasa Asistanı raporlarını gün, hafta, makro şartlar, teknik sinyaller, haber akışı ve risk notları için kullan.",
          "Rapor emir değildir. Harita gibi okunmalıdır: Ne izleniyor, hangi veri görüşü değiştirebilir, hangi risk dikkat istiyor?",
        ],
      },
      {
        id: "rapor-okuma",
        order: "07",
        title: "Raporları nasıl okuyup anlayacağını öğren",
        summary: "İyi rapor okuma alışkanlığı tek cevap aramaz; daha iyi soru sorar.",
        body: [
          "Rapor okurken trend, risk, makro bağlam, teknik sinyal ve haber akışını ayrı ayrı düşün. Tek bir cümleyle sanal işlem yapma.",
          "Şu soruları sor: Bu görüşü ne destekliyor? Hangi durumda geçersiz olur? Benim sanal portföyümde bu risk ne kadar yer kaplar? Vadem ne?",
        ],
      },
      {
        id: "duzenli-takip",
        order: "08",
        title: "Düzenli takip yap ve kararlarını gözden geçir",
        summary: "Öğrenme değeri tek seferlik şanstan değil, tekrarlı değerlendirmeden gelir.",
        body: [
          "Sanal portföyünü düzenli kontrol et. Beklediğin şeyle gerçekleşen şeyi karşılaştır. Hem kârlı hem zararlı kararları gözden geçir.",
          "Kazanan işlem zayıf karar olabilir; zarar eden işlem disiplinli karar olabilir. Enbilir bu farkı öğrenmen için tasarlandı.",
        ],
      },
      {
        id: "arkadaslar",
        order: "09",
        title: "Arkadaşlarına siteyi öner ve yarışma mantığını destekle",
        summary: "Kullanıcılar birlikte öğrenip süreci karşılaştırdığında platformun değeri artar.",
        body: [
          "Finansal okuryazarlığı güvenli ve simülasyon temelli bir ortamda öğrenmek isteyen arkadaşlarına Enbilir'i öner.",
          "Lig katılımını ve adil yarışmayı destekle. Kullanıcıları yalnızca sıralamayı değil; gerekçe, risk, çeşitlendirme ve rapor okuma disiplinini konuşmaya teşvik et.",
        ],
      },
    ],
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildUsageGuideText(locale: Locale) {
  const content = getUsageGuideContent(locale);
  const siteUrl = getSiteUrl();
  const lines = [
    content.title,
    "",
    content.intro,
    "",
    ...content.steps.flatMap((step) => [
      `${step.order}. ${step.title}`,
      step.summary,
      ...step.body,
      ...(step.readItems
        ? [
            locale === "tr" ? "Okuma listesi:" : "Reading list:",
            ...step.readItems.map((item) => `- ${item.menu} > ${item.title}: ${siteUrl}/${locale}${item.href} (${item.note})`),
          ]
        : []),
      "",
    ]),
    content.footerNote,
  ];

  return lines.join("\n");
}

export function buildUsageGuideEmailSection(locale: Locale) {
  const content = getUsageGuideContent(locale);
  const siteUrl = getSiteUrl();
  const guideUrl = `${siteUrl}/${locale}/kullanim-kilavuzu`;
  const stepHtml = content.steps
    .map((step) => {
      const bodyHtml = step.body.map((paragraph) => `<p style="margin:8px 0 0;color:#334155;line-height:1.65">${escapeHtml(paragraph)}</p>`).join("");
      const readHtml = step.readItems
        ? `<div style="margin-top:12px;border-radius:12px;background:#f8fafc;border:1px solid #e2e8f0;padding:12px">
            <p style="margin:0 0 8px;font-weight:900;color:#0f766e">${locale === "tr" ? "Okuma listesi" : "Reading list"}</p>
            ${step.readItems
              .map(
                (item) =>
                  `<p style="margin:8px 0 0;color:#475569;line-height:1.55"><strong>${escapeHtml(item.menu)} &gt; ${escapeHtml(item.title)}</strong><br /><a href="${siteUrl}/${locale}${item.href}" style="color:#0f766e">${siteUrl}/${locale}${item.href}</a><br />${escapeHtml(item.note)}</p>`,
              )
              .join("")}
          </div>`
        : "";

      return `<div style="margin-top:16px;border:1px solid #e2e8f0;border-radius:16px;padding:16px;background:#ffffff">
        <p style="margin:0;color:#f5a623;font-weight:900;font-size:12px;letter-spacing:.12em;text-transform:uppercase">${escapeHtml(step.order)}</p>
        <h2 style="margin:6px 0 0;color:#152033;font-size:18px">${escapeHtml(step.title)}</h2>
        <p style="margin:8px 0 0;color:#0f766e;font-weight:800;line-height:1.55">${escapeHtml(step.summary)}</p>
        ${bodyHtml}
        ${readHtml}
      </div>`;
    })
    .join("");

  return {
    guideUrl,
    text: buildUsageGuideText(locale),
    html: `
      <div style="margin-top:24px;border-top:1px solid #e2e8f0;padding-top:24px">
        <p style="margin:0 0 8px;color:#0f766e;font-weight:900;letter-spacing:.12em;text-transform:uppercase;font-size:12px">${escapeHtml(content.eyebrow)}</p>
        <h1 style="margin:0;color:#152033;font-size:24px;line-height:1.25">${escapeHtml(content.title)}</h1>
        <p style="margin:12px 0 0;color:#334155;line-height:1.7">${escapeHtml(content.intro)}</p>
        <p style="margin:16px 0 0">
          <a href="${guideUrl}" style="display:inline-block;border-radius:12px;background:#0f766e;color:#ffffff;text-decoration:none;padding:12px 18px;font-weight:900">
            ${escapeHtml(content.startLabel)}
          </a>
        </p>
        ${stepHtml}
        <p style="margin:18px 0 0;border-radius:12px;background:#fffbeb;border:1px solid #fde68a;padding:12px;color:#92400e;line-height:1.6;font-weight:700">${escapeHtml(content.footerNote)}</p>
      </div>
    `,
  };
}
