import { prisma } from "@/lib/prisma";

export type AdSlot =
  | "home_top"
  | "trade_top"
  | "trade_right"
  | "trade_bottom";

export const adSlots: AdSlot[] = ["home_top", "trade_top", "trade_right", "trade_bottom"];

export type DisplayAd = {
  title: string;
  body: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  linkUrl?: string | null;
  linkLabel?: string | null;
  displaySeconds: number;
};

const fallbackAds: Record<AdSlot, DisplayAd[]> = {
  home_top: [
    {
      title: "Enbilir Akademi",
      body: "Sanal portföy yarışması başlıyor. Gerçek para yok, öğrenme ve strateji var.",
      linkLabel: "Eğitime git",
      linkUrl: "/tr/egitim",
      displaySeconds: 8,
    },
  ],
  trade_top: [
    {
      title: "İşlem ekranı bilgi bandı",
      body: "Bu ekran simülasyon amaçlıdır; gerçek emir veya gerçek para işlemi yapılmaz.",
      displaySeconds: 10,
    },
  ],
  trade_right: [
    {
      title: "Riskini ölç",
      body: "Portföy kararlarını vermeden önce senaryo ve risk notlarını incele.",
      displaySeconds: 8,
    },
  ],
  trade_bottom: [
    {
      title: "Yatırım tavsiyesi değildir",
      body: "Buradaki bilgiler eğitim ve finansal okuryazarlık amacı taşır.",
      displaySeconds: 8,
    },
  ],
};

export async function getAds(slot: AdSlot): Promise<DisplayAd[]> {
  try {
    const now = new Date();
    const ads = await prisma.adPlacement.findMany({
      where: {
        slot,
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
      select: {
        title: true,
        body: true,
        imageUrl: true,
        videoUrl: true,
        linkUrl: true,
        linkLabel: true,
        displaySeconds: true,
      },
    });

    return ads.length > 0 ? ads : fallbackAds[slot];
  } catch {
    return fallbackAds[slot];
  }
}
