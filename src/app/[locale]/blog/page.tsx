import { PageHeader } from "@/components/PageHeader";
import { ManagedContentList } from "@/components/ManagedContentList";
import { getSafeLocale } from "@/i18n/config";
import { getUiCopy } from "@/i18n/ui-copy";
import { getManagedContentItems } from "@/lib/managed-content";

export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  const copy = getUiCopy(locale).simplePages.blog;
  const posts = await getManagedContentItems({ type: "BLOG", locale });

  return (
    <div className="grid gap-6">
      <PageHeader title={copy.title} description={copy.description} locale={locale} />
      <ManagedContentList
        items={posts}
        emptyTitle={copy.emptyTitle}
        emptyBody={copy.emptyBody}
        featuredLabel={locale === "en" ? "Featured" : "Öne çıkan"}
      />
    </div>
  );
}
