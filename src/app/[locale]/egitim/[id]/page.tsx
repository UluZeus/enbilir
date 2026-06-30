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

function getLocalizedEducationIds(id: string) {
  const baseId = id.endsWith("-en") ? id.slice(0, -3) : id;

  return {
    tr: baseId,
    en: `${baseId}-en`,
  };
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }): Promise<Metadata> {
  const { locale: rawLocale, id } = await params;
  const locale = getSafeLocale(rawLocale);
  const item = await getManagedContentItemById({ id, type: "EDUCATION", locale });

  if (!item) {
    return buildPageMetadata({ locale, path: "/egitim", page: "education" });
  }

  const siteUrl = getSiteUrl();
  const localizedIds = getLocalizedEducationIds(id);
  const canonical = `/${locale}/egitim/${id}`;
  const description = item.excerpt ?? paragraphs(item.body)[0];
  const sectionName = locale === "en" ? "Enbilir Education" : "Enbilir Eğitim";
  const authorName = locale === "en" ? "Dr. Hakan Unsal" : seoBrand.founder;

  return {
    ...(await buildPageMetadata({ locale, path: `/egitim/${id}`, page: "education" })),
    title: { absolute: `${item.title} | ${sectionName}` },
    description,
    alternates: {
      canonical,
      languages: {
        tr: `/tr/egitim/${localizedIds.tr}`,
        en: `/en/egitim/${localizedIds.en}`,
      },
    },
    openGraph: {
      type: "article",
      locale: locale === "tr" ? "tr_TR" : "en_US",
      url: canonical,
      siteName: seoBrand.domain,
      title: item.title,
      description,
      publishedTime: item.publishedAt?.toISOString(),
      authors: [authorName],
      images: [
        {
          url: `${siteUrl}${defaultOpenGraphImage}`,
          width: 1200,
          height: 630,
          alt: `${item.title} | ${sectionName}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: item.title,
      description,
      images: [`${siteUrl}${defaultOpenGraphImage}`],
    },
  };
}

export default async function EducationDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: rawLocale, id } = await params;
  const locale = getSafeLocale(rawLocale);
  const item = await getManagedContentItemById({ id, type: "EDUCATION", locale });

  if (!item) {
    notFound();
  }

  const articleParagraphs = paragraphs(item.body);
  const authorName = locale === "en" ? "Dr. Hakan Unsal" : seoBrand.founder;
  const publisherName = locale === "en" ? "Enbilir Market Academy" : seoBrand.legalName;
  const siteUrl = getSiteUrl();
  const published = item.publishedAt
    ? new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", { dateStyle: "long" }).format(item.publishedAt)
    : null;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    headline: item.title,
    name: item.title,
    description: item.excerpt ?? articleParagraphs[0],
    inLanguage: locale === "tr" ? "tr-TR" : "en-US",
    datePublished: item.publishedAt?.toISOString(),
    dateModified: item.publishedAt?.toISOString(),
    author: {
      "@type": "Person",
      name: authorName,
    },
    publisher: {
      "@type": "Organization",
      name: publisherName,
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/logo.png`,
      },
    },
    mainEntityOfPage: `${siteUrl}/${locale}/egitim/${item.id}`,
    educationalLevel: locale === "tr" ? "Finansal okuryazarlık" : "Financial literacy",
  };

  return (
    <ContentArticleShell
      locale={locale}
      backHref={`/${locale}/egitim`}
      backLabel={locale === "tr" ? "Eğitim yazılarına dön" : "Back to education"}
      eyebrow={locale === "tr" ? "Enbilir eğitim yazısı" : "Enbilir education article"}
      title={item.title}
      excerpt={item.excerpt}
      publishedLabel={published}
      paragraphs={articleParagraphs}
    >
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: stringifyJsonLd(structuredData) }}
      />
    </ContentArticleShell>
  );
}
