import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { getSafeLocale } from "@/i18n/config";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/portfolio";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  return {
    ...buildPageMetadata({
    locale,
    path: "/haftalik-liderler",
    page: "weeklyLeaders",
    keywords: locale === "tr"
      ? ["haftalık liderler", "Rotaryen sanal portföy yarışması", "haftalık kazanç liderleri", "toplam portföy liderleri"]
      : ["weekly leaders", "Rotary virtual portfolio competition", "weekly gain leaders", "overall portfolio leaders"],
    }),
    robots: { index: false, follow: false },
  };
}

export default async function WeeklyLeadersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect(`/${locale}/giris`);
  }
  const isEnglish = locale === "en";
  const publications = await prisma.weeklyCompetitionPublication.findMany({
    orderBy: { publishedAt: "desc" },
    take: 24,
    include: {
      rows: {
        orderBy: [{ scope: "asc" }, { rank: "asc" }],
      },
    },
  });

  return (
    <div className="grid gap-6">
      <PageHeader
        title={isEnglish ? "Weekly Rotary Portfolio Leaders Archive" : "Haftalık Rotaryen Portföy Liderleri Arşivi"}
        description={isEnglish
          ? "Review the Monday 07:00 leaderboards for weekly gains, overall portfolio gains, and community-based market literacy progress."
          : "Pazartesi 07.00 yayınlanan haftalık kazanç, toplam portföy liderliği ve topluluk bazlı finansal okuryazarlık ilerlemesini geriye dönük inceleyin."}
        locale={locale}
      />

      <div className="flex flex-wrap gap-3">
        <Link href={`/${locale}/liderlik-tablosu`} className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-black text-[#152033] hover:border-[#0f766e]">
          {isEnglish ? "Overall leaderboard" : "Genel liderlik tablosu"}
        </Link>
        <Link href={`/${locale}/ligler`} className="premium-cta px-4 py-2 text-sm font-black">
          {isEnglish ? "Open leagues" : "Ligleri aç"}
        </Link>
      </div>

      {publications.length === 0 ? (
        <section className="premium-card p-6">
          <h2 className="text-xl font-black text-[#152033]">{isEnglish ? "No weekly publication yet" : "Henüz haftalık yayın yok"}</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            {isEnglish
              ? "The first archive item will appear after the weekly publication job runs."
              : "Haftalık yayın görevi ilk kez çalıştıktan sonra arşiv burada görünecek."}
          </p>
        </section>
      ) : (
        publications.map((publication) => {
          const weeklyRows = publication.rows.filter((row) => row.scope === "WEEKLY_GAIN").slice(0, 3);
          const totalRows = publication.rows.filter((row) => row.scope === "TOTAL_GAIN").slice(0, 3);

          return (
            <article key={publication.id} className="premium-card p-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">{publication.periodKey}</p>
                  <h2 className="mt-1 text-2xl font-black text-[#152033]">
                    {formatWeekRange(publication.startsAt, publication.endsAt, locale)}
                  </h2>
                </div>
                <p className="text-sm font-bold text-slate-500">
                  {new Intl.DateTimeFormat(isEnglish ? "en-US" : "tr-TR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Europe/Istanbul",
                  }).format(publication.publishedAt)}
                </p>
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <RankingPanel title={isEnglish ? "Weekly gain leaders" : "Haftalık kazanç liderleri"} rows={weeklyRows} locale={locale} />
                <RankingPanel title={isEnglish ? "Overall gain leaders" : "Toplam kazanç liderleri"} rows={totalRows} locale={locale} />
              </div>
              {publication.note ? (
                <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                  {getPublicationNote(publication.note, locale)}
                </p>
              ) : null}
            </article>
          );
        })
      )}
    </div>
  );
}

function RankingPanel({ title, rows, locale }: { title: string; rows: Array<{ id: string; rank: number; displayName: string; valueUsd: number; returnPercent: number }>; locale: "tr" | "en" }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-4 py-3">
        <h3 className="text-sm font-black uppercase tracking-[0.12em] text-[#8a6a5d]">{title}</h3>
      </div>
      <div className="mt-3 grid gap-2">
        {rows.length === 0 ? (
          <p className="px-4 pb-4 text-sm text-slate-500">{locale === "tr" ? "Bu dönem için sonuç yok." : "No result for this period."}</p>
        ) : rows.map((row) => (
          <div key={row.id} className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 last:border-b-0">
            <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-black ${row.rank === 1 ? "bg-[#101827] text-[#f5c96b]" : "bg-slate-100 text-slate-700"}`}>#{row.rank}</span>
            <span className="truncate text-sm font-black text-[#152033]">{row.displayName}</span>
            <span className="text-right">
              <span className={`block text-sm font-black ${row.returnPercent >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                {row.returnPercent >= 0 ? "+" : ""}{row.returnPercent.toFixed(2)}%
              </span>
              <span className="mt-0.5 block text-[11px] font-bold text-slate-500">{formatMoney(row.valueUsd)}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatWeekRange(start: Date, end: Date, locale: "tr" | "en") {
  const formatter = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "tr-TR", {
    day: "2-digit",
    month: "short",
    timeZone: "Europe/Istanbul",
  });
  const inclusiveEnd = new Date(end.getTime() - 86_400_000);

  return `${formatter.format(start)} - ${formatter.format(inclusiveEnd)}`;
}

function getPublicationNote(note: string, locale: "tr" | "en") {
  if (locale !== "en") {
    return note;
  }

  if (note.includes("canlı portföy") || note.includes("geçici görünüm")) {
    return "This temporary view is calculated from live portfolio and recent trade data. Archived results are shown after the first persisted weekly publication.";
  }

  if (note.includes("Haftalık liste") || note.includes("genel liste")) {
    return "Two lists were published for this period. The weekly list shows the contribution of last week's virtual trades at current prices, while the overall list shows total portfolio profit.";
  }

  return "Weekly leaderboard publication note.";
}
