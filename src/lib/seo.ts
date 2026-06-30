import type { Metadata } from "next";
import type { Locale } from "@/i18n/config";
import { getSiteUrl } from "@/lib/site-url";

export const seoBrand = {
  siteName: "Enbilir",
  domain: "enbilir.com",
  legalName: "Enbilir Piyasa Akademisi",
  founder: "Dr. Hakan Ünsal",
  founderAliases: [
    "Hakan Ünsal",
    "Hakan Unsal",
    "Dr. Hakan Unsal",
    "bigpegasus",
    "hakanun",
    "unsalhakan",
  ],
  relatedBrands: [
    "ikiadam",
    "ikiadam.com",
    "ultraakıl",
    "ultraakil",
    "ultraakil.com",
    "ultragaranti",
    "ultraguvence",
    "ultra bilişsel",
    "rotart",
    "rotartmuzik",
    "rotarttiyatro",
    "rotary",
    "suadiye rotary",
    "suadiyerotary",
  ],
};

export const defaultOpenGraphImage = "/og-enbilir.png";
export const defaultOpenGraphImageAlt = "Enbilir Piyasa Akademisi - sanal portföy, AI makro rapor ve finansal okuryazarlık";

export const coreSeoKeywordsTr = [
  "finansal okuryazarlık",
  "piyasa okuryazarlığı",
  "borsa eğitimi",
  "ekonomi eğitimi",
  "sanal portföy",
  "sanal işlem",
  "sanal borsa",
  "yatırım simülasyonu",
  "sanal portföy hesaplama",
  "portföy kar zarar takibi",
  "canlı piyasa verisi",
  "portföy yarışması",
  "borsa yarışması",
  "kripto para eğitimi",
  "kripto piyasa analizi",
  "BIST 100",
  "Borsa İstanbul",
  "Nasdaq",
  "Dow Jones",
  "altın",
  "gümüş",
  "dolar",
  "euro",
  "Türk lirası",
  "makro ekonomi",
  "makro rapor",
  "haftalık makro rapor",
  "günlük piyasa raporu",
  "AI piyasa asistanı",
  "AI sohbet",
  "sesli AI asistan",
  "yapay zeka piyasa yorumu",
  "yapay zeka borsa analizi",
  "teknik analiz eğitimi",
  "MACD",
  "RSI",
  "Ichimoku",
  "hacim analizi",
  "Rotary finansal okuryazarlık",
  "Rotary eğitim platformu",
  "Rotary portföy ligi",
  "Rotaract portföy ligi",
  "Rotaryen finansal okuryazarlık",
  "Rotaryen piyasa akademisi",
  "Rotaryen borsa simülasyonu",
  "Rotaract finans eğitimi",
  "finansal tablo okuma",
  "bilanço okuma eğitimi",
  "piyasa psikolojisi",
  "risk yönetimi eğitimi",
  "haftalık liderlik tablosu",
  "Rotary topluluk eğitimi",
  "canlı topluluk sohbeti",
  ...seoBrand.founderAliases,
  ...seoBrand.relatedBrands,
];

export const coreSeoKeywordsEn = [
  "financial literacy",
  "market literacy",
  "stock market education",
  "economics education",
  "virtual portfolio",
  "virtual trading",
  "stock market simulator",
  "investment simulation",
  "virtual portfolio calculation",
  "portfolio profit loss tracking",
  "live market data",
  "portfolio competition",
  "stock market competition",
  "crypto education",
  "crypto market analysis",
  "BIST 100",
  "Borsa Istanbul",
  "Nasdaq",
  "Dow Jones",
  "gold",
  "silver",
  "dollar",
  "euro",
  "Turkish lira",
  "macroeconomics",
  "macro report",
  "weekly macro report",
  "daily market report",
  "AI market assistant",
  "AI chat",
  "voice AI assistant",
  "artificial intelligence market commentary",
  "AI stock market analysis",
  "technical analysis education",
  "MACD",
  "RSI",
  "Ichimoku",
  "volume analysis",
  "Rotary financial literacy",
  "Rotary education platform",
  "Rotary portfolio league",
  "Rotaract portfolio league",
  "Rotarian financial literacy",
  "Rotarian market academy",
  "Rotarian stock market simulator",
  "Rotaract finance education",
  "financial statement reading",
  "balance sheet reading education",
  "market psychology",
  "risk management education",
  "weekly leaderboard",
  "Rotary community learning",
  "live community chat",
  ...seoBrand.founderAliases,
  ...seoBrand.relatedBrands,
];

