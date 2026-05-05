import { PageHeader } from "@/components/PageHeader";
import { FormMessage } from "@/components/FormMessage";
import type { ReactNode } from "react";
import { getSafeLocale } from "@/i18n/config";
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
  const user = await getSessionUser();

  if (!user) {
    return <AdminNotice title="Giriş gerekli" body="Admin paneline erişmek için giriş yapmalısın." />;
  }

  if (!canAccessAdmin(user.role)) {
    return <AdminNotice title="Yetkisiz erişim" body="Bu sayfaya sadece ADMIN ve MASTER_ADMIN kullanıcılar erişebilir." />;
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
      <PageHeader title="Admin paneli" description="Reklam alanları, bilgi içerikleri ve yönetilebilir sayfa metinleri." />
      <FormMessage message={query.error} />
      <section className="premium-card p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0f766e]">Görsel yönetim</p>
            <h2 className="mt-2 text-xl font-black text-[#152033]">Görsel Ayarlar</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Renkler, arka plan görsel URL&apos;leri ve hareket efektleri buradan yönetilir. Görsel URL alanları boşsa varsayılan CSS/SVG desenleri kullanılır.
            </p>
          </div>
        </div>
        <form action={updateSiteVisualSettingsAction} className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <input type="hidden" name="locale" value={locale} />
          {defaultVisualSettings.map((setting) => (
            <label key={setting.key} className="grid gap-2 rounded-lg border border-white/60 bg-white/55 p-4 text-sm font-bold text-slate-700 shadow-sm backdrop-blur">
              <span>{setting.title}</span>
              {setting.type === "BOOLEAN" ? (
                <span className="flex items-center gap-3 rounded-md border border-slate-200 bg-white/80 px-4 py-3 font-normal">
                  <input name={setting.key} type="checkbox" defaultChecked={visualSettings[setting.key] === "true"} />
                  Aktif
                </span>
              ) : setting.key === "whatsappButtonVariant" ? (
                <select name={setting.key} defaultValue={visualSettings[setting.key]} className="rounded-md border border-slate-300 px-4 py-3 font-normal outline-none focus:border-[#0f766e]">
                  <option value="text">Metin</option>
                  <option value="image">Görsel rozet</option>
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
              <span className="text-xs font-normal leading-5 text-slate-500">{setting.description}</span>
            </label>
          ))}
          <div className="md:col-span-2 xl:col-span-3">
            <button className="premium-cta px-5 py-3 text-sm font-black">Görsel ayarları kaydet</button>
          </div>
        </form>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <form action={createAdPlacementAction} className="glass-card rounded-lg p-6 shadow-sm">
          <input type="hidden" name="locale" value={locale} />
          <h2 className="text-xl font-black text-[#152033]">Reklam / bilgi alanı ekle</h2>
          <div className="mt-4 grid gap-3">
            <input name="slot" placeholder="home_top, trade_top, trade_right, trade_bottom" className="rounded-md border border-slate-300 px-4 py-3" />
            <input name="title" placeholder="Başlık" className="rounded-md border border-slate-300 px-4 py-3" />
            <textarea name="body" rows={4} placeholder="Metin" className="rounded-md border border-slate-300 px-4 py-3" />
            <input name="linkUrl" placeholder="Bağlantı adresi" className="rounded-md border border-slate-300 px-4 py-3" />
            <input name="linkLabel" placeholder="Bağlantı etiketi" className="rounded-md border border-slate-300 px-4 py-3" />
            <input name="displaySeconds" type="number" defaultValue={8} className="rounded-md border border-slate-300 px-4 py-3" />
            <input name="priority" type="number" defaultValue={0} className="rounded-md border border-slate-300 px-4 py-3" />
            <label className="flex gap-3 text-sm text-slate-700"><input name="isActive" type="checkbox" defaultChecked /> Aktif</label>
            <button className="premium-action px-5 py-3 text-sm font-black">Kaydet</button>
          </div>
        </form>

        <form action={upsertManagedContentAction} className="glass-card rounded-lg p-6 shadow-sm">
          <input type="hidden" name="locale" value={locale} />
          <h2 className="text-xl font-black text-[#152033]">Yönetilebilir içerik</h2>
          <div className="mt-4 grid gap-3">
            <input name="code" placeholder="Sayfa kodu" className="rounded-md border border-slate-300 px-4 py-3" />
            <input name="title" placeholder="Başlık" className="rounded-md border border-slate-300 px-4 py-3" />
            <textarea name="body" rows={7} placeholder="İçerik" className="rounded-md border border-slate-300 px-4 py-3" />
            <label className="flex gap-3 text-sm text-slate-700"><input name="isActive" type="checkbox" defaultChecked /> Aktif</label>
            <button className="premium-action px-5 py-3 text-sm font-black">İçeriği kaydet</button>
          </div>
        </form>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <AdminList title="Reklam alanları">
          {ads.map((ad) => (
            <div key={ad.id} className="rounded-md border border-slate-200 bg-white p-4">
              <p className="font-black text-[#152033]">{ad.slot} - {ad.title}</p>
              <p className="mt-1 text-sm text-slate-600">{ad.body}</p>
              <form action={toggleAdPlacementAction} className="mt-3">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="id" value={ad.id} />
                <input type="hidden" name="nextActive" value={String(!ad.isActive)} />
                <button className="rounded-md border border-slate-300 px-3 py-2 text-xs font-black">{ad.isActive ? "Pasifleştir" : "Aktifleştir"}</button>
              </form>
            </div>
          ))}
        </AdminList>
        <AdminList title="İçerik sayfaları">
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
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f5a623]">Yarışma yönetimi</p>
          <h2 className="mt-2 text-xl font-black">Yarışma Dönemleri</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Haftalık, aylık, 3 aylık, 6 aylık ve yıllık sıralamalar bu dönemlere göre hesaplanır.
          </p>
        </div>
        <div className="grid gap-6 p-6 lg:grid-cols-[0.9fr_1.1fr]">
          <form action={createCompetitionPeriodAction} className="rounded-lg border border-white/10 bg-white/[0.04] p-5">
            <input type="hidden" name="locale" value={locale} />
            <h3 className="text-lg font-black">Yeni dönem oluştur</h3>
            <div className="mt-4 grid gap-3">
              <label className="grid gap-2 text-sm font-bold text-slate-200">
                Tür
                <select name="type" defaultValue="WEEKLY" className="rounded-md border border-white/10 bg-black/30 px-4 py-3 font-normal text-white">
                  {competitionPeriodTypes.map((type) => (
                    <option key={type} value={type}>
                      {competitionPeriodLabels[type]}
                    </option>
                  ))}
                </select>
              </label>
              <input name="name" placeholder="Örn. 2026 Mayıs Haftalık Yarışması" className="rounded-md border border-white/10 bg-black/30 px-4 py-3 text-white" />
              <label className="grid gap-2 text-sm font-bold text-slate-200">
                Başlangıç
                <input name="startsAt" type="datetime-local" className="rounded-md border border-white/10 bg-black/30 px-4 py-3 font-normal text-white" />
              </label>
              <label className="grid gap-2 text-sm font-bold text-slate-200">
                Bitiş
                <input name="endsAt" type="datetime-local" className="rounded-md border border-white/10 bg-black/30 px-4 py-3 font-normal text-white" />
              </label>
              <label className="flex gap-3 text-sm text-slate-200">
                <input name="isActive" type="checkbox" defaultChecked /> Aktif
              </label>
              <button className="premium-cta px-5 py-3 text-sm font-black">Dönemi kaydet</button>
            </div>
          </form>

          <div className="grid content-start gap-4">
            <form action={awardLeaderBadgesAction} className="rounded-lg border border-[#f5a623]/40 bg-[#f5a623]/10 p-5">
              <input type="hidden" name="locale" value={locale} />
              <h3 className="font-black">Haftalık/Aylık lider rozetleri</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Aktif haftalık ve aylık dönemlerde 1. sıradaki kullanıcıya ilgili lider rozetini verir.
              </p>
              <button className="mt-4 rounded-md border border-[#f5a623] px-4 py-2 text-xs font-black text-[#f5a623] hover:bg-[#f5a623] hover:text-[#101827]">
                Lider rozetlerini ver
              </button>
            </form>

            <div className="grid gap-3">
              {competitionPeriods.length === 0 ? (
                <p className="rounded-md bg-black/25 p-4 text-sm text-slate-300">Henüz yarışma dönemi oluşturulmadı.</p>
              ) : (
                competitionPeriods.map((period) => (
                  <div key={period.id} className="rounded-md border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-black">{period.name}</p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-[#f5a623]">
                          {competitionPeriodLabels[period.type]}
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
                          {period.isActive ? "Pasifleştir" : "Aktifleştir"}
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
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f5a623]">Başarı sistemi</p>
            <h2 className="mt-2 text-xl font-black">Rozet listesi</h2>
          </div>
          <p className="text-sm text-slate-300">{badges.length} rozet</p>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {badges.map((badge) => (
            <div key={badge.id} className="rounded-md border border-white/10 bg-white/[0.04] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-2xl text-[#f5a623]">{badge.icon}</p>
                  <h3 className="mt-2 font-black">{badge.nameTr}</h3>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{badge.code}</p>
                </div>
                <span className={badge.isActive ? "text-xs font-black text-[#f5a623]" : "text-xs font-black text-slate-500"}>
                  {badge.isActive ? "Aktif" : "Pasif"}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">{badge.descriptionTr}</p>
              <form action={toggleBadgeAction} className="mt-4">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="id" value={badge.id} />
                <input type="hidden" name="nextActive" value={String(!badge.isActive)} />
                <button className="rounded-md border border-[#f5a623] px-3 py-2 text-xs font-black text-[#f5a623] hover:bg-[#f5a623] hover:text-[#101827]">
                  {badge.isActive ? "Pasifleştir" : "Aktifleştir"}
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
