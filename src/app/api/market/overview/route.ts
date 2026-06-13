import { NextResponse } from "next/server";
import { getLiveMarketItems, getTopFallersFrom, getTopRisersFrom } from "@/lib/live-market";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await getLiveMarketItems();

    return NextResponse.json({
      updatedAt: new Date().toISOString(),
      items,
      topRisers: getTopRisersFrom(items).slice(0, 10),
      topFallers: getTopFallersFrom(items).slice(0, 10),
    });
  } catch (error) {
    return NextResponse.json(
      {
        updatedAt: new Date().toISOString(),
        items: [],
        topRisers: [],
        topFallers: [],
        error: error instanceof Error ? error.message : "Piyasa özeti alınamadı.",
      },
      { status: 502 },
    );
  }
}
