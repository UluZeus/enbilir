import type { DisplayAd } from "@/lib/ads";

type AdBannerProps = {
  ads: DisplayAd[];
  variant?: "top" | "side" | "bottom";
};

function getVideoEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtube.com" || host === "m.youtube.com") {
      const videoId = parsed.searchParams.get("v");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    }

    if (host === "youtu.be") {
      const videoId = parsed.pathname.replace("/", "");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
    }
  } catch {
    return url;
  }

  return url;
}

function AdMedia({ ad }: { ad: DisplayAd }) {
  if (ad.videoUrl) {
    const isDirectVideo = /\.(mp4|webm|ogg|ogv|mov)(\?.*)?$/i.test(ad.videoUrl);

    return isDirectVideo ? (
      <video className="aspect-video w-full rounded-md border border-amber-200 bg-slate-950 object-cover" src={ad.videoUrl} controls />
    ) : (
      <iframe
        className="aspect-video w-full rounded-md border border-amber-200 bg-slate-950"
        src={getVideoEmbedUrl(ad.videoUrl)}
        title={ad.title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    );
  }

  if (ad.imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- Admin media can point to arbitrary public hosts.
    return <img src={ad.imageUrl} alt={ad.title} className="aspect-[16/9] w-full rounded-md border border-amber-200 object-cover" />;
  }

  return null;
}

export function AdBanner({ ads, variant = "top" }: AdBannerProps) {
  const firstAd = ads[0];
  const totalSeconds = ads.reduce((sum, ad) => sum + ad.displaySeconds, 0);

  if (!firstAd) {
    return null;
  }

  return (
    <section
      className={`ad-visual rounded-lg border border-amber-200/80 p-4 text-amber-950 shadow-sm backdrop-blur ${
        variant === "side" ? "min-h-56" : ""
      }`}
    >
      <div className={`grid gap-4 ${variant === "side" ? "" : "md:grid-cols-[minmax(0,1fr)_minmax(220px,0.36fr)] md:items-center"}`}>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">Reklam / Bilgi Alanı</p>
          <h2 className="mt-2 text-lg font-black">{firstAd.title}</h2>
          <p className="mt-1 text-sm leading-6">{firstAd.body}</p>
          {firstAd.linkUrl ? (
            <a
              href={firstAd.linkUrl}
              target={firstAd.linkUrl.startsWith("/") ? undefined : "_blank"}
              rel={firstAd.linkUrl.startsWith("/") ? undefined : "noreferrer"}
              className="mt-3 inline-flex rounded-md border border-amber-700/30 bg-white/55 px-3 py-2 text-xs font-black text-amber-800 hover:bg-white"
            >
              {firstAd.linkLabel || "Detay"}
            </a>
          ) : null}
        </div>
        <div className={variant === "side" ? "grid gap-3" : "grid gap-3 md:justify-items-end"}>
          <AdMedia ad={firstAd} />
          <div className="shrink-0 text-xs font-bold text-amber-700">
            {ads.length} içerik · {totalSeconds} sn döngü
          </div>
        </div>
      </div>
    </section>
  );
}
