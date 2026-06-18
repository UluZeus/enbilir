import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getUserFavoriteSymbols, normalizeFavoriteSymbols, replaceUserFavorites } from "@/lib/ai-market/favorites";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ authenticated: false, favorites: [] }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    favorites: await getUserFavoriteSymbols(user.id),
  });
}

export async function PUT(request: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ authenticated: false, error: "Oturum bulunamadi." }, { status: 401 });
  }

  let body: { symbols?: unknown };

  try {
    body = (await request.json()) as { symbols?: unknown };
  } catch {
    return NextResponse.json({ error: "Gecersiz JSON body." }, { status: 400 });
  }

  const favorites = await replaceUserFavorites(user.id, normalizeFavoriteSymbols(body.symbols));

  return NextResponse.json({
    authenticated: true,
    favorites,
  });
}
