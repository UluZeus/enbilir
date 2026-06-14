import { PageHeader } from "@/components/PageHeader";
import { FormMessage } from "@/components/FormMessage";
import type { ReactNode } from "react";
import { getSafeLocale } from "@/i18n/config";
import { getUiCopy } from "@/i18n/ui-copy";
import {
  awardLeaderBadgesAction,
  createAdPlacementAction,
  createCompetitionPeriodAction,
  toggleAdPlacementAction,
  toggleBadgeAction,
  toggleCompetitionPeriodAction,
  toggleManagedContentItemAction,
  updateAdPlacementAction,
  updateSiteVisualSettingsAction,
  upsertManagedContentItemAction,
} from "@/lib/actions";
import { ensureDefaultBadges } from "@/lib/badges";
import { canAccessAdmin, getSessionUser } from "@/lib/auth";
import { competitionPeriodLabels, competitionPeriodTypes } from "@/lib/competition-periods";
import { prisma } from "@/lib/prisma";
import { defaultVisualSettings, getSiteVisualSettings } from "@/lib/site-visual-settings";
import { adSlots, type AdSlot } from "@/lib/ads";
import { managedContentTypes, type ManagedContentTypeCode } from "@/lib/managed-content";

function getAdminCopy(locale: "tr" | "en") {
  return locale === "en"
    ? {
        loginRequired: "Login required",
        loginBody: "Please sign in before accessing the admin panel.",
        unauthorized: "Unauthorized access",
        unauthorizedBody: "Only ADMIN and MASTER_ADMIN users can access this page.",
        title: "Admin panel",
        description: "Manage ad slots, information content, and editable page copy.",
        visualManagement: "Visual management",
        visualSettings: "Visual Settings",
        visualBody: "Colors, background image URLs, and motion effects are managed here. If visual URL fields are empty, default CSS/SVG patterns are used.",
        active: "Active",
        inactive: "Inactive",
        text: "Text",
        imageBadge: "Image badge",
        saveVisuals: "Save visual settings",
        addAd: "Add ad / information area",
        titlePlaceholder: "Title",
        textPlaceholder: "Text",
        linkUrl: "Link URL",
        linkLabel: "Link label",
        imageUrl: "Image URL",
        videoUrl: "Video URL",
        imageFile: "Upload image from computer",
        videoFile: "Upload video from computer",
        slot: "Placement",
        displaySeconds: "Display seconds",
        priority: "Priority",
        save: "Save",
        edit: "Edit",
        update: "Update",
        addManagedItem: "Add page content",
        managedItems: "Page content and announcements",
        contentType: "Content type",
        contentLocale: "Language",
        excerpt: "Summary",
        sortOrder: "Sort order",
        publishedAt: "Publish date",
        featured: "Featured",
        mediaHelp: "Use a public image/video URL or upload a file from this computer. Uploaded files are saved under /uploads/admin.",
        noRecords: "No record yet.",
        managedContent: "Managed content",
        pageCode: "Page code",
        content: "Content",
        saveContent: "Save content",
        adSlots: "Ad slots",
        contentPages: "Content pages",
        deactivate: "Deactivate",
        activate: "Activate",
        competitionManagement: "Competition management",
        competitionPeriods: "Competition Periods",
        competitionBody: "Weekly, monthly, 3-month, 6-month, and yearly rankings are calculated using these periods.",
        createPeriod: "Create new period",
        type: "Type",
        periodPlaceholder: "Example: May 2026 Weekly Competition",
        startsAt: "Start",
        endsAt: "End",
        savePeriod: "Save period",
        leaderBadges: "Weekly/Monthly leader badges",
        leaderBadgesBody: "Awards the relevant leader badge to the first-ranked user in active weekly and monthly periods.",
        awardLeaderBadges: "Award leader badges",
        noPeriods: "No competition period has been created yet.",
        achievementSystem: "Achievement system",
        badgeList: "Badge list",
        badges: "badges",
      }
    : {
        loginRequired: "Giriş gerekli",
        loginBody: "Admin paneline erişmek için giriş yapmalısın.",
        unauthorized: "Yetkisiz erişim",
        unauthorizedBody: "Bu sayfaya sadece ADMIN ve MASTER_ADMIN kullanıcılar erişebilir.",
        title: "Admin paneli",
        description: "Reklam alanları, bilgi içerikleri ve yönetilebilir sayfa metinleri.",
        visualManagement: "Görsel yönetim",
        visualSettings: "Görsel Ayarlar",
        visualBody: "Renkler, arka plan görsel URL'leri ve hareket efektleri buradan yönetilir. Görsel URL alanları boşsa varsayılan CSS/SVG desenleri kullanılır.",
        active: "Aktif",
        inactive: "Pasif",
        text: "Metin",
        imageBadge: "Görsel rozet",
        saveVisuals: "Görsel ayarları kaydet",
        addAd: "Reklam / bilgi alanı ekle",
        titlePlaceholder: "Başlık",
        textPlaceholder: "Metin",
        linkUrl: "Bağlantı adresi",
        linkLabel: "Bağlantı etiketi",
        imageUrl: "Görsel URL",
        videoUrl: "Video URL",
        imageFile: "Bilgisayardan görsel yükle",
        videoFile: "Bilgisayardan video yükle",
        slot: "Konum",
        displaySeconds: "Gösterim saniyesi",
        priority: "Öncelik",
        save: "Kaydet",
        edit: "Düzenle",
        update: "Güncelle",
        addManagedItem: "Sayfa içeriği ekle",
        managedItems: "Sayfa içerikleri ve duyurular",
        contentType: "İçerik türü",
        contentLocale: "Dil",
        excerpt: "Kısa özet",
        sortOrder: "Sıralama",
        publishedAt: "Yayın tarihi",
        featured: "Öne çıkar",
        mediaHelp: "Herkese açık görsel/video URL kullanabilir veya bu bilgisayardan dosya yükleyebilirsin. Yüklenen dosyalar /uploads/admin altında saklanır.",
        noRecords: "Henüz kayıt yok.",
        managedContent: "Yönetilebilir içerik",
        pageCode: "Sayfa kodu",
        content: "İçerik",
        saveContent: "İçeriği kaydet",
        adSlots: "Reklam alanları",
        contentPages: "İçerik sayfaları",
        deactivate: "Pasifleştir",
        activate: "Aktifleştir",
        competitionManagement: "Yarışma yönetimi",
        competitionPeriods: "Yarışma Dönemleri",
        competitionBody: "Haftalık, aylık, 3 aylık, 6 aylık ve yıllık sıralamalar bu dönemlere göre hesaplanır.",
        createPeriod: "Yeni dönem oluştur",
        type: "Tür",
        periodPlaceholder: "Örn. 2026 Mayıs Haftalık Yarışması",
        startsAt: "Başlangıç",
        endsAt: "Bitiş",
        savePeriod: "Dönemi kaydet",
        leaderBadges: "Haftalık/Aylık lider rozetleri",
        leaderBadgesBody: "Aktif haftalık ve aylık dönemlerde 1. sıradaki kullanıcıya ilgili lider rozetini verir.",
        awardLeaderBadges: "Lider rozetlerini ver",
        noPeriods: "Henüz yarışma dönemi oluşturulmadı.",
        achievementSystem: "Başarı sistemi",
        badgeList: "Rozet listesi",
        badges: "rozet",
      };
}

