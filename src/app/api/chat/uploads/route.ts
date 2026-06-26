import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const maxUploadBytes = 25 * 1024 * 1024;
const allowedMimePrefixes = ["image/", "video/", "application/pdf", "text/", "application/zip"];

function getUploadKind(mimeType: string) {
  if (mimeType.startsWith("image/")) {
    return "IMAGE";
  }

  if (mimeType.startsWith("video/")) {
    return "VIDEO";
  }

  return "FILE";
}

function getSafeFileName(fileName: string) {
  const parsed = path.parse(fileName);
  const base = parsed.name
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60) || "dosya";
  const ext = parsed.ext.replace(/[^\w.]/g, "").slice(0, 12);

  return `${base}${ext}`;
}

export async function POST(request: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ authenticated: false, error: "Oturum bulunamadı." }, { status: 401 });
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ authenticated: true, error: "Dosya yükleme isteği okunamadı." }, { status: 400 });
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ authenticated: true, error: "Dosya bulunamadı." }, { status: 400 });
  }

  if (file.size <= 0 || file.size > maxUploadBytes) {
    return NextResponse.json({ authenticated: true, error: "Dosya boyutu 25 MB sınırını aşmamalı." }, { status: 400 });
  }

  const mimeType = file.type || "application/octet-stream";
  const isAllowed = allowedMimePrefixes.some((prefix) => prefix.endsWith("/") ? mimeType.startsWith(prefix) : mimeType === prefix);

  if (!isAllowed) {
    return NextResponse.json({ authenticated: true, error: "Bu dosya türü desteklenmiyor." }, { status: 400 });
  }

  const now = new Date();
  const folder = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const safeName = getSafeFileName(file.name);
  const storedName = `${Date.now()}-${randomBytes(4).toString("hex")}-${safeName}`;
  const relativeUrl = `/uploads/chat/${folder}/${storedName}`;
  const uploadDir = path.join(process.cwd(), "public", "uploads", "chat", folder);
  const uploadPath = path.join(uploadDir, storedName);
  const bytes = Buffer.from(await file.arrayBuffer());

  await mkdir(uploadDir, { recursive: true });
  await writeFile(uploadPath, bytes);

  return NextResponse.json({
    authenticated: true,
    attachment: {
      url: relativeUrl,
      fileName: file.name || safeName,
      mimeType,
      size: file.size,
      kind: getUploadKind(mimeType),
    },
  });
}
