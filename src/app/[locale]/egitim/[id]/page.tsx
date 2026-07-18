import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { ContentArticleShell } from "@/components/content/ContentArticleShell";
import { getSafeLocale, type Locale } from "@/i18n/config";
import { getManagedContentIdForLocale, getManagedContentLocalizedIds } from "@/i18n/localized-path";
import { getManagedContentItemById } from "@/lib/managed-content";
import { buildPageMetadata, buildSeoDescription, buildSeoTitleWithSuffix, defaultOpenGraphImage, seoBrand, stringifyJsonLd } from "@/lib/seo";
import { getSiteUrl } from "@/lib/site-url";

function paragraphs(body: string) {
  return body
    .split(/\n{2,}/)
    .map((line) => line.trim())
    .filter(Boolean);
}

async function getEducationItemOrHandle(locale: Locale, id: string) {
  const item = await getManagedContentItemById({ id, type: "EDUCATION", locale });

  if (item) {
    return item;
  }

  const localizedId = getManagedContentIdForLocale(id, locale);

  if (localizedId !== id) {
    const localizedItem = await getManagedContentItemById({ id: localizedId, type: "EDUCATION", locale });

    if (localizedItem) {
      permanentRedirect(`/${locale}/egitim/${localizedId}`);
    }
  }

  const sourceLocale = locale === "tr" ? "en" : "tr";
  const sourceId = getManagedContentIdForLocale(id, sourceLocale);
  const sourceItem = await getManagedContentItemById({ id: sourceId, type: "EDUCATION", locale: sourceLocale });

  if (sourceItem) {
    permanentRedirect(`/${locale}/egitim`);
  }

  notFound();
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }): Promise<Metadata> {
  const { locale: rawLocale, id } = await params;
  const locale = getSafeLocale(rawLocale);
  const item = await getEducationItemOrHandle(locale, id);

  const siteUrl = getSiteUrl();
  const localizedIds = getManagedContentLocalizedIds(id);
  const counterpartLocale = locale === "tr" ? "en" : "tr";
  const counterpart = await getManagedContentItemById({ id: localizedIds[counterpartLocale], type: "EDUCATION", locale: counterpartLocale });
  const canonical = `/${locale}/egitim/${id}`;
  const sectionName = locale === "en" ? "Enbilir Education" : "Enbilir Eğitim";
  const authorName = locale === "en" ? "Dr. Hakan Unsal" : seoBrand.founder;
  const seoTitle = buildSeoTitleWithSuffix(item.title, sectionName);
  const description = buildSeoDescription(item.excerpt ?? paragraphs(item.body)[0]);

  return {
    ...(await buildPageMetadata({ locale, path: `/egitim/${id}`, page: "education" })),
    title: { absolute: seoTitle },
    description,
    alternates: {
      canonical,
      ...(counterpart ? { languages: {
        tr: `/tr/egitim/${localizedIds.tr}`,
        en: `/en/egitim/${localizedIds.en}`,
      } } : {}),
    },
    openGraph: {
      type: "article",
      locale: locale === "tr" ? "tr_TR" : "en_US",
      url: canonical,
      siteName: seoBrand.domain,
      title: seoTitle,
      description,
      publishedTime: item.publishedAt?.toISOString(),
      authors: [authorName],
      images: [
        {
          url: `${siteUrl}${defaultOpenGraphImage}`,
          width: 1200,
          height: 630,
          alt: seoTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: seoTitle,
      description,
      images: [`${siteUrl}${defaultOpenGraphImage}`],
    },
  };
}

export default async function EducationDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: rawLocale, id } = await params;
  const locale = getSafeLocale(rawLocale);
  const item = await getEducationItemOrHandle(locale, id);

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