function getVisualSettingCopy(key: string, locale: "tr" | "en", fallbackTitle: string, fallbackDescription: string) {
  if (locale === "tr") {
    return { title: fallbackTitle, description: fallbackDescription };
  }

  const values: Record<string, { title: string; description: string }> = {
    gradientPrimary: {
      title: "Primary gradient color",
      description: "Dominant color used on the lower-left side of the global background gradient.",
    },
    gradientSecondary: {
      title: "Secondary gradient color",
      description: "Dominant color used on the upper-right side of the global background gradient.",
    },
    accentColor: {
      title: "Accent color",
      description: "Used for CTAs, glow effects, and premium gold accents.",
    },
    heroBackgroundImageUrl: {
      title: "Hero background image URL",
      description: "Used with light transparency over the CSS pattern in the home hero area.",
    },
    homeOverlayImageUrl: {
      title: "Home transparent overlay image URL",
      description: "Used as a transparent decorative image layer across the home page.",
    },
    adImageUrl: {
      title: "Ad image URL",
      description: "Optional background image used in ad/information cards.",
    },
    animationsEnabled: {
      title: "Animations enabled",
      description: "Turns global background motion and micro animations on or off.",
    },
    card3dEnabled: {
      title: "3D card effects enabled",
      description: "Turns desktop hover tilt/perspective effects on premium cards on or off.",
    },
    whatsappButtonVariant: {
      title: "WhatsApp button preference",
      description: "text or image. Image uses a compact visual badge style.",
    },
  };

  return values[key] ?? { title: fallbackTitle, description: fallbackDescription };
}