export const coreSeoKeywords = coreSeoKeywordsTr;

function getCoreSeoKeywords(locale: Locale) {
  return locale === "en" ? coreSeoKeywordsEn : coreSeoKeywordsTr;
}

function getSeoLegalName(locale: Locale) {
  return locale === "en" ? "Enbilir Market Academy" : seoBrand.legalName;
}

function getSeoFounderName(locale: Locale) {
  return locale === "en" ? "Dr. Hakan Unsal" : seoBrand.founder;
}

function getDefaultOpenGraphImageAlt(locale: Locale) {
  return locale === "en"
    ? "Enbilir Market Academy - virtual portfolios, AI macro reports, and financial literacy"
    : defaultOpenGraphImageAlt;
}

const pageSeo = {
  home: {
    tr: {
      title: "Enbilir | Rotaryen Sanal Portföy ve AI Makro Rapor",
      description:
        "Rotaryenler ve Rotaract üyeleri için sanal portföy, AI piyasa asistanı, makro rapor, borsa, kripto ve finansal okuryazarlık eğitimi.",
    },
    en: {
      title: "Enbilir | Rotary Virtual Portfolios and AI Macro Reports",
      description:
        "Virtual portfolios, AI market assistant, macro reports, stock market, crypto, and financial literacy education for Rotary and Rotaract communities.",
    },
  },
  trade: {
    tr: {
      title: "Sanal İşlem Yap | Enbilir Sanal Portföy ve Borsa Simülasyonu",
      description:
        "Gerçek para riski olmadan sanal alım satım yapın; BIST, Nasdaq, Dow Jones, kripto, döviz, altın ve emtiada canlı veri, USD karşılık ve portföy kar zarar takibiyle pratik kazanın.",
    },
    en: {
      title: "Virtual Trading | Enbilir Portfolio and Market Simulator",
      description:
        "Practice virtual trading without real-money risk across BIST, Nasdaq, Dow Jones, crypto, FX, gold, and commodities with live data, USD values, and portfolio P/L tracking.",
    },
  },
  ai: {
    tr: {
      title: "AI Piyasa Asistanı | Makro Rapor, Teknik Analiz ve Piyasa Yorumu",
      description:
        "AI Piyasa Asistanı; site verisiyle sohbet, sesli soru, grafikler, teknik göstergeler, haber akışı ve makro konjonktür üzerinden piyasaları eğitim amaçlı yorumlar.",
    },
    en: {
      title: "AI Market Assistant | Macro Reports, Technical Analysis and Market Context",
      description:
        "The AI Market Assistant supports site-data chat, voice questions, charts, indicators, news flow, and macro context for educational market literacy.",
    },
  },
  reports: {
    tr: {
      title: "Makro Raporlar | Enbilir AI Piyasa Asistanı",
      description:
        "Günlük ve pazartesi haftalık AI makro raporları; altın, gümüş, euro, dolar, TL, BIST 100, Dow Jones, Nasdaq, petrol, enerji, yapay zeka ve global piyasaları kapsar.",
    },
    en: {
      title: "Macro Reports | Enbilir AI Market Assistant",
      description:
        "Daily and Monday weekly AI macro reports covering gold, silver, euro, dollar, Turkish lira, BIST 100, Dow Jones, Nasdaq, oil, energy, AI stocks, and global markets.",
    },
  },
  education: {
    tr: {
      title: "Finansal Okuryazarlık Eğitimi | Bilanço, Risk, Borsa ve Sanal Portföy",
      description:
        "Rotaryenler için bilanço okuma, finansal tablolar, borsa, kripto, teknik analiz, risk yönetimi ve sanal portföy eğitimi.",
    },
    en: {
      title: "Financial Literacy Education | Statements, Risk, Markets and Virtual Portfolios",
      description:
        "Financial literacy education for Rotary communities with statements, stocks, crypto, technical analysis, risk management, and virtual portfolios.",
    },
  },
  contentHub: {
    tr: {
      title: "İçerik Merkezi | Enbilir Blog, Eğitim ve Site Rehberi",
      description:
        "Enbilir içerik merkezi; blog yazıları, finansal okuryazarlık eğitimleri ve site kullanım rehberlerini arama, filtreleme ve okuma sırasıyla bir araya getirir.",
    },
    en: {
      title: "Content Hub | Enbilir Blog, Education and Site Guide",
      description:
        "The Enbilir content hub brings blog articles, financial-literacy education, and site guides together with search, filters, and a practical reading path.",
    },
  },
  leagues: {
    tr: {
      title: "Ligler ve Portföy Yarışmaları | Enbilir",
      description:
        "ROTARYEN, ROTARACT, SERBEST ve özel topluluklar için davetsiz katılım, çoklu lig üyeliği, haftalık derece ve sanal portföy yarışmaları.",
    },
    en: {
      title: "Leagues and Portfolio Competitions | Enbilir",
      description:
        "Virtual portfolio leagues with direct joining, multiple memberships, weekly winners, and market-literacy competition for Rotary, Rotaract, and open communities.",
    },
  },
  leaderboard: {
    tr: {
      title: "Liderlik Tablosu | Enbilir Portföy Yarışması Sıralaması",
      description:
        "Sanal portföy yarışmalarında kullanıcı performansını, lig sıralamalarını ve finansal okuryazarlık ilerlemesini takip edin.",
    },
    en: {
      title: "Leaderboard | Enbilir Portfolio Competition Rankings",
      description:
        "Track user performance, league rankings, and financial-literacy progress in virtual portfolio competitions.",
    },
  },
  aiPerformance: {
    tr: {
      title: "AI Sinyal Performansı | Enbilir Piyasa Asistanı",
      description:
        "AI Piyasa Asistanı sinyallerinin AL, SAT, izle ve risk performansını eğitim amaçlı olarak takip edin.",
    },
    en: {
      title: "AI Signal Performance | Enbilir Market Assistant",
      description:
        "Follow the educational performance of AI Market Assistant signals including buy, sell, watch, and risk context.",
    },
  },
  assetManagement: {
    tr: {
      title: "Varlık Yönetimi | Enbilir AI Piyasa Asistanı",
      description:
        "Favori varlıkları, piyasa radarını ve AI destekli izleme listesini borsa, kripto, döviz ve emtia başlıklarıyla yönetin.",
    },
    en: {
      title: "Asset Management | Enbilir AI Market Assistant",
      description:
        "Manage favorite assets, market radar, and AI-supported watchlists across stocks, crypto, FX, and commodities.",
    },
  },
  register: {
    tr: {
      title: "Kayıt Ol | 30 Gün Ücretsiz Enbilir Deneyimi",
      description:
        "Enbilir'e kayıt olun; 30 gün ücretsiz sanal portföy, AI piyasa asistanı, makro rapor ve topluluk ligleri deneyimine başlayın.",
    },
    en: {
      title: "Register | 30-Day Free Enbilir Experience",
      description:
        "Register for Enbilir and start a 30-day free experience with virtual portfolios, AI market assistant, macro reports, and community leagues.",
    },
  },
  login: {
    tr: {
      title: "Giriş Yap | Enbilir",
      description:
        "Enbilir hesabınıza giriş yapın; sanal portföyünüzü, liglerinizi, AI piyasa asistanını ve makro raporlarınızı takip edin.",
    },
    en: {
      title: "Sign In | Enbilir",
      description:
        "Sign in to Enbilir to follow your virtual portfolio, leagues, AI market assistant, and macro reports.",
    },
  },
  blog: {
    tr: {
      title: "Blog | Ekonomi, Borsa, Kripto ve Eğitim Yazıları",
      description:
        "Ekonomi, borsa, kripto para, finansal okuryazarlık, Rotary toplulukları ve AI destekli piyasa yorumları üzerine Enbilir blog yazıları.",
    },
    en: {
      title: "Blog | Economy, Stocks, Crypto and Education Articles",
      description:
        "Enbilir blog articles on economy, stock markets, crypto, financial literacy, Rotary communities, and AI-supported market commentary.",
    },
  },
  siteGuide: {
    tr: {
      title: "Siteyi Anlamak | Enbilir Kullanım Rehberi",
      description:
        "Enbilir'i en verimli şekilde kullanmak için sanal portföy, AI Asistanı, liderlik, ligler, topluluk ve eğitim akışını anlatan kullanım rehberi.",
    },
    en: {
      title: "Understanding the Site | Enbilir User Guide",
      description:
        "A practical guide to using Enbilir through virtual portfolios, the AI assistant, leaderboards, leagues, community learning, and education flows.",
    },
  },
  community: {
    tr: {
      title: "Topluluk | Rotary ve Finansal Okuryazarlık",
      description:
        "Rotary, Rotaract, Interact ve meraklı topluluklar için finansal okuryazarlık, sanal portföy ve eğitim odaklı topluluk deneyimi.",
    },
    en: {
      title: "Community | Rotary and Financial Literacy",
      description:
        "A community experience for Rotary, Rotaract, Interact, and curious learners focused on financial literacy, virtual portfolios, and education.",
    },
  },
  chat: {
    tr: {
      title: "Sohbet | Enbilir Canlı Topluluk Odaları",
      description:
        "Enbilir üyeleri için genel sohbet, özel odalar, AI piyasa sohbeti, dosya, resim, video, konum, kişi bilgisi, anket ve saygılı topluluk konuşmaları.",
    },
    en: {
      title: "Chat | Enbilir Live Community Rooms",
      description:
        "General and private chat rooms for Enbilir members with AI market chat, files, images, video, location, contact cards, polls, and respectful community conversation.",
    },
  },
  contact: {
    tr: {
      title: "İletişim | Enbilir Piyasa Akademisi Destek ve İş Birliği",
      description:
        "Enbilir Piyasa Akademisi, AI piyasa asistanı, sanal portföy, Rotary ligleri, finansal okuryazarlık ve iş birliği için iletişim.",
    },
    en: {
      title: "Contact | Enbilir Market Academy Support and Partnerships",
      description:
        "Contact Enbilir Market Academy for the AI market assistant, virtual portfolios, Rotary leagues, financial literacy, support, and partnerships.",
    },
  },
  weeklyLeaders: {
    tr: {
      title: "Haftalık Liderler Arşivi | Rotaryen Sanal Portföy Yarışması",
      description:
        "Pazartesi 07.00 yayınlanan haftalık kazanç liderleri, toplam portföy liderleri, Rotaryen lig performansı ve finansal okuryazarlık arşivi.",
    },
    en: {
      title: "Weekly Leaders Archive | Rotary Virtual Portfolio Competition",
      description:
        "Archive of Monday 07:00 weekly gain leaders, overall portfolio leaders, Rotary league performance, and financial-literacy progress.",
    },
  },
  legal: {
    tr: {
      title: "Yasal Bilgilendirme | Enbilir",
      description:
        "Enbilir kullanım şartları, KVKK, açık rıza, çerez politikası ve yatırım tavsiyesi olmadığına ilişkin yasal bilgilendirmeler.",
    },
    en: {
      title: "Legal Information | Enbilir",
      description:
        "Legal information for Enbilir including terms, privacy, consent, cookie policy, and investment-disclaimer notices.",
    },
  },
} satisfies Record<string, Record<Locale, { title: string; description: string }>>;

