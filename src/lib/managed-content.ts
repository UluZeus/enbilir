import { prisma } from "@/lib/prisma";

export const managedContentTypes = ["ANNOUNCEMENT", "BLOG", "EDUCATION", "CONTACT"] as const;

export type ManagedContentTypeCode = (typeof managedContentTypes)[number];

export type PublicManagedContentItem = {
  id: string;
  type: ManagedContentTypeCode;
  locale: string;
  title: string;
  excerpt: string | null;
  body: string;
  imageUrl: string | null;
  videoUrl: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  sortOrder: number;
  isFeatured: boolean;
  publishedAt: Date | null;
};

export function isManagedContentType(value: string): value is ManagedContentTypeCode {
  return managedContentTypes.includes(value as ManagedContentTypeCode);
}

export async function getManagedContentItems({
  type,
  locale,
  featuredOnly = false,
  limit,
}: {
  type: ManagedContentTypeCode;
  locale: string;
  featuredOnly?: boolean;
  limit?: number;
}): Promise<PublicManagedContentItem[]> {
  const items = await prisma.managedContentItem.findMany({
    where: {
      type,
      locale,
      isActive: true,
      ...(featuredOnly ? { isFeatured: true } : {}),
    },
    orderBy: [{ sortOrder: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      id: true,
      type: true,
      locale: true,
      title: true,
      excerpt: true,
      body: true,
      imageUrl: true,
      videoUrl: true,
      linkUrl: true,
      linkLabel: true,
      sortOrder: true,
      isFeatured: true,
      publishedAt: true,
    },
  });

  return items as PublicManagedContentItem[];
}