type AdminAdPlacement = {
  id: string;
  slot: string;
  title: string;
  body: string;
  imageUrl: string | null;
  videoUrl: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  isActive: boolean;
  displaySeconds: number;
  priority: number;
  startsAt: Date | null;
  endsAt: Date | null;
};

type AdminManagedContentItem = {
  id: string;
  type: string;
  locale: string;
  title: string;
  excerpt: string | null;
  body: string;
  imageUrl: string | null;
  videoUrl: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  sortOrder: number;
  isFeatured: boolean;
  isActive: boolean;
  publishedAt: Date | null;
};

const adSlotLabels: Record<AdSlot, Record<"tr" | "en", string>> = {
  home_top: {
    tr: "Ana sayfa üst reklam / bilgi alanı",
    en: "Home top ad / information area",
  },
  trade_top: {
    tr: "İşlem sayfası üst reklam",
    en: "Trade page top ad",
  },
  trade_right: {
    tr: "İşlem sayfası sağ/yan reklam",
    en: "Trade page side ad",
  },
  trade_bottom: {
    tr: "İşlem sayfası alt reklam",
    en: "Trade page bottom ad",
  },
};

const contentTypeLabels: Record<ManagedContentTypeCode, Record<"tr" | "en", string>> = {
  ANNOUNCEMENT: {
    tr: "Duyuru (ana sayfa)",
    en: "Announcement (home page)",
  },
  BLOG: {
    tr: "Blog yazısı",
    en: "Blog post",
  },
  EDUCATION: {
    tr: "Eğitim içeriği",
    en: "Education content",
  },
  CONTACT: {
    tr: "İletişim sayfası içeriği",
    en: "Contact page content",
  },
};

function getAdSlotLabel(slot: string, locale: "tr" | "en") {
  return adSlotLabels[slot as AdSlot]?.[locale] ?? slot;
}

function getContentTypeLabel(type: string, locale: "tr" | "en") {
  return contentTypeLabels[type as ManagedContentTypeCode]?.[locale] ?? type;
}

function formatDateTimeInput(value: Date | null) {
  if (!value) {
    return "";
  }

  const pad = (part: number) => String(part).padStart(2, "0");

  return [
    value.getFullYear(),
    "-",
    pad(value.getMonth() + 1),
    "-",
    pad(value.getDate()),
    "T",
    pad(value.getHours()),
    ":",
    pad(value.getMinutes()),
  ].join("");
}

type AdminCopy = ReturnType<typeof getAdminCopy>;

function AdminField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

function adminInputClass() {
  return "rounded-md border border-slate-300 bg-white/85 px-4 py-3 font-normal outline-none focus:border-[#0f766e]";
}

