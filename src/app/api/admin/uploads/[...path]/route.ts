import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getChatUploadFormatForExtension } from "@/lib/chat-upload-policy";
import { getPersistentAdminUploadDirectory } from "@/lib/media-storage";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const segments = (await params).path ?? [];

  if (
    segments.length !== 3 ||
    !/^\d{4}$/.test(segments[0]) ||
    !/^(0[1-9]|1[0-2])$/.test(segments[1]) ||
    !/^\d{10,}-[a-f0-9-]{36}\.[a-z0-9]{2,5}$/i.test(segments[2])
  ) {
    return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 404 });
  }

  const format = getChatUploadFormatForExtension(path.extname(segments[2]));
  if (!format || !["IMAGE", "VIDEO"].includes(format.kind)) {
    return NextResponse.json({ error: "Dosya türü desteklenmiyor." }, { status: 415 });
  }

  const root = getPersistentAdminUploadDirectory();
  const filePath = path.resolve(root, ...segments);
  if (path.relative(root, filePath).startsWith("..")) {
    return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 404 });
  }

  try {
    const bytes = await readFile(filePath);
    return new NextResponse(bytes, {
      headers: {
        "Cache-Control": "public, max-age=86400, immutable",
        "Content-Disposition": "inline",
        "Content-Security-Policy": "sandbox; default-src 'none'",
        "Content-Type": format.mimeType,
        "Cross-Origin-Resource-Policy": "same-origin",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 404 });
  }
}
