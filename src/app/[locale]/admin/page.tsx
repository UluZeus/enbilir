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
  updateSiteVisualSettingsAction,
  upsertManagedContentAction,
} from "@/lib/actions";
import { ensureDefaultBadges } from "@/lib/badges";
import { canAccessAdmin, getSessionUser } from "@/lib/auth";
import { competitionPeriodLabels, competitionPeriodTypes } from "@/lib/competition-periods";
import { prisma } from "@/lib/prisma";
import { defaultVisualSettings, getSiteVisualSettings } from "@/lib/site-visual-settings";

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
        save: "Save",
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
        save: "Kaydet",
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

  const [ads, managedPages, badges, competitionPeriods, visualSettings] = await Promise.all([
    prisma.adPlacement.findMany({ orderBy: [{ slot: "asc" }, { priority: "desc" }, { createdAt: "desc" }] }),
    prisma.managedContentPage.findMany({ orderBy: [{ code: "asc" }] }),
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
              ) : (
                <input
                  name={setting.key}
                  type={setting.type === "COLOR" ? "color" : "text"}
                  defaultValue={visualSettings[setting.key]}
                  placeholder={setting.type === "IMAGE_URL" ? "https://..." : undefined}
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
          <div className="mt-4 grid gap-3">
            <input name="slot" placeholder="home_top, trade_top, trade_right, trade_bottom" className="rounded-md border border-slate-300 px-4 py-3" />
            <input name="title" placeholder={copy.titlePlaceholder} className="rounded-md border border-slate-300 px-4 py-3" />
            <textarea name="body" rows={4} placeholder={copy.textPlaceholder} className="rounded-md border border-slate-300 px-4 py-3" />
            <input name="linkUrl" placeholder={copy.linkUrl} className="rounded-md border border-slate-300 px-4 py-3" />
            <input name="linkLabel" placeholder={copy.linkLabel} className="rounded-md border border-slate-300 px-4 py-3" />
            <input name="displaySeconds" type="number" defaultValue={8} className="rounded-md border border-slate-300 px-4 py-3" />
            <input name="priority" type="number" defaultValue={0} className="rounded-md border border-slate-300 px-4 py-3" />
            <label className="flex gap-3 text-sm text-slate-700"><input name="isActive" type="checkbox" defaultChecked /> {copy.active}</label>
            <button className="premium-action px-5 py-3 text-sm font-black">{copy.save}</button>
          </div>
        </form>

        <form action={upsertManagedContentAction} className="glass-card rounded-lg p-6 shadow-sm">
          <input type="hidden" name="locale" value={locale} />
          <h2 className="text-xl font-black text-[#152033]">{copy.managedContent}</h2>
          <div className="mt-4 grid gap-3">
            <input name="code" placeholder={copy.pageCode} className="rounded-md border border-slate-300 px-4 py-3" />
            <input name="title" placeholder={copy.titlePlaceholder} className="rounded-md border border-slate-300 px-4 py-3" />
            <textarea name="body" rows={7} placeholder={copy.content} className="rounded-md border border-slate-300 px-4 py-3" />
            <label className="flex gap-3 text-sm text-slate-700"><input name="isActive" type="checkbox" defaultChecked /> {copy.active}</label>
            <button className="premium-action px-5 py-3 text-sm font-black">{copy.saveContent}</button>
          </div>
        </form>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <AdminList title={copy.adSlots}>
          {ads.map((ad) => (
            <div key={ad.id} className="rounded-md border border-slate-200 bg-white p-4">
              <p className="font-black text-[#152033]">{ad.slot} - {ad.title}</p>
              <p className="mt-1 text-sm text-slate-600">{ad.body}</p>
              <form action={toggleAdPlacementAction} className="mt-3">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="id" value={ad.id} />
                <input type="hidden" name="nextActive" value={String(!ad.isActive)} />
                <button className="rounded-md border border-slate-300 px-3 py-2 text-xs font-black">{ad.isActive ? copy.deactivate : copy.activate}</button>
              </form>
            </div>
          ))}
        </AdminList>
        <AdminList title={copy.contentPages}>
          {managedPages.map((page) => (
            <div key={page.id} className="rounded-md border border-slate-200 bg-white p-4">
              <p className="font-black text-[#152033]">{page.code} - {page.title}</p>
              <p className="mt-1 text-sm text-slate-600">{page.body}</p>
            </div>
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