function AdPlacementFields({ copy, locale, ad }: { copy: AdminCopy; locale: "tr" | "en"; ad?: AdminAdPlacement }) {
  return (
    <>
      <AdminField label={copy.slot}>
        <select name="slot" defaultValue={ad?.slot ?? "home_top"} className={adminInputClass()}>
          {adSlots.map((slot) => (
            <option key={slot} value={slot}>
              {getAdSlotLabel(slot, locale)}
            </option>
          ))}
        </select>
      </AdminField>
      <AdminField label={copy.titlePlaceholder}>
        <input name="title" required defaultValue={ad?.title} placeholder={copy.titlePlaceholder} className={adminInputClass()} />
      </AdminField>
      <AdminField label={copy.textPlaceholder}>
        <textarea name="body" required rows={4} defaultValue={ad?.body} placeholder={copy.textPlaceholder} className={adminInputClass()} />
      </AdminField>
      <div className="grid gap-4 md:grid-cols-2">
        <AdminField label={copy.imageUrl}>
          <input name="imageUrl" defaultValue={ad?.imageUrl ?? ""} placeholder="https://..." className={adminInputClass()} />
        </AdminField>
        <AdminField label={copy.videoUrl}>
          <input name="videoUrl" defaultValue={ad?.videoUrl ?? ""} placeholder="https://..." className={adminInputClass()} />
        </AdminField>
        <AdminField label={copy.imageFile}>
          <input
            name="imageFile"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
            className="rounded-md border border-dashed border-slate-300 bg-white/85 px-4 py-3 font-normal file:mr-3 file:rounded-md file:border-0 file:bg-[#0f766e] file:px-3 file:py-2 file:text-xs file:font-black file:text-white"
          />
        </AdminField>
        <AdminField label={copy.videoFile}>
          <input
            name="videoFile"
            type="file"
            accept="video/mp4,video/webm,video/ogg,video/quicktime"
            className="rounded-md border border-dashed border-slate-300 bg-white/85 px-4 py-3 font-normal file:mr-3 file:rounded-md file:border-0 file:bg-[#0f766e] file:px-3 file:py-2 file:text-xs file:font-black file:text-white"
          />
        </AdminField>
        <AdminField label={copy.linkUrl}>
          <input name="linkUrl" defaultValue={ad?.linkUrl ?? ""} placeholder="/tr/egitim" className={adminInputClass()} />
        </AdminField>
        <AdminField label={copy.linkLabel}>
          <input name="linkLabel" defaultValue={ad?.linkLabel ?? ""} placeholder={copy.linkLabel} className={adminInputClass()} />
        </AdminField>
        <AdminField label={copy.displaySeconds}>
          <input name="displaySeconds" type="number" min={1} defaultValue={ad?.displaySeconds ?? 8} className={adminInputClass()} />
        </AdminField>
        <AdminField label={copy.priority}>
          <input name="priority" type="number" defaultValue={ad ? String(ad.priority) : ""} className={adminInputClass()} />
        </AdminField>
        <AdminField label={copy.startsAt}>
          <input name="startsAt" type="datetime-local" defaultValue={formatDateTimeInput(ad?.startsAt ?? null)} className={adminInputClass()} />
        </AdminField>
        <AdminField label={copy.endsAt}>
          <input name="endsAt" type="datetime-local" defaultValue={formatDateTimeInput(ad?.endsAt ?? null)} className={adminInputClass()} />
        </AdminField>
      </div>
      <label className="flex gap-3 text-sm font-bold text-slate-700">
        <input name="isActive" type="checkbox" defaultChecked={ad?.isActive ?? true} /> {copy.active}
      </label>
    </>
  );
}

