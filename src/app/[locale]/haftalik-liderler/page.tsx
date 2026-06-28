import Link from "next/link";
import type { Metadata } from "next";
import { PageHeader } from "@/components/PageHeader";
import { getSafeLocale } from "@/i18n/config";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/portfolio";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  return buildPageMetadata({
    locale,
    path: "/haftalik-liderler",
    page: "weeklyLeaders",
    keywords: locale === "tr"
      ? ["haftalık liderler", "Rotaryen sanal portföy yarışması", "haftalık kazanç liderleri", "toplam portföy liderleri"]
      : ["weekly leaders", "Rotary virtual portfolio competition", "weekly gain leaders", "overall portfolio leaders"],
  });
}

export default async function WeeklyLeadersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
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
                <RankingPanel title={isEnglish ? "Weekly gain leaders" : "Haftalık kazanç liderleri"} rows={weeklyRows} />
                <RankingPanel title={isEnglish ? "Overall gain leaders" : "Toplam kazanç liderleri"} rows={totalRows} />
              </div>
              {publication.note ? <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-500">{publication.note}</p> : null}
            </article>
          );
        })
      )}
    </div>
  );
}

function RankingPanel({ title, rows }: { title: string; rows: Array<{ id: string; rank: number; displayName: string; valueUsd: number; returnPercent: number }> }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-black uppercase tracking-[0.12em] text-[#8a6a5d]">{title}</h3>
      <div className="mt-3 grid gap-2">
        {rows.map((row) => (
          <div key={row.id} className="grid grid-cols-[48px_1fr_auto] items-center gap-3 rounded-lg bg-white p-3 shadow-sm">
            <span className="text-xl font-black text-[#f5a623]">#{row.rank}</span>
            <span className="truncate text-sm font-black text-[#152033]">{row.displayName}</span>
            <span className={row.valueUsd >= 0 ? "text-sm font-black text-[#0f766e]" : "text-sm font-black text-red-600"}>
              {formatMoney(row.valueUsd)}
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