export type SeoPageKey = keyof typeof pageSeo;

export function getSeoPage(key: SeoPageKey, locale: Locale) {
  return pageSeo[key][locale] ?? pageSeo[key].tr;
}

export function buildPageMetadata({
  locale,
  path,
  page,
  keywords = [],
}: {
  locale: Locale;
  path: string;
  page: SeoPageKey;
  keywords?: string[];
}): Metadata {
  const siteUrl = getSiteUrl();
  const seo = getSeoPage(page, locale);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const canonical = `/${locale}${normalizedPath === "/" ? "" : normalizedPath}`;
  const alternatePath = normalizedPath === "/" ? "" : normalizedPath;
  const allKeywords = Array.from(new Set([...getCoreSeoKeywords(locale), ...keywords]));

  return {
    title: {
      absolute: seo.title,
    },
    description: seo.description,
    keywords: allKeywords,
    authors: [{ name: getSeoFounderName(locale), url: siteUrl }],
    creator: getSeoFounderName(locale),
    publisher: getSeoLegalName(locale),
    category: "education, finance, market literacy",
    alternates: {
      canonical,
      languages: {
        tr: `/tr${alternatePath}`,
        en: `/en${alternatePath}`,
      },
    },
    openGraph: {
      type: "website",
      locale: locale === "tr" ? "tr_TR" : "en_US",
      url: canonical,
      siteName: seoBrand.domain,
      title: seo.title,
      description: seo.description,
      images: [
        {
          url: defaultOpenGraphImage,
          width: 1200,
          height: 630,
          alt: getDefaultOpenGraphImageAlt(locale),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: [defaultOpenGraphImage],
    },
  };
}

export function buildStructuredData(locale: Locale) {
  const siteUrl = getSiteUrl();
  const homeUrl = `${siteUrl}/${locale}`;
  const keywords = getCoreSeoKeywords(locale).join(", ");
  const organizationName = getSeoLegalName(locale);
  const websiteAlternateNames = locale === "en"
    ? [seoBrand.domain, "Enbilir Market Academy", "Enbilir Financial Literacy"]
    : [seoBrand.domain, "Enbilir Piyasa Akademisi", "Enbilir Finansal Okuryazarlık"];
  const founderKnowsAbout = locale === "en"
    ? [
        "financial literacy",
        "economics",
        "stock markets",
        "cryptocurrency",
        "AI market assistant",
        "Rotary",
        "education technology",
        "virtual portfolios",
      ]
    : [
        "finansal okuryazarlık",
        "ekonomi",
        "borsa",
        "kripto para",
        "AI piyasa asistanı",
        "Rotary",
        "eğitim teknolojileri",
        "sanal portföy",
      ];

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: seoBrand.siteName,
        alternateName: websiteAlternateNames,
        url: siteUrl,
        inLanguage: locale === "tr" ? "tr-TR" : "en-US",
        keywords,
        potentialAction: {
          "@type": "SearchAction",
          target: `${siteUrl}/${locale}/blog?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "EducationalOrganization",
        "@id": `${siteUrl}/#organization`,
        name: organizationName,
        alternateName: [seoBrand.siteName, seoBrand.domain],
        url: siteUrl,
        logo: `${siteUrl}/logo.png`,
        image: `${siteUrl}${defaultOpenGraphImage}`,
        founder: { "@id": `${siteUrl}/#founder` },
        description: getSeoPage("home", locale).description,
        keywords,
      },
      {
        "@type": "Person",
        "@id": `${siteUrl}/#founder`,
        name: getSeoFounderName(locale),
        alternateName: seoBrand.founderAliases,
        email: "info@ikiadam.com",
        url: homeUrl,
        knowsAbout: founderKnowsAbout,
        affiliation: { "@id": `${siteUrl}/#organization` },
      },
      {
        "@type": "WebApplication",
        "@id": `${siteUrl}/#application`,
        name: seoBrand.siteName,
        url: homeUrl,
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        creator: { "@id": `${siteUrl}/#founder` },
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "TRY",
          description: locale === "tr" ? "30 gün ücretsiz sanal portföy ve AI piyasa asistanı deneyimi." : "30-day free virtual portfolio and AI market assistant experience.",
        },
        description: getSeoPage("home", locale).description,
        keywords,
      },
    ],
  };
}

export function stringifyJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
