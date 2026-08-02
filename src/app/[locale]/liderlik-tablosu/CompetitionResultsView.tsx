import Link from "next/link";
import type {
  CompetitionPeriodResult,
  ViewerLeagueCompetitionResult,
} from "@/lib/competition-results";
import type { PortfolioPeriodKey } from "@/lib/portfolio-history";

type CompetitionResultsViewProps = {
  locale: "tr" | "en";
  periods: CompetitionPeriodResult[];
  selectedPeriodKey: PortfolioPeriodKey;
  leagues: ViewerLeagueCompetitionResult[];
};

const periodLabels: Record<"tr" | "en", Record<PortfolioPeriodKey, string>> = {
  tr: {
    DAILY: "Günlük",
    WEEKLY: "Haftalık",
    MONTHLY: "Aylık",
    QUARTERLY: "3 aylık",
    SEMI_ANNUAL: "6 aylık",
    YEARLY: "Yıllık",
  },
  en: {
    DAILY: "Daily",
    WEEKLY: "Weekly",
    MONTHLY: "Monthly",
    QUARTERLY: "3 months",
    SEMI_ANNUAL: "6 months",
    YEARLY: "Yearly",
  },
};

const competitionPeriodKeys = new Set<PortfolioPeriodKey>([
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "QUARTERLY",
  "SEMI_ANNUAL",
  "YEARLY",
]);

export function resolveCompetitionPeriodKey(value: string | string[] | undefined): PortfolioPeriodKey {
  const candidate = typeof value === "string" ? value.toUpperCase() : "";
  return competitionPeriodKeys.has(candidate as PortfolioPeriodKey)
    ? candidate as PortfolioPeriodKey
    : "WEEKLY";
}