function ManagedContentItemFields({ copy, locale, item }: { copy: AdminCopy; locale: "tr" | "en"; item?: AdminManagedContentItem }) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <AdminField label={copy.contentType}>
          <select name="type" defaultValue={item?.type ?? "ANNOUNCEMENT"} className={adminInputClass()}>
            {managedContentTypes.map((type) => (
              <option key={type} value={type}>
                {getContentTypeLabel(type, locale)}
              </option>
            ))}
          </select>
        </AdminField>
        <AdminField label={copy.contentLocale}>
          <select name="contentLocale" defaultValue={item?.locale ?? locale} className={adminInputClass()}>
            <option value="tr">TR</option>
            <option value="en">EN</option>
          </select>
        </AdminField>
      </div>
      <AdminField label={copy.titlePlaceholder}>
        <input name="title" required defaultValue={item?.title} placeholder={copy.titlePlaceholder} className={adminInputClass()} />
      </AdminField>
      <AdminField label={copy.excerpt}>
        <textarea name="excerpt" rows={2} defaultValue={item?.excerpt ?? ""} placeholder={copy.excerpt} className={adminInputClass()} />
      </AdminField>
      <AdminField label={copy.content}>
        <textarea name="body" required rows={7} defaultValue={item?.body} placeholder={copy.content} className={adminInputClass()} />
      </AdminField>
      <div className="grid gap-4 md:grid-cols-2">
        <AdminField label={copy.imageUrl}>
          <input name="imageUrl" defaultValue={item?.imageUrl ?? ""} placeholder="https://..." className={adminInputClass()} />
        </AdminField>
        <AdminField label={copy.videoUrl}>
          <input name="videoUrl" defaultValue={item?.videoUrl ?? ""} placeholder="https://..." className={adminInputClass()} />
        </AdminField>
        <AdminField label={copy.imageFile}>
          <input
            name="imageFile"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
            className="rounded-md border border-dashed border-slate-300 bg-white/85 px-4 py-3 font-normal file:mr-3 file:rounded-md file:border-0 file:bg-[#0f766e] file:px-3 file:py-2 file:text-xs file:font-black file:text-white"
          />
        </AdminField>
        <AdminField label={copy.videoFile}>
          <input
            name="videoFile"
            type="file"
            accept="video/mp4,video/webm,video/ogg,video/quicktime"
            className="rounded-md border border-dashed border-slate-300 bg-white/85 px-4 py-3 font-normal file:mr-3 file:rounded-md file:border-0 file:bg-[#0f766e] file:px-3 file:py-2 file:text-xs file:font-black file:text-white"
          />
        </AdminField>
        <AdminField label={copy.linkUrl}>
          <input name="linkUrl" defaultValue={item?.linkUrl ?? ""} placeholder="/tr/blog" className={adminInputClass()} />
        </AdminField>
        <AdminField label={copy.linkLabel}>
          <input name="linkLabel" defaultValue={item?.linkLabel ?? ""} placeholder={copy.linkLabel} className={adminInputClass()} />
        </AdminField>
        <AdminField label={copy.sortOrder}>
          <input name="sortOrder" type="number" defaultValue={item ? String(item.sortOrder) : ""} className={adminInputClass()} />
        </AdminField>
        <AdminField label={copy.publishedAt}>
          <input name="publishedAt" type="datetime-local" defaultValue={formatDateTimeInput(item?.publishedAt ?? null)} className={adminInputClass()} />
        </AdminField>
      </div>
      <div className="flex flex-wrap gap-5 text-sm font-bold text-slate-700">
        <label className="flex gap-3">
          <input name="isFeatured" type="checkbox" defaultChecked={item?.isFeatured ?? false} /> {copy.featured}
        </label>
        <label className="flex gap-3">
          <input name="isActive" type="checkbox" defaultChecked={item?.isActive ?? true} /> {copy.active}
        </label>
      </div>
    </>
  );
}

