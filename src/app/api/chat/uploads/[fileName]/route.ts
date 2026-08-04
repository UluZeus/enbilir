import path from "node:path";
import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { canAccessChatRoom } from "@/lib/chat";
import {
  detectAllowedChatUpload,
  getChatUploadFormatForExtension,
  getChatUploadResponseHeaders,
  resolvePrivateChatUploadPath,
} from "@/lib/chat-upload-policy";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileName: string }> },
) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json(
      { authenticated: false, error: "Oturum bulunamadı." },
      { status: 401, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const { fileName } = await params;
  const upload = await prisma.chatUpload.findUnique({
    where: { storedName: fileName },
    select: { userId: true, status: true, expiresAt: true },
  });

  if (
    !upload ||
    (upload.status !== "LINKED" && (upload.userId !== user.id || upload.expiresAt <= new Date()))
  ) {
    return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 404 });
  }

  if (upload.status === "LINKED") {
    const attachmentUrl = `/api/chat/uploads/${encodeURIComponent(fileName)}`;
    const message = await prisma.chatMessage.findFirst({
      where: {
        attachment: {
          path: "$.url",
          equals: attachmentUrl,
        },
      },
      select: {
        room: {
          select: {
            id: true,
            type: true,
            createdByUserId: true,
          },
        },
      },
    });

    if (!message || !(await canAccessChatRoom({ room: message.room, userId: user.id }))) {
      return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 404 });
    }
  }

  let uploadPath: string;

  try {
    uploadPath = resolvePrivateChatUploadPath(fileName);
  } catch {
    return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 404 });
  }

  const expectedFormat = getChatUploadFormatForExtension(path.extname(fileName));

  if (!expectedFormat) {
    return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 404 });
  }

  try {
    const bytes = await readFile(uploadPath);
    const verifiedFormat = detectAllowedChatUpload(bytes, expectedFormat.mimeType);

    if (!verifiedFormat) {
      return NextResponse.json({ error: "Dosya doğrulanamadı." }, { status: 410 });
    }

    const displayName = fileName.slice(33);
    const headers = getChatUploadResponseHeaders({
      disposition: verifiedFormat.disposition,
      fileName: displayName,
      mimeType: verifiedFormat.mimeType,
    });
    headers.set("Content-Length", String(bytes.byteLength));

    return new Response(bytes, { status: 200, headers });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : null;

    return NextResponse.json(
      { error: code === "ENOENT" ? "Dosya bulunamadı." : "Dosya okunamadı." },
      { status: code === "ENOENT" ? 404 : 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}
