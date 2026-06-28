import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ContentArticleShell } from "@/components/content/ContentArticleShell";
import { getSafeLocale } from "@/i18n/config";
import { getManagedContentItemById } from "@/lib/managed-content";
import { buildPageMetadata, defaultOpenGraphImage, seoBrand, stringifyJsonLd } from "@/lib/seo";
import { getSiteUrl } from "@/lib/site-url";

function paragraphs(body: string) {
  return body
    .split(/\n{2,}/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function getLocalizedBlogIds(id: string) {
  const baseId = id.endsWith("-en") ? id.slice(0, -3) : id;

  return {
    tr: baseId,
    en: `${baseId}-en`,
  };
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }): Promise<Metadata> {
  const { locale: rawLocale, id } = await params;
  const locale = getSafeLocale(rawLocale);
  const post = await getManagedContentItemById({ id, type: "BLOG", locale });

  if (!post) {
    return buildPageMetadata({ locale, path: "/blog", page: "blog" });
  }

  const siteUrl = getSiteUrl();
  const localizedIds = getLocalizedBlogIds(id);
  const canonical = `/${locale}/blog/${id}`;
  const description = post.excerpt ?? paragraphs(post.body)[0];

  return {
    ...(await buildPageMetadata({ locale, path: `/blog/${id}`, page: "blog" })),
    title: { absolute: `${post.title} | Enbilir Blog` },
    description,
    alternates: {
      canonical,
      languages: {
        tr: `/tr/blog/${localizedIds.tr}`,
        en: `/en/blog/${localizedIds.en}`,
      },
    },
    openGraph: {
      type: "article",
      locale: locale === "tr" ? "tr_TR" : "en_US",
      url: canonical,
      siteName: seoBrand.domain,
      title: post.title,
      description,
      publishedTime: post.publishedAt?.toISOString(),
      authors: [seoBrand.founder],
      images: [
        {
          url: `${siteUrl}${defaultOpenGraphImage}`,
          width: 1200,
          height: 630,
          alt: `${post.title} | Enbilir Blog`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
      images: [`${siteUrl}${defaultOpenGraphImage}`],
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: rawLocale, id } = await params;
  const locale = getSafeLocale(rawLocale);
  const post = await getManagedContentItemById({ id, type: "BLOG", locale });

  if (!post) {
    notFound();
  }

  const published = post.publishedAt
    ? new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", { dateStyle: "long" }).format(post.publishedAt)
    : null;
  const siteUrl = getSiteUrl();
  const articleParagraphs = paragraphs(post.body);
  const articleStructuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt ?? articleParagraphs[0],
    inLanguage: locale === "tr" ? "tr-TR" : "en-US",
    datePublished: post.publishedAt?.toISOString(),
    dateModified: post.publishedAt?.toISOString(),
    author: {
      "@type": "Person",
      name: seoBrand.founder,
    },
    publisher: {
      "@type": "Organization",
      name: seoBrand.legalName,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/logo.png`,
      },
    },
    mainEntityOfPage: `${siteUrl}/${locale}/blog/${post.id}`,
  };

  return (
    <ContentArticleShell
      locale={locale}
      backHref={`/${locale}/blog`}
      backLabel={locale === "tr" ? "Blog yazılarına dön" : "Back to blog"}
      eyebrow={locale === "tr" ? "Enbilir yazısı" : "Enbilir article"}
      title={post.title}
      excerpt={post.excerpt}
      publishedLabel={published}
      paragraphs={articleParagraphs}
    >
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: stringifyJsonLd(articleStructuredData) }}
      />
    </ContentArticleShell>
  );
}