export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ error?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const query = searchParams ? await searchParams : {};
  const locale = getSafeLocale(rawLocale);
  const copy = getAdminCopy(locale);
  const ui = getUiCopy(locale);
  const user = await getSessionUser();

  if (!user) {
    return <AdminNotice title={copy.loginRequired} body={copy.loginBody} />;
  }

  if (!canAccessAdmin(user.role)) {
    return <AdminNotice title={copy.unauthorized} body={copy.unauthorizedBody} />;
  }

  await ensureDefaultBadges();

  const [ads, managedItems, badges, competitionPeriods, visualSettings] = await Promise.all([
    prisma.adPlacement.findMany({ orderBy: [{ slot: "asc" }, { priority: "desc" }, { createdAt: "desc" }] }),
    prisma.managedContentItem.findMany({ orderBy: [{ type: "asc" }, { locale: "asc" }, { sortOrder: "desc" }, { createdAt: "desc" }] }),
    prisma.badge.findMany({ orderBy: [{ category: "asc" }, { createdAt: "asc" }] }),
    prisma.competitionPeriod.findMany({ orderBy: [{ startsAt: "desc" }, { type: "asc" }] }),
    getSiteVisualSettings(),
  ]);

  return (
    <div className="grid gap-6">
      <PageHeader title={copy.title} description={copy.description} locale={locale} />
      <FormMessage message={query.error} />
      <section className="premium-card p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0f766e]">{copy.visualManagement}</p>
            <h2 className="mt-2 text-xl font-black text-[#152033]">{copy.visualSettings}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {copy.visualBody}
            </p>
          </div>
        </div>
        <form action={updateSiteVisualSettingsAction} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <input type="hidden" name="locale" value={locale} />
          {defaultVisualSettings.map((setting) => {
            const settingCopy = getVisualSettingCopy(setting.key, locale, setting.title, setting.description);

            return (
            <label key={setting.key} className="grid gap-2 rounded-lg border border-white/60 bg-white/55 p-4 text-sm font-bold text-slate-700 shadow-sm backdrop-blur">
              <span>{settingCopy.title}</span>
              {setting.type === "BOOLEAN" ? (
                <span className="flex items-center gap-3 rounded-md border border-slate-200 bg-white/80 px-4 py-3 font-normal">
                  <input name={setting.key} type="checkbox" defaultChecked={visualSettings[setting.key] === "true"} />
                  {copy.active}
                </span>
              ) : setting.key === "whatsappButtonVariant" ? (
                <select name={setting.key} defaultValue={visualSettings[setting.key]} className="rounded-md border border-slate-300 px-4 py-3 font-normal outline-none focus:border-[#0f766e]">
                  <option value="text">{copy.text}</option>
                  <option value="image">{copy.imageBadge}</option>
                </select>
              ) : setting.type === "IMAGE_URL" ? (
                <span className="grid gap-2">
                  <input
                    name={setting.key}
                    type="text"
                    defaultValue={visualSettings[setting.key]}
                    placeholder="https://... veya /uploads/..."
                    className="min-h-12 rounded-md border border-slate-300 px-4 py-3 font-normal outline-none focus:border-[#0f766e]"
                  />
                  <input
                    name={`${setting.key}File`}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                    className="min-h-12 rounded-md border border-dashed border-slate-300 bg-white/70 px-4 py-3 font-normal file:mr-3 file:rounded-md file:border-0 file:bg-[#0f766e] file:px-3 file:py-2 file:text-xs file:font-black file:text-white"
                  />
                </span>
              ) : (
                <input
                  name={setting.key}
                  type={setting.type === "COLOR" ? "color" : "text"}
                  defaultValue={visualSettings[setting.key]}
                  className="min-h-12 rounded-md border border-slate-300 px-4 py-3 font-normal outline-none focus:border-[#0f766e]"
                />
              )}
              <span className="text-xs font-normal leading-5 text-slate-500">{settingCopy.description}</span>
            </label>
            );
          })}
          <div className="md:col-span-2 xl:col-span-3">
            <button className="premium-cta px-5 py-3 text-sm font-black">{copy.saveVisuals}</button>
          </div>
        </form>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <form action={createAdPlacementAction} className="glass-card rounded-lg p-6 shadow-sm">
          <input type="hidden" name="locale" value={locale} />
          <h2 className="text-xl font-black text-[#152033]">{copy.addAd}</h2>
          <div className="mt-4 grid gap-4">
            <AdPlacementFields copy={copy} locale={locale} />
            <button className="premium-action px-5 py-3 text-sm font-black">{copy.save}</button>
          </div>
        </form>

        <form action={upsertManagedContentItemAction} className="glass-card rounded-lg p-6 shadow-sm">
          <input type="hidden" name="locale" value={locale} />
          <h2 className="text-xl font-black text-[#152033]">{copy.addManagedItem}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{copy.mediaHelp}</p>
          <div className="mt-4 grid gap-4">
            <ManagedContentItemFields copy={copy} locale={locale} />
            <button className="premium-action px-5 py-3 text-sm font-black">{copy.saveContent}</button>
          </div>
        </form>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <AdminList title={copy.adSlots}>
          {ads.length === 0 ? (
            <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">{copy.noRecords}</p>
          ) : ads.map((ad) => (
            <AdPlacementAdminCard key={ad.id} ad={ad} copy={copy} locale={locale} />
          ))}
        </AdminList>
        <AdminList title={copy.managedItems}>
          {managedItems.length === 0 ? (
            <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600">{copy.noRecords}</p>
          ) : managedItems.map((item) => (
            <ManagedContentAdminCard key={item.id} item={item} copy={copy} locale={locale} />
          ))}
        </AdminList>
      </section>

      <section className="premium-card premium-card--dark overflow-hidden text-white">
        <div className="border-b border-white/10 p-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f5a623]">{copy.competitionManagement}</p>
          <h2 className="mt-2 text-xl font-black">{copy.competitionPeriods}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {copy.competitionBody}
          </p>
        </div>
        <div className="grid gap-6 p-6 lg:grid-cols-[0.9fr_1.1fr]">
          <form action={createCompetitionPeriodAction} className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
            <input type="hidden" name="locale" value={locale} />
            <h3 className="text-lg font-black">{copy.createPeriod}</h3>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-2 text-sm font-bold text-slate-200">
                {copy.type}
                <select name="type" defaultValue="WEEKLY" className="rounded-md border border-white/10 bg-black/30 px-4 py-3 font-normal text-white">
                  {competitionPeriodTypes.map((type) => (
                    <option key={type} value={type}>
                      {locale === "en" ? ui.home.periodLabels[type] : competitionPeriodLabels[type]}
                    </option>
                  ))}
                </select>
              </label>
              <input name="name" placeholder={copy.periodPlaceholder} className="rounded-md border border-white/10 bg-black/30 px-4 py-3 text-white" />
              <label className="grid gap-2 text-sm font-bold text-slate-200">
                {copy.startsAt}
                <input name="startsAt" type="datetime-local" className="rounded-md border border-white/10 bg-black/30 px-4 py-3 font-normal text-white" />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-200">
                {copy.endsAt}
                <input name="endsAt" type="datetime-local" className="rounded-md border border-white/10 bg-black/30 px-4 py-3 font-normal text-white" />
              </label>
              <label className="flex gap-3 text-sm text-slate-200">
                <input name="isActive" type="checkbox" defaultChecked /> {copy.active}
              </label>
              <button className="premium-cta px-5 py-3 text-sm font-black">{copy.savePeriod}</button>
            </div>
          </form>

          <div className="grid content-start gap-4">
            <form action={awardLeaderBadgesAction} className="rounded-lg border border-[#f5a623]/40 bg-[#f5a623]/10 p-5">
              <input type="hidden" name="locale" value={locale} />
              <h3 className="font-black">{copy.leaderBadges}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {copy.leaderBadgesBody}
              </p>
              <button className="mt-4 rounded-md border border-[#f5a623] px-4 py-2 text-xs font-black text-[#f5a623] hover:bg-[#f5a623] hover:text-[#101827]">
                {copy.awardLeaderBadges}
              </button>
            </form>

            <div className="grid gap-3">
              {competitionPeriods.length === 0 ? (
                <p className="rounded-md bg-black/25 p-4 text-sm text-slate-300">{copy.noPeriods}</p>
              ) : (
                competitionPeriods.map((period) => (
                  <div key={period.id} className="rounded-md border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-black">{period.name}</p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#f5a623]">
                          {locale === "en" ? ui.home.periodLabels[period.type] : competitionPeriodLabels[period.type]}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-slate-300">
                          {period.startsAt.toLocaleString("tr-TR")} - {period.endsAt.toLocaleString("tr-TR")}
                        </p>
                      </div>
                      <form action={toggleCompetitionPeriodAction} className="shrink-0">
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="id" value={period.id} />
                        <input type="hidden" name="nextActive" value={String(!period.isActive)} />
                        <button className="rounded-md border border-[#f5a623] px-3 py-2 text-xs font-black text-[#f5a623]">
                          {period.isActive ? copy.deactivate : copy.activate}
                        </button>
                      </form>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="premium-card premium-card--dark p-5 text-white">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f5a623]">{copy.achievementSystem}</p>
            <h2 className="mt-2 text-xl font-black">{copy.badgeList}</h2>
          </div>
          <p className="text-sm text-slate-300">{badges.length} {copy.badges}</p>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {badges.map((badge) => (
            <div key={badge.id} className="rounded-md border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-2xl text-[#f5a623]">{badge.icon}</p>
                  <h3 className="mt-2 font-black">{locale === "en" ? badge.nameEn : badge.nameTr}</h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{badge.code}</p>
                </div>
                <span className={badge.isActive ? "text-xs font-black text-[#f5a623]" : "text-xs font-black text-slate-500"}>
                  {badge.isActive ? copy.active : copy.inactive}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">{locale === "en" ? badge.descriptionEn : badge.descriptionTr}</p>
              <form action={toggleBadgeAction} className="mt-4">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="id" value={badge.id} />
                <input type="hidden" name="nextActive" value={String(!badge.isActive)} />
                <button className="rounded-md border border-[#f5a623] px-3 py-2 text-xs font-black text-[#f5a623] hover:bg-[#f5a623] hover:text-[#101827]">
                  {badge.isActive ? copy.deactivate : copy.activate}
                </button>
              </form>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function AdminNotice({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-900">
      <h1 className="text-2xl font-black">{title}</h1>
      <p className="mt-2 text-sm">{body}</p>
    </section>
  );
}

function AdminList({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="glass-card rounded-lg p-5">
      <h2 className="text-xl font-black text-[#152033]">{title}</h2>
      <div className="mt-4 grid gap-3">{children}</div>
    </section>
  );
}

function AdPlacementAdminCard({ ad, copy, locale }: { ad: AdminAdPlacement; copy: AdminCopy; locale: "tr" | "en" }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0f766e]">{getAdSlotLabel(ad.slot, locale)}</p>
          <p className="mt-1 font-black text-[#152033]">{ad.title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{ad.body}</p>
          <p className="mt-2 text-xs font-bold text-slate-500">
            {copy.priority}: {ad.priority} · {copy.displaySeconds}: {ad.displaySeconds}
          </p>
          {ad.imageUrl || ad.videoUrl ? (
            <p className="mt-1 break-all text-xs font-bold text-slate-500">
              {ad.videoUrl ? copy.videoUrl : copy.imageUrl}: {ad.videoUrl || ad.imageUrl}
            </p>
          ) : null}
        </div>
        <span className={ad.isActive ? "text-xs font-black text-[#0f766e]" : "text-xs font-black text-slate-500"}>
          {ad.isActive ? copy.active : copy.inactive}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <form action={toggleAdPlacementAction}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="id" value={ad.id} />
          <input type="hidden" name="nextActive" value={String(!ad.isActive)} />
          <button className="rounded-md border border-slate-300 px-3 py-2 text-xs font-black">{ad.isActive ? copy.deactivate : copy.activate}</button>
        </form>
        <details className="min-w-full rounded-md border border-slate-200 bg-slate-50 p-3">
          <summary className="cursor-pointer text-xs font-black text-[#152033]">{copy.edit}</summary>
          <form action={updateAdPlacementAction} className="mt-4 grid gap-4">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="id" value={ad.id} />
            <AdPlacementFields copy={copy} locale={locale} ad={ad} />
            <button className="premium-action px-5 py-3 text-sm font-black">{copy.update}</button>
          </form>
        </details>
      </div>
    </div>
  );
}

function ManagedContentAdminCard({ item, copy, locale }: { item: AdminManagedContentItem; copy: AdminCopy; locale: "tr" | "en" }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0f766e]">
            {getContentTypeLabel(item.type, locale)} · {item.locale.toUpperCase()}
          </p>
          <p className="mt-1 font-black text-[#152033]">{item.title}</p>
          {item.excerpt ? <p className="mt-1 text-sm font-bold leading-6 text-slate-600">{item.excerpt}</p> : null}
          <p className="mt-1 text-sm leading-6 text-slate-600">{item.body}</p>
          <p className="mt-2 text-xs font-bold text-slate-500">
            {copy.sortOrder}: {item.sortOrder} · {item.isFeatured ? copy.featured : copy.inactive}
          </p>
          {item.imageUrl || item.videoUrl ? (
            <p className="mt-1 break-all text-xs font-bold text-slate-500">
              {item.videoUrl ? copy.videoUrl : copy.imageUrl}: {item.videoUrl || item.imageUrl}
            </p>
          ) : null}
        </div>
        <span className={item.isActive ? "text-xs font-black text-[#0f766e]" : "text-xs font-black text-slate-500"}>
          {item.isActive ? copy.active : copy.inactive}
        </span>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <form action={toggleManagedContentItemAction}>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="contentLocale" value={item.locale} />
          <input type="hidden" name="id" value={item.id} />
          <input type="hidden" name="nextActive" value={String(!item.isActive)} />
          <button className="rounded-md border border-slate-300 px-3 py-2 text-xs font-black">{item.isActive ? copy.deactivate : copy.activate}</button>
        </form>
        <details className="min-w-full rounded-md border border-slate-200 bg-slate-50 p-3">
          <summary className="cursor-pointer text-xs font-black text-[#152033]">{copy.edit}</summary>
          <form action={upsertManagedContentItemAction} className="mt-4 grid gap-4">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="id" value={item.id} />
            <ManagedContentItemFields copy={copy} locale={locale} item={item} />
            <button className="premium-action px-5 py-3 text-sm font-black">{copy.update}</button>
          </form>
        </details>
      </div>
    </div>
  );
}