export function resolveCompetitionPage(value: string | string[] | undefined): number {
  if (typeof value !== "string" || !/^[0-9]+$/.test(value)) return 1;

  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

export function CompetitionResultsView({
  locale,
  periods,
  selectedPeriodKey,
  leagues,
}: CompetitionResultsViewProps) {
  const isEnglish = locale === "en";
  const selectedPeriod = periods.find((period) => period.key === selectedPeriodKey) ?? periods[0];

  if (!selectedPeriod) {
    return (
      <section className="premium-card p-6" role="status">
        <h2 className="text-xl font-black text-[#152033]">
          {isEnglish ? "Competition data is not available" : "Yarışma verisi kullanılamıyor"}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {isEnglish ? "Please try again later." : "Lütfen daha sonra yeniden deneyin."}
        </p>
      </section>
    );
  }

  const label = periodLabels[locale][selectedPeriod.key];
  const totalExcluded = selectedPeriod.excludedCounts.partialOrMissing
    + selectedPeriod.excludedCounts.stalePrice
    + selectedPeriod.excludedCounts.unreliable;

  return (
    <div className="grid min-w-0 gap-6">
      <section aria-labelledby="period-summaries-title">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">
              {isEnglish ? "Compare periods" : "Dönemleri karşılaştır"}
            </p>
            <h2 id="period-summaries-title" className="mt-1 text-2xl font-black text-[#152033]">
              {isEnglish ? "Live period summaries" : "Canlı dönem özetleri"}
            </h2>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            {isEnglish
              ? "Data source: live period view, using only complete coverage and verified prices. Finalized archives are separate."
              : "Veri kaynağı: canlı dönem görünümü, yalnız tam kapsam ve doğrulanmış fiyat. Kesinleşmiş arşiv ayrıdır."}
          </p>
        </div>

        <div className="mt-4 grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {periods.map((period) => (
            <PeriodSummaryCard
              key={period.key}
              locale={locale}
              period={period}
              selected={period.key === selectedPeriod.key}
            />
          ))}
        </div>
      </section>

      <section className="premium-card min-w-0 p-5 sm:p-6" aria-labelledby="selected-period-title">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a6a5d]">
              {isEnglish ? "Selected period" : "Seçili dönem"}
            </p>
            <h2 id="selected-period-title" className="mt-1 text-2xl font-black text-[#152033]">
              {label} {isEnglish ? "results" : "sonuçları"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {formatPeriodRange(selectedPeriod.rangeStartsAt, selectedPeriod.valuationAsOf, locale)}
            </p>
          </div>
          <Link
            href={`/${locale}/haftalik-liderler`}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#0f766e] bg-white px-4 py-2 text-center text-sm font-black text-[#0f766e] outline-none hover:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-[#0f766e] focus-visible:ring-offset-2"
          >
            {isEnglish ? "Open finalized weekly archive" : "Kesinleşmiş haftalık arşivi aç"}
          </Link>
        </div>

        {selectedPeriod.viewerRow ? (
          <div className="mt-5 grid min-w-0 gap-4 sm:grid-cols-2">
            <article className="min-w-0 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0f766e]">
                {isEnglish ? "Your position" : "Senin durumun"}
              </p>
              <p className="mt-3 break-words text-3xl font-black tabular-nums text-[#152033]">
                #{selectedPeriod.viewerRow.rank}
                <span className="ml-2 text-sm text-slate-600">/ {selectedPeriod.totalRankedParticipants}</span>
              </p>
              <dl className="mt-3 grid gap-2 text-sm text-slate-700">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <dt className="font-bold text-slate-600">{isEnglish ? "Your return" : "Getirin"}</dt>
                  <dd className="font-black tabular-nums">{formatReturn(selectedPeriod.viewerRow.returnPercent, locale)}</dd>
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <dt className="font-bold text-slate-600">{isEnglish ? "Leader return" : "Lider getirisi"}</dt>
                  <dd className="font-black tabular-nums">{selectedPeriod.leaderReturnPercent === null ? "—" : formatReturn(selectedPeriod.leaderReturnPercent, locale)}</dd>
                </div>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <dt className="font-bold text-slate-600">{isEnglish ? "Difference from leader" : "Liderle fark"}</dt>
                  <dd className="font-black tabular-nums">
                    {selectedPeriod.leaderReturnPercent === null
                      ? "—"
                      : formatReturn(selectedPeriod.viewerRow.returnPercent - selectedPeriod.leaderReturnPercent, locale)}
                  </dd>
                </div>
              </dl>
              <p className="mt-1 break-words text-xs font-bold uppercase tracking-[0.12em] text-[#0f766e]">
                {isEnglish ? "You" : "Sen"} · {selectedPeriod.viewerRow.displayName}
              </p>
              {selectedPeriod.viewerPage && selectedPeriod.viewerPage !== selectedPeriod.page ? (
                <Link
                  href={getLeaderboardHref(locale, selectedPeriod.key, selectedPeriod.viewerPage)}
                  className="mt-4 inline-flex min-h-11 items-center text-sm font-black text-[#0f766e] outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] focus-visible:ring-offset-2"
                >
                  {isEnglish ? "Open my place" : "Sıramı aç"} →
                </Link>
              ) : null}
            </article>
            <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8a6a5d]">
                {isEnglish ? "Your virtual portfolio P/L" : "Sanal portföy K/Z'n"}
              </p>
              <p
                data-private-money="profit-loss"
                className="mt-3 break-all text-2xl font-black tabular-nums text-[#152033] sm:text-3xl"
              >
                {formatSignedUsd(selectedPeriod.viewerRow.changeUsd, locale)}
              </p>
              <p className="mt-2 text-sm font-bold text-slate-600">
                {isEnglish ? "Current value" : "Güncel değer"}:{" "}
                <span data-private-money="current-value" className="break-all tabular-nums">
                  {formatUsd(selectedPeriod.viewerRow.valueUsd, locale)}
                </span>
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                {isEnglish
                  ? "USD values are private to you and are not shown for other participants."
                  : "USD değerleri yalnız sana özeldir; diğer katılımcılar için gösterilmez."}
              </p>
            </article>
          </div>
        ) : (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5" role="status">
            <p className="font-black text-amber-950">
              {isEnglish
                ? "You are not ranked for this period yet."
                : "Bu dönem için henüz sıralamada değilsin."}
            </p>
            <p className="mt-1 text-sm leading-6 text-amber-900">
              {isEnglish
                ? "A complete period history and a verified current price are required."
                : "Tam dönem geçmişi ve doğrulanmış güncel fiyat gerekir."}
            </p>
          </div>
        )}

        {totalExcluded > 0 ? (
          <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600" role="status">
            {getExcludedMessage(selectedPeriod, locale)}
          </p>
        ) : null}
      </section>

      <LeagueResults locale={locale} leagues={leagues} />
      <OverallStandings locale={locale} period={selectedPeriod} />
    </div>
  );
}

