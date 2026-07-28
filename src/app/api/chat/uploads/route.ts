import { randomBytes } from "crypto";
import { mkdir, unlink, writeFile } from "fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  detectAllowedChatUpload,
  getPrivateChatUploadDirectory,
  getSafeChatUploadFileName,
  maxChatUploadBytes,
  maxChatUploadRequestBytes,
} from "@/lib/chat-upload-policy";
import { consumeDurableRateLimit } from "@/lib/durable-rate-limit";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ authenticated: false, error: "Oturum bulunamadı." }, { status: 401 });
  }

  const uploadRateLimit = await consumeDurableRateLimit({
    scope: "chat-upload",
    identity: user.id,
    maxAttempts: 20,
    windowMs: 24 * 60 * 60 * 1000,
    blockMs: 24 * 60 * 60 * 1000,
  });

  if (!uploadRateLimit.allowed) {
    return NextResponse.json(
      { authenticated: true, error: "Günlük dosya yükleme sınırına ulaştınız." },
      { status: 429, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const contentLength = Number(request.headers.get("content-length"));

  if (Number.isFinite(contentLength) && contentLength > maxChatUploadRequestBytes) {
    return NextResponse.json(
      { authenticated: true, error: "Dosya boyutu 10 MB sınırını aşmamalı." },
      { status: 413, headers: { "Cache-Control": "private, no-store" } },
    );
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

  if (file.size <= 0 || file.size > maxChatUploadBytes) {
    return NextResponse.json({ authenticated: true, error: "Dosya boyutu 10 MB sınırını aşmamalı." }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const format = detectAllowedChatUpload(bytes, file.type || "application/octet-stream");

  if (!format) {
    return NextResponse.json(
      { authenticated: true, error: "Dosya içeriği doğrulanamadı. Yalnızca PNG, JPG, GIF, WebP, AVIF, MP4, WebM, PDF ve ZIP yüklenebilir." },
      { status: 415, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const safeName = getSafeChatUploadFileName(file.name, format.extension);
  const storedName = `${randomBytes(16).toString("hex")}-${safeName}`;
  const uploadDir = getPrivateChatUploadDirectory();
  const uploadPath = path.join(uploadDir, storedName);

  await mkdir(uploadDir, { recursive: true });
  await writeFile(uploadPath, bytes, { flag: "wx" });
  try {
    await prisma.chatUpload.create({
      data: {
        userId: user.id,
        storedName,
        mimeType: format.mimeType,
        sizeBytes: file.size,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
  } catch (error) {
    await unlink(uploadPath).catch(() => undefined);
    throw error;
  }

  return NextResponse.json(
    {
      authenticated: true,
      attachment: {
        url: `/api/chat/uploads/${encodeURIComponent(storedName)}`,
        fileName: safeName,
        mimeType: format.mimeType,
        size: file.size,
        kind: format.kind,
      },
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
