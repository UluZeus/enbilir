import type { Locale } from "./config";

export const dictionaries = {
  tr: {
    brand: "Enbilir",
    nav: {
      home: "Ana sayfa",
      trade: "İşlem Yap",
      leaderboard: "Liderlik",
      leagues: "Ligler",
      blog: "Blog",
      education: "Eğitim",
      contact: "İletişim",
      login: "Giriş",
      register: "Kayıt",
      panel: "Panel",
      admin: "Admin",
    },
    language: {
      tr: "Türkçe",
      en: "English",
    },
    whatsapp: "WhatsApp",
    home: {
      title: "Enbilir",
      subtitle: "Finansal okuryazarlık, eğitim içerikleri ve yarışma odaklı öğrenme için Türkçe varsayılan, çok dilli bir platform iskeleti.",
      primaryAction: "Eğitime başla",
      secondaryAction: "Liderliği gör",
    },
    pages: {
      login: {
        title: "Giriş yap",
        description: "Kullanıcıların hesaplarına erişeceği giriş sayfası iskeleti.",
      },
      register: {
        title: "Kayıt ol",
        description: "Yeni kullanıcı hesabı oluşturma akışı için başlangıç sayfası.",
      },
      panel: {
        title: "Kullanıcı paneli",
        description: "Kullanıcı ilerlemesi, puanları ve eğitim durumları burada gösterilecek.",
      },
      admin: {
        title: "Admin paneli",
        description: "İçerik, kullanıcı ve yarışma yönetimi için ayrılmış yönetim alanı.",
      },
      leaderboard: {
        title: "Liderlik tablosu",
        description: "Kullanıcı puanları ve sıralama bilgileri için hazır sayfa.",
      },
      blog: {
        title: "Blog",
        description: "Finansal okuryazarlık yazıları ve platform duyuruları burada yayınlanacak.",
      },
      education: {
        title: "Eğitim",
        description: "Dersler, modüller ve öğrenme içerikleri için eğitim merkezi.",
      },
      kvkk: {
        title: "KVKK",
        description: "Kişisel verilerin korunmasına ilişkin bilgilendirme sayfası.",
      },
      terms: {
        title: "Kullanım şartları",
        description: "Platform kullanım kuralları ve hizmet koşulları.",
      },
      contact: {
        title: "İletişim",
        description: "Destek ve iş birliği talepleri için iletişim kanalları.",
      },
    },
  },
  en: {
    brand: "Enbilir",
    nav: {
      home: "Home",
      trade: "Trade",
      leaderboard: "Leaderboard",
      leagues: "Leagues",
      blog: "Blog",
      education: "Education",
      contact: "Contact",
      login: "Login",
      register: "Register",
      panel: "Dashboard",
      admin: "Admin",
    },
    language: {
      tr: "Türkçe",
      en: "English",
    },
    whatsapp: "WhatsApp",
    home: {
      title: "Enbilir",
      subtitle: "A multilingual platform skeleton for financial literacy, educational content, and competition-led learning. Turkish is the default language.",
      primaryAction: "Start learning",
      secondaryAction: "View leaderboard",
    },
    pages: {
      login: {
        title: "Login",
        description: "A starter login page for user account access.",
      },
      register: {
        title: "Register",
        description: "A starter page for new account creation.",
      },
      panel: {
        title: "User dashboard",
        description: "User progress, scores, and education status will be shown here.",
      },
      admin: {
        title: "Admin panel",
        description: "A reserved management area for content, users, and competitions.",
      },
      leaderboard: {
        title: "Leaderboard",
        description: "A ready page for user scores and ranking data.",
      },
      blog: {
        title: "Blog",
        description: "Financial literacy articles and platform announcements will be published here.",
      },
      education: {
        title: "Education",
        description: "The education center for lessons, modules, and learning content.",
      },
      kvkk: {
        title: "KVKK",
        description: "Information page for personal data protection notices.",
      },
      terms: {
        title: "Terms of use",
        description: "Platform rules and service terms.",
      },
      contact: {
        title: "Contact",
        description: "Contact channels for support and partnership requests.",
      },
    },
  },
} as const;

export function getDictionary(locale: Locale) {
  return dictionaries[locale];
}
