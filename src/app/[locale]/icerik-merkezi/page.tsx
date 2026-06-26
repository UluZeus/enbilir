import type { Metadata } from "next";
import { ContentHubExplorer, type ContentHubItem } from "@/components/content/ContentHubExplorer";
import { getSafeLocale } from "@/i18n/config";
import { getManagedContentItems } from "@/lib/managed-content";
import { getSiteGuideArticles } from "@/lib/site-guide-content";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  return buildPageMetadata({ locale, path: "/icerik-merkezi", page: "contentHub" });
}

export default async function ContentHubPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  const [blogItems, educationItems] = await Promise.all([
    getManagedContentItems({ type: "BLOG", locale }),
    getManagedContentItems({ type: "EDUCATION", locale }),
  ]);
  const siteGuideArticles = getSiteGuideArticles(locale);
  const isEnglish = locale === "en";
  const dateFormatter = new Intl.DateTimeFormat(isEnglish ? "en-US" : "tr-TR", { dateStyle: "medium" });

  const items: ContentHubItem[] = [
    ...siteGuideArticles.map((article) => ({
      id: `site-${article.id}`,
      kind: "SITE_GUIDE" as const,
      kindLabel: isEnglish ? "Understand the Site" : "Siteyi Anlamak",
      href: `/${locale}/siteyi-anlamak#${article.id}`,
      title: article.title,
      excerpt: article.excerpt,
      body: article.paragraphs.join("\n\n"),
      featured: article.id.includes("start") || article.id.includes("baslamali"),
      publishedLabel: null,
    })),
    ...educationItems.map((item) => ({
      id: `education-${item.id}`,
      kind: "EDUCATION" as const,
      kindLabel: isEnglish ? "Education" : "Eğitim",
      href: `/${locale}/egitim/${item.id}`,
      title: item.title,
      excerpt: item.excerpt ?? item.body.split(/\n{2,}/)[0] ?? item.title,
      body: item.body,
      featured: item.isFeatured,
      publishedLabel: item.publishedAt ? dateFormatter.format(item.publishedAt) : null,
    })),
    ...blogItems.map((item) => ({
      id: `blog-${item.id}`,
      kind: "BLOG" as const,
      kindLabel: "Blog",
      href: `/${locale}/blog/${item.id}`,
      title: item.title,
      excerpt: item.excerpt ?? item.body.split(/\n{2,}/)[0] ?? item.title,
      body: item.body,
      featured: item.isFeatured,
      publishedLabel: item.publishedAt ? dateFormatter.format(item.publishedAt) : null,
    })),
  ];

  return (
    <div className="grid gap-6">
      <section className="content-hub-hero premium-card premium-card--interactive p-6 md:p-8">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">
          {isEnglish ? "Content center" : "İçerik merkezi"}
        </p>
        <h1 className="mt-2 max-w-5xl text-3xl font-black leading-tight text-[#152033] md:text-5xl">
          {isEnglish ? "One library for learning the site, the markets, and the portfolio flow." : "Siteyi, piyasayı ve portföy akışını öğrenmek için tek kütüphane."}
        </h1>
        <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-600 md:text-base md:leading-8">
          {isEnglish
            ? "Search across blog articles, education notes, and site guides. Start with the guide, move into the learning notes, then test the idea in the virtual portfolio and review it with AI."
            : "Blog yazıları, eğitim notları ve site kullanım rehberleri burada birlikte aranır. Önce rehberden başlayın, eğitim yazılarıyla derinleşin, sonra fikri sanal portföyde deneyip AI ile gözden geçirin."}
        </p>
      </section>

      <ContentHubExplorer locale={locale} items={items} />
    </div>
  );
}
