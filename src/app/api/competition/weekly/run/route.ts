import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { publishWeeklyCompetition } from "@/lib/weekly-competition-publisher";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const expected = process.env.WEEKLY_COMPETITION_CRON_SECRET ?? "";
  const received = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);

  return Boolean(
    expected &&
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer),
  );
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Yetkisiz haftalık yarışma çağrısı." }, { status: 401 });
  }

  try {
    return NextResponse.json({ ok: true, ...(await publishWeeklyCompetition()) });
  } catch (error) {
    console.error("[weekly-competition-run]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Haftalık yarışma yayınlanamadı." },
      { status: 500 },
    );
  }
}
