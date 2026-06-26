import type { Metadata } from "next";
import type { Locale } from "@/i18n/config";
import { getSiteUrl } from "@/lib/site-url";

export const seoBrand = {
  siteName: "Enbilir",
  domain: "enbilir.com",
  legalName: "Enbilir Rotary Piyasa Akademisi",
  founder: "Dr. Hakan Ünsal",
  founderAliases: [
    "Hakan Ünsal",
    "Hakan Unsal",
    "Dr. Hakan Unsal",
    "bigpegasus",
    "hakanun",
    "unsalhakan",
    "bigpegasus@gmail.com",
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

export const coreSeoKeywords = [
  "finansal okuryazarlık",
  "piyasa okuryazarlığı",
  "borsa eğitimi",
  "ekonomi eğitimi",
  "sanal portföy",
  "sanal işlem",
  "sanal borsa",
  "yatırım simülasyonu",
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
  "AI piyasa asistanı",
  "yapay zeka piyasa yorumu",
  "yapay zeka borsa analizi",
  "teknik analiz eğitimi",
  "MACD",
  "RSI",
  "Ichimoku",
  "hacim analizi",
  "Rotary finansal okuryazarlık",
  "Rotary eğitim platformu",
  ...seoBrand.founderAliases,
  ...seoBrand.relatedBrands,
];

const pageSeo = {
  home: {
    tr: {
      title: "Enbilir | Sanal Portföy, AI Makro Rapor ve Finansal Okuryazarlık",
      description:
        "Dr. Hakan Ünsal tarafından geliştirilen Enbilir; sanal portföy, AI piyasa asistanı, makro rapor, borsa, kripto ve ekonomi eğitimi odaklı finansal okuryazarlık platformudur.",
    },
    en: {
      title: "Enbilir | Virtual Portfolio, AI Macro Reports and Market Literacy",
      description:
        "Enbilir, created by Dr. Hakan Unsal, combines virtual portfolios, AI market assistant, macro reports, stock market, crypto, and financial literacy education.",
    },
  },
  trade: {
    tr: {
      title: "Sanal İşlem Yap | Enbilir Sanal Portföy ve Borsa Simülasyonu",
      description:
        "Gerçek para riski olmadan sanal alım satım yapın; BIST, Nasdaq, Dow Jones, kripto, döviz, altın ve emtia piyasalarında portföy pratiği kazanın.",
    },
    en: {
      title: "Virtual Trading | Enbilir Portfolio and Market Simulator",
      description:
        "Practice virtual trading without real-money risk across BIST, Nasdaq, Dow Jones, crypto, FX, gold, and commodities.",
    },
  },
  ai: {
    tr: {
      title: "AI Piyasa Asistanı | Makro Rapor, Teknik Analiz ve Piyasa Yorumu",
      description:
        "AI Piyasa Asistanı; grafikler, teknik göstergeler, haber akışı ve makro konjonktür üzerinden borsa, kripto, döviz ve emtia piyasalarını eğitim amaçlı yorumlar.",
    },
    en: {
      title: "AI Market Assistant | Macro Reports, Technical Analysis and Market Context",
      description:
        "The AI Market Assistant interprets charts, indicators, news, and macro context for stocks, crypto, FX, and commodities for educational use.",
    },
  },
  reports: {
    tr: {
      title: "Makro Raporlar | Enbilir AI Piyasa Asistanı",
      description:
        "Altın, gümüş, euro, dolar, Türk lirası, BIST 100, Dow Jones, Nasdaq, petrol, enerji, yapay zeka ve global piyasa başlıklarını içeren AI makro raporları.",
    },
    en: {
      title: "Macro Reports | Enbilir AI Market Assistant",
      description:
        "AI macro reports covering gold, silver, euro, dollar, Turkish lira, BIST 100, Dow Jones, Nasdaq, oil, energy, AI stocks, and global markets.",
    },
  },
  education: {
    tr: {
      title: "Finansal Okuryazarlık Eğitimi | Enbilir",
      description:
        "Borsa, ekonomi, kripto, teknik analiz, risk yönetimi ve sanal portföy deneyimiyle finansal okuryazarlık eğitimi.",
    },
    en: {
      title: "Financial Literacy Education | Enbilir",
      description:
        "Financial literacy education with stock market, economy, crypto, technical analysis, risk management, and virtual portfolio practice.",
    },
  },
  leagues: {
    tr: {
      title: "Ligler ve Portföy Yarışmaları | Enbilir",
      description:
        "Rotary, Rotaract, Interact ve özel topluluklar için sanal portföy ligleri, yarışmalar ve finansal okuryazarlık deneyimi.",
    },
    en: {
      title: "Leagues and Portfolio Competitions | Enbilir",
      description:
        "Virtual portfolio leagues, competitions, and market-literacy experiences for Rotary, Rotaract, Interact, and private communities.",
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
  contact: {
    tr: {
      title: "İletişim | Enbilir",
      description:
        "Enbilir, AI piyasa asistanı, sanal portföy, Rotary ligleri ve finansal okuryazarlık eğitimleri hakkında iletişim.",
    },
    en: {
      title: "Contact | Enbilir",
      description:
        "Contact Enbilir about the AI market assistant, virtual portfolios, Rotary leagues, and financial literacy education.",
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
  const allKeywords = Array.from(new Set([...coreSeoKeywords, ...keywords]));

  return {
    title: {
      absolute: seo.title,
    },
    description: seo.description,
    keywords: allKeywords,
    authors: [{ name: seoBrand.founder, url: siteUrl }],
    creator: seoBrand.founder,
    publisher: seoBrand.legalName,
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
          url: "/logo.png",
          width: 1200,
          height: 630,
          alt: `${seoBrand.domain} - ${seo.title}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
      images: ["/logo.png"],
    },
  };
}

export function buildStructuredData(locale: Locale) {
  const siteUrl = getSiteUrl();
  const homeUrl = `${siteUrl}/${locale}`;
  const keywords = coreSeoKeywords.join(", ");

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        name: seoBrand.siteName,
        alternateName: [seoBrand.domain, "Enbilir Rotary Piyasa Akademisi", "Enbilir Finansal Okuryazarlık"],
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
        name: seoBrand.legalName,
        alternateName: [seoBrand.siteName, seoBrand.domain, ...seoBrand.relatedBrands],
        url: siteUrl,
        logo: `${siteUrl}/logo.png`,
        founder: { "@id": `${siteUrl}/#founder` },
        description: getSeoPage("home", locale).description,
        keywords,
      },
      {
        "@type": "Person",
        "@id": `${siteUrl}/#founder`,
        name: seoBrand.founder,
        alternateName: seoBrand.founderAliases,
        email: "bigpegasus@gmail.com",
        url: homeUrl,
        knowsAbout: [
          "finansal okuryazarlık",
          "ekonomi",
          "borsa",
          "kripto para",
          "AI piyasa asistanı",
          "Rotary",
          "eğitim teknolojileri",
          "sanal portföy",
        ],
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