function PeriodSummaryCard({
  locale,
  period,
  selected,
}: {
  locale: "tr" | "en";
  period: CompetitionPeriodResult;
  selected: boolean;
}) {
  const isEnglish = locale === "en";
  const cardId = `period-summary-${period.key.toLowerCase()}`;

  return (
    <article aria-labelledby={cardId} className={`min-w-0 rounded-2xl border bg-white p-4 shadow-sm ${selected ? "border-[#0f766e] ring-2 ring-[#0f766e]/20" : "border-slate-200"}`}>
      <Link
        href={getLeaderboardHref(locale, period.key, 1)}
        aria-current={selected ? "page" : undefined}
        aria-label={isEnglish ? `Open ${periodLabels.en[period.key]} results` : `${periodLabels.tr[period.key]} sonuçlarını aç`}
        className="flex min-h-11 min-w-0 items-center justify-between gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] focus-visible:ring-offset-2"
      >
        <span id={cardId} className="min-w-0 break-words text-lg font-black text-[#152033]">{periodLabels[locale][period.key]}</span>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black ${selected ? "bg-[#0f766e] text-white" : "bg-slate-100 text-slate-600"}`}>
          {selected ? (isEnglish ? "Selected" : "Seçili") : `${period.requestedDays} ${isEnglish ? "days" : "gün"}`}
        </span>
      </Link>

      {period.totalRankedParticipants === 0 ? (
        <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600">
          {getEmptyPeriodMessage(locale)}
        </p>
      ) : (
        <div className="mt-4 grid min-w-0 gap-4">
          <SummaryList
            title={isEnglish ? "Top three" : "İlk üç"}
            rows={period.topRows}
            locale={locale}
            headingId={`${cardId}-top`}
            listKind="top"
          />
          <SummaryList
            title={isEnglish ? "Last three" : "Son üç"}
            rows={period.bottomRows}
            locale={locale}
            headingId={`${cardId}-bottom`}
            listKind="bottom"
          />
        </div>
      )}
    </article>
  );
}

function SummaryList({
  title,
  rows,
  locale,
  headingId,
  listKind,
}: {
  title: string;
  rows: CompetitionPeriodResult["topRows"];
  locale: "tr" | "en";
  headingId: string;
  listKind: "top" | "bottom";
}) {
  return (
    <div className="min-w-0">
      <h3 id={headingId} className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">{title}</h3>
      <ol aria-labelledby={headingId} data-summary-list={listKind} className="mt-2 grid min-w-0 gap-1.5">
        {rows.map((row, index) => (
          <li key={`${row.rank}-${row.displayName}-${index}`} className={`grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${row.isViewer ? "bg-emerald-50 ring-1 ring-inset ring-emerald-200" : "bg-slate-50"}`}>
            <span className="whitespace-nowrap font-black tabular-nums text-slate-600">#{row.rank}</span>
            <span className="min-w-0 break-words font-bold text-[#152033]">
              {row.displayName}{row.isViewer ? <span className="ml-1 text-[10px] font-black uppercase text-[#0f766e]">({locale === "en" ? "You" : "Sen"})</span> : null}
            </span>
            <span className="whitespace-nowrap text-xs font-black tabular-nums text-slate-700">{formatPercent(row.returnPercent, locale)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function LeagueResults({ locale, leagues }: { locale: "tr" | "en"; leagues: ViewerLeagueCompetitionResult[] }) {
  const isEnglish = locale === "en";

  return (
    <section className="premium-card min-w-0 p-5 sm:p-6" aria-labelledby="league-results-title">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">
        {isEnglish ? "Your communities" : "Toplulukların"}
      </p>
      <h2 id="league-results-title" className="mt-1 text-2xl font-black text-[#152033]">
        {isEnglish ? "Your places in active leagues" : "Aktif liglerdeki sıran"}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
        {isEnglish
          ? "Only your own place is shown here. Open a league for its detailed standings."
          : "Burada yalnız kendi sıran gösterilir. Ayrıntılı sıralama için ligi aç."}
      </p>

      {leagues.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-sm font-bold text-slate-600">
            {isEnglish ? "You are not a member of an active league yet." : "Henüz aktif bir ligde değilsin."}
          </p>
          <Link href={`/${locale}/ligler`} className="mt-3 inline-flex min-h-11 items-center text-sm font-black text-[#0f766e] outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] focus-visible:ring-offset-2">
            {isEnglish ? "Explore leagues" : "Ligleri keşfet"} →
          </Link>
        </div>
      ) : (
        <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {leagues.map((league) => (
            <article key={league.id} className="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="break-words text-lg font-black text-[#152033]">{league.name}</h3>
              {league.rank === null ? (
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {isEnglish ? "Not ranked in this period" : "Bu dönem sıralama dışında"}
                </p>
              ) : (
                <dl data-league-metrics className="mt-3 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="min-w-0">
                    <dt className="text-xs font-bold text-slate-500">{isEnglish ? "Your place" : "Sıran"}</dt>
                    <dd data-league-metric="rank" className="mt-1 break-all text-xl font-black tabular-nums text-[#152033]">{league.rank} / {league.totalRankedMembers}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-xs font-bold text-slate-500">{isEnglish ? "Your return" : "Getirin"}</dt>
                    <dd data-league-metric="return" className="mt-1 break-all text-base font-black tabular-nums text-slate-700">
                      {league.viewerReturnPercent === null ? "—" : formatPercent(league.viewerReturnPercent, locale)}
                    </dd>
                  </div>
                </dl>
              )}
              <Link href={`/${locale}/ligler/${league.slug}`} className="mt-4 inline-flex min-h-11 items-center text-sm font-black text-[#0f766e] outline-none focus-visible:ring-2 focus-visible:ring-[#0f766e] focus-visible:ring-offset-2">
                {isEnglish ? "Open league details" : "Lig ayrıntılarını aç"} →
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function OverallStandings({ locale, period }: { locale: "tr" | "en"; period: CompetitionPeriodResult }) {
  const isEnglish = locale === "en";

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="overall-standings-title">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-5">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#0f766e]">
          {isEnglish ? "Verified participants" : "Doğrulanmış katılımcılar"}
        </p>
        <h2 id="overall-standings-title" className="mt-1 text-xl font-black text-[#152033]">
          {isEnglish ? "Overall standings" : "Genel sıralama"} · {period.totalRankedParticipants}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {isEnglish
            ? "Only accounts with at least one completed virtual trade are included."
            : "Yalnız en az bir tamamlanmış sanal işlem yapmış hesaplar dahildir."}
        </p>
      </div>

      {period.totalRankedParticipants === 0 ? (
        <div className="p-5" role="status">
          <p className="font-black text-[#152033]">
            {getEmptyPeriodMessage(locale)}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {isEnglish
              ? "The live list will appear when complete coverage and verified current prices are available."
              : "Tam kapsam ve doğrulanmış güncel fiyat oluştuğunda canlı liste burada görünür."}
          </p>
        </div>
      ) : (
        <>
          <div className="hidden lg:block">
            <table className="w-full table-fixed border-collapse text-left">
              <caption className="sr-only">
                {isEnglish
                  ? `${periodLabels.en[period.key]} overall competition standings`
                  : `${periodLabels.tr[period.key]} genel yarışma sıralaması`}
              </caption>
              <thead className="border-b border-slate-200 text-xs font-black uppercase tracking-[0.1em] text-slate-500">
                <tr>
                  <th scope="col" className="w-28 px-5 py-3">{isEnglish ? "Rank" : "Sıra"}</th>
                  <th scope="col" className="px-5 py-3">{isEnglish ? "Participant" : "Katılımcı"}</th>
                  <th scope="col" className="w-56 px-5 py-3 text-right">{isEnglish ? "Period return" : "Dönem getirisi"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {period.rows.map((row, index) => (
                  <tr key={`${row.rank}-${row.displayName}-${index}`} className={row.isViewer ? "bg-emerald-50" : ""}>
                    <td className="whitespace-nowrap px-5 py-4 font-black tabular-nums text-slate-600">#{row.rank}</td>
                    <th scope="row" className="min-w-0 break-words px-5 py-4 font-black text-[#152033]">
                      {row.displayName}
                      {row.isViewer ? <span className="ml-2 rounded-full bg-[#0f766e] px-2 py-1 text-[10px] font-black uppercase text-white">{isEnglish ? "You" : "Sen"}</span> : null}
                    </th>
                    <td className="whitespace-nowrap px-5 py-4 text-right font-black tabular-nums text-slate-700">{formatReturn(row.returnPercent, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ol className="divide-y divide-slate-100 lg:hidden" aria-label={isEnglish ? "Overall standings" : "Genel sıralama"}>
            {period.rows.map((row, index) => (
              <li key={`${row.rank}-${row.displayName}-${index}`} className={`min-w-0 p-4 ${row.isViewer ? "bg-emerald-50 ring-1 ring-inset ring-emerald-200" : ""}`}>
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <p className="min-w-0 break-words font-black text-[#152033]">
                    {row.displayName}
                    {row.isViewer ? <span className="ml-2 text-[10px] font-black uppercase text-[#0f766e]">({isEnglish ? "You" : "Sen"})</span> : null}
                  </p>
                  <span className="shrink-0 whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-sm font-black tabular-nums text-slate-700">#{row.rank}</span>
                </div>
                <dl className="mt-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-xs font-bold text-slate-500">{isEnglish ? "Period return" : "Dönem getirisi"}</dt>
                    <dd className="whitespace-nowrap text-sm font-black tabular-nums text-slate-700">{formatReturn(row.returnPercent, locale)}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ol>
          <LeaderboardPagination locale={locale} period={period} />
        </>
      )}
    </section>
  );
}

function LeaderboardPagination({ locale, period }: { locale: "tr" | "en"; period: CompetitionPeriodResult }) {
  const isEnglish = locale === "en";
  const pageNumbers = getPaginationPages(period.page, period.pageCount);
  const previousPage = period.page - 1;
  const nextPage = period.page + 1;

  return (
    <nav className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5" aria-label={isEnglish ? "Leaderboard pages" : "Liderlik tablosu sayfaları"}>
      <p className="text-sm font-bold tabular-nums text-slate-700">
        {period.firstRowIndex}–{period.lastRowIndex} / {period.totalRankedParticipants}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <PaginationLink locale={locale} period={period} page={1} label={isEnglish ? "First" : "İlk"} disabled={period.page === 1} />
        <PaginationLink locale={locale} period={period} page={previousPage} label={isEnglish ? "Previous" : "Önceki"} disabled={previousPage < 1} />
        {pageNumbers.map((page) => (
          <PaginationLink
            key={page}
            locale={locale}
            period={period}
            page={page}
            label={String(page)}
            current={page === period.page}
          />
        ))}
        <PaginationLink locale={locale} period={period} page={nextPage} label={isEnglish ? "Next" : "Sonraki"} disabled={nextPage > period.pageCount} />
      </div>
    </nav>
  );
}

function PaginationLink({
  locale,
  period,
  page,
  label,
  disabled = false,
  current = false,
}: {
  locale: "tr" | "en";
  period: CompetitionPeriodResult;
  page: number;
  label: string;
  disabled?: boolean;
  current?: boolean;
}) {
  const className = "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-slate-300 bg-white px-3 text-sm font-black text-[#0f766e] outline-none hover:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-[#0f766e] focus-visible:ring-offset-2";

  if (disabled || current) {
    return <span aria-current={current ? "page" : undefined} aria-disabled={disabled || undefined} className={`${className} cursor-default ${current ? "border-[#0f766e] bg-emerald-50 text-[#152033]" : "opacity-50"}`}>{label}</span>;
  }

  return <Link href={getLeaderboardHref(locale, period.key, page)} className={className}>{label}</Link>;
}

function getPaginationPages(currentPage: number, pageCount: number) {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);

  return [...new Set([1, currentPage - 1, currentPage, currentPage + 1, pageCount]
    .filter((page) => page >= 1 && page <= pageCount))];
}

function getLeaderboardHref(locale: "tr" | "en", periodKey: PortfolioPeriodKey, page: number) {
  return `/${locale}/liderlik-tablosu?donem=${periodKey}&sayfa=${page}`;
}

function formatPercent(value: number, locale: "tr" | "en") {
  const normalizedValue = value === 0 ? 0 : value;
  const absoluteValue = Math.abs(normalizedValue);

  if (absoluteValue > 0 && absoluteValue < 0.00005) {
    const threshold = locale === "en" ? "0.0001" : "0,0001";
    return normalizedValue > 0 ? `<${threshold}%` : `>-${threshold}%`;
  }

  const fractionDigits = absoluteValue > 0 && absoluteValue < 0.005 ? 4 : 2;
  return `${normalizedValue > 0 ? "+" : ""}${new Intl.NumberFormat(locale === "en" ? "en-US" : "tr-TR", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(normalizedValue)}%`;
}

function formatReturn(value: number, locale: "tr" | "en") {
  const direction = value > 0
    ? (locale === "en" ? "Increase" : "Artış")
    : value < 0
      ? (locale === "en" ? "Decrease" : "Azalış")
      : (locale === "en" ? "No change" : "Değişim yok");

  return `${formatPercent(value, locale)} · ${direction}`;
}

function formatUsd(value: number, locale: "tr" | "en") {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "tr-TR", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatSignedUsd(value: number, locale: "tr" | "en") {
  return `${value > 0 ? "+" : ""}${formatUsd(value, locale)}`;
}

function formatPeriodRange(startsAt: string, valuationAsOf: string, locale: "tr" | "en") {
  const formatter = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "tr-TR", {
    dateStyle: "medium",
    timeZone: "Europe/Istanbul",
  });
  const dateTimeFormatter = new Intl.DateTimeFormat(locale === "en" ? "en-US" : "tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  });

  return locale === "en"
    ? `${formatter.format(new Date(startsAt))} – ${dateTimeFormatter.format(new Date(valuationAsOf))}`
    : `${formatter.format(new Date(startsAt))} – ${dateTimeFormatter.format(new Date(valuationAsOf))}`;
}

function getExcludedMessage(period: CompetitionPeriodResult, locale: "tr" | "en") {
  const historyCount = period.excludedCounts.partialOrMissing;
  const stalePriceCount = period.excludedCounts.stalePrice;
  const unreliableCount = period.excludedCounts.unreliable;

  if (locale === "en") {
    return `${historyCount} portfolio(s) lack complete period history; ${stalePriceCount} portfolio(s) have a stale current price, ${unreliableCount} portfolio(s) lack a verified current price. Those values were not used in the ranking.`;
  }

  return `${historyCount} portföyde tam dönem geçmişi, ${stalePriceCount} portföyde güncel fiyat eski, ${unreliableCount} portföyde doğrulanmış güncel fiyat yok. Bu değerler sıralamada kullanılmadı.`;
}

function getEmptyPeriodMessage(locale: "tr" | "en") {
  return locale === "en"
    ? "No eligible participant has complete history for this period yet. This does not mean the period return is zero."
    : "Bu dönem için henüz tam geçmişi bulunan uygun katılımcı yok. Bu, dönem getirisinin yüzde sıfır olduğu anlamına gelmez.";
}
