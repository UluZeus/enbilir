import type { PublicManagedContentItem } from "@/lib/managed-content";

type ManagedContentListProps = {
  items: PublicManagedContentItem[];
  emptyTitle?: string;
  emptyBody?: string;
  featuredLabel?: string;
  variant?: "grid" | "compact";
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

    if (host === "vimeo.com") {
      const videoId = parsed.pathname.replace("/", "");
      return videoId ? `https://player.vimeo.com/video/${videoId}` : url;
    }
  } catch {
    return url;
  }

  return url;
}

function paragraphs(body: string) {
  return body
    .split(/\n{2,}/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function MediaPreview({ item }: { item: PublicManagedContentItem }) {
  if (item.videoUrl) {
    const embedUrl = getVideoEmbedUrl(item.videoUrl);
    const isDirectVideo = /\.(mp4|webm|ogg|ogv|mov)(\?.*)?$/i.test(item.videoUrl);

    return isDirectVideo ? (
      <video className="aspect-video w-full rounded-md border border-slate-200 bg-slate-950 object-cover" src={item.videoUrl} controls />
    ) : (
      <iframe
        className="aspect-video w-full rounded-md border border-slate-200 bg-slate-950"
        src={embedUrl}
        title={item.title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    );
  }

  if (item.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Admin media can point to arbitrary public hosts.
      <img
        src={item.imageUrl}
        alt={item.title}
        className="aspect-[16/9] w-full rounded-md border border-slate-200 object-cover"
      />
    );
  }

  return null;
}

export function ManagedContentList({ items, emptyTitle, emptyBody, featuredLabel = "Featured", variant = "grid" }: ManagedContentListProps) {
  if (items.length === 0) {
    if (!emptyTitle && !emptyBody) {
      return null;
    }

    return (
      <section className="premium-card premium-card--interactive p-6 shadow-sm">
        {emptyTitle ? <h2 className="text-xl font-black text-[#152033]">{emptyTitle}</h2> : null}
        {emptyBody ? <p className="mt-2 text-sm leading-6 text-slate-600">{emptyBody}</p> : null}
      </section>
    );
  }

  return (
    <section className={variant === "compact" ? "grid gap-4" : "grid gap-4 md:grid-cols-2 xl:grid-cols-3"}>
      {items.map((item) => (
        <article key={item.id} className="premium-card premium-card--interactive overflow-hidden p-5 shadow-sm">
          <MediaPreview item={item} />
          <div className={item.imageUrl || item.videoUrl ? "mt-4" : ""}>
            {item.isFeatured ? (
              <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">{featuredLabel}</p>
            ) : null}
            <h2 className="text-xl font-black text-[#152033]">{item.title}</h2>
            {item.excerpt ? <p className="mt-2 text-sm font-bold leading-6 text-slate-600">{item.excerpt}</p> : null}
            <div className="mt-3 grid gap-2 text-sm leading-6 text-slate-600">
              {paragraphs(item.body).map((paragraph, index) => (
                <p key={`${index}-${paragraph}`}>{paragraph}</p>
              ))}
            </div>
            {item.linkUrl ? (
              <a
                href={item.linkUrl}
                target={item.linkUrl.startsWith("/") ? undefined : "_blank"}
                rel={item.linkUrl.startsWith("/") ? undefined : "noreferrer"}
                className="premium-action mt-4 inline-flex px-4 py-2 text-xs font-black"
              >
                {item.linkLabel || "Detay"}
              </a>
            ) : null}
          </div>
        </article>
      ))}
    </section>
  );
}
