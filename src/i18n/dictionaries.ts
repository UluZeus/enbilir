import type { Locale } from "./config";

export const dictionaries = {
  tr: {
    brand: "Enbilir",
    nav: {
      home: "Ana sayfa",
      contentHub: "İçerik Merkezi",
      trade: "İşlem Yap",
      leaderboard: "Liderlik",
      leagues: "Ligler",
      community: "Topluluk",
      chat: "Sohbet",
      blog: "Blog",
      siteGuide: "Siteyi Anlamak",
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
      contentHub: "Content Hub",
      trade: "Trade",
      leaderboard: "Leaderboard",
      leagues: "Leagues",
      community: "Community",
      chat: "Chat",
      blog: "Blog",
      siteGuide: "Understand Site",
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
      subtitle: "A learning platform for market literacy, virtual portfolio practice, AI-supported interpretation, and community-based competitions.",
      primaryAction: "Start learning",
      secondaryAction: "View leaderboard",
    },
    pages: {
      login: {
        title: "Login",
        description: "Access your Enbilir account and continue your virtual portfolio learning journey.",
      },
      register: {
        title: "Register",
        description: "Create your account and join the education, AI assistant, and virtual portfolio competition flow.",
      },
      panel: {
        title: "User dashboard",
        description: "Manage your profile, league participation, virtual portfolio progress, friends, and learning activity.",
      },
      admin: {
        title: "Admin panel",
        description: "Manage site visuals, announcements, page content, leagues, badges, and platform communication.",
      },
      leaderboard: {
        title: "Leaderboard",
        description: "Follow the overall virtual portfolio ranking and compare learning progress across the community.",
      },
      blog: {
        title: "Blog",
        description: "Long-form market literacy notes, community learning stories, and Enbilir platform updates.",
      },
      education: {
        title: "Education",
        description: "A structured learning area for financial literacy, virtual portfolio discipline, and AI-assisted interpretation.",
      },
      kvkk: {
        title: "Privacy Notice",
        description: "Information about how personal data is processed, protected, and managed on Enbilir.",
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
