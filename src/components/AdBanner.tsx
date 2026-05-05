import type { DisplayAd } from "@/lib/ads";

type AdBannerProps = {
  ads: DisplayAd[];
  variant?: "top" | "side" | "bottom";
};

export function AdBanner({ ads, variant = "top" }: AdBannerProps) {
  const firstAd = ads[0];
  const totalSeconds = ads.reduce((sum, ad) => sum + ad.displaySeconds, 0);

  return (
    <section
      className={`ad-visual rounded-lg border border-amber-200/80 p-4 text-amber-950 shadow-sm backdrop-blur ${
        variant === "side" ? "min-h-56" : ""
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">Reklam / Bilgi Alanı</p>
          <h2 className="mt-2 text-lg font-black">{firstAd.title}</h2>
          <p className="mt-1 text-sm leading-6">{firstAd.body}</p>
        </div>
        <div className="shrink-0 text-xs font-bold text-amber-700">
          {ads.length} içerik · {totalSeconds} sn döngü
        </div>
      </div>
    </section>
  );
}
