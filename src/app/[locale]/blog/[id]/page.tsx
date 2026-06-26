import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSafeLocale } from "@/i18n/config";
import { getManagedContentItemById } from "@/lib/managed-content";
import { buildPageMetadata } from "@/lib/seo";

function paragraphs(body: string) {
  return body
    .split(/\n{2,}/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }): Promise<Metadata> {
  const { locale: rawLocale, id } = await params;
  const locale = getSafeLocale(rawLocale);
  const post = await getManagedContentItemById({ id, type: "BLOG", locale });

  if (!post) {
    return buildPageMetadata({ locale, path: "/blog", page: "blog" });
  }

  return {
    ...(await buildPageMetadata({ locale, path: `/blog/${id}`, page: "blog" })),
    title: { absolute: `${post.title} | Enbilir Blog` },
    description: post.excerpt ?? paragraphs(post.body)[0],
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

  return (
    <article className="grid gap-6">
      <section className="premium-card premium-card--interactive p-6">
        <Link href={`/${locale}/blog`} className="text-sm font-black text-[#0f766e] hover:text-[#0b5f59]">
          {locale === "tr" ? "Blog yazılarına dön" : "Back to blog"}
        </Link>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">
          {locale === "tr" ? "Enbilir yazısı" : "Enbilir article"}
        </p>
        <h1 className="mt-2 max-w-4xl text-3xl font-black leading-tight text-[#152033] md:text-4xl">{post.title}</h1>
        {post.excerpt ? <p className="mt-4 max-w-4xl text-base font-bold leading-8 text-slate-600">{post.excerpt}</p> : null}
        {published ? <p className="mt-4 text-sm font-bold text-slate-500">{published}</p> : null}
      </section>

      <section className="premium-card p-6">
        <div className="mx-auto grid max-w-4xl gap-5 text-[15px] leading-8 text-slate-700">
          {paragraphs(post.body).map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>
    </article>
  );
}
