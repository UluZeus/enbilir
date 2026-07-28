import path from "node:path";
import { getPersistentChatUploadDirectory } from "@/lib/media-storage";

export const maxChatUploadBytes = 10 * 1024 * 1024;
export const maxChatUploadRequestBytes = maxChatUploadBytes + 128 * 1024;

export type AllowedChatUpload = {
  extension: string;
  kind: "IMAGE" | "VIDEO" | "FILE";
  mimeType: string;
  disposition: "inline" | "attachment";
};

const formats: Array<AllowedChatUpload & { matches: (bytes: Buffer) => boolean }> = [
  {
    extension: ".png",
    kind: "IMAGE",
    mimeType: "image/png",
    disposition: "inline",
    matches: (bytes) => bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    extension: ".jpg",
    kind: "IMAGE",
    mimeType: "image/jpeg",
    disposition: "inline",
    matches: (bytes) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
  {
    extension: ".gif",
    kind: "IMAGE",
    mimeType: "image/gif",
    disposition: "inline",
    matches: (bytes) => ["GIF87a", "GIF89a"].includes(bytes.subarray(0, 6).toString("ascii")),
  },
  {
    extension: ".webp",
    kind: "IMAGE",
    mimeType: "image/webp",
    disposition: "inline",
    matches: (bytes) => bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP",
  },
  {
    extension: ".avif",
    kind: "IMAGE",
    mimeType: "image/avif",
    disposition: "inline",
    matches: (bytes) => bytes.subarray(4, 8).toString("ascii") === "ftyp" && /\b(?:avif|avis)\b/.test(bytes.subarray(8, 32).toString("ascii")),
  },
  {
    extension: ".webm",
    kind: "VIDEO",
    mimeType: "video/webm",
    disposition: "inline",
    matches: (bytes) => bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])),
  },
  {
    extension: ".mp4",
    kind: "VIDEO",
    mimeType: "video/mp4",
    disposition: "inline",
    matches: (bytes) => bytes.subarray(4, 8).toString("ascii") === "ftyp",
  },
  {
    extension: ".pdf",
    kind: "FILE",
    mimeType: "application/pdf",
    disposition: "attachment",
    matches: (bytes) => bytes.subarray(0, 5).toString("ascii") === "%PDF-",
  },
  {
    extension: ".zip",
    kind: "FILE",
    mimeType: "application/zip",
    disposition: "attachment",
    matches: (bytes) => {
      const signature = bytes.subarray(0, 4);
      return [
        Buffer.from([0x50, 0x4b, 0x03, 0x04]),
        Buffer.from([0x50, 0x4b, 0x05, 0x06]),
        Buffer.from([0x50, 0x4b, 0x07, 0x08]),
      ].some((candidate) => signature.equals(candidate));
    },
  },
];

export function detectAllowedChatUpload(bytes: Buffer, claimedMimeType: string): AllowedChatUpload | null {
  const normalizedMimeType = claimedMimeType.toLowerCase().split(";", 1)[0].trim();
  const format = formats.find((candidate) => candidate.mimeType === normalizedMimeType && candidate.matches(bytes));

  if (!format) {
    return null;
  }

  return {
    extension: format.extension,
    kind: format.kind,
    mimeType: format.mimeType,
    disposition: format.disposition,
  };
}

export function getChatUploadFormatForExtension(extension: string): AllowedChatUpload | null {
  const format = formats.find((candidate) => candidate.extension === extension.toLowerCase());

  return format ? {
    extension: format.extension,
    kind: format.kind,
    mimeType: format.mimeType,
    disposition: format.disposition,
  } : null;
}

export function getSafeChatUploadFileName(originalName: string, extension: string) {
  const base = path.parse(originalName).name
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[.-]+|[.-]+$/g, "")
    .slice(0, 60) || "dosya";

  return `${base}${extension}`;
}

export function getPrivateChatUploadDirectory() {
  return getPersistentChatUploadDirectory();
}

export function resolvePrivateChatUploadPath(storedName: string) {
  if (!/^[a-f0-9]{32}-[\w.-]{1,80}$/i.test(storedName) || path.basename(storedName) !== storedName) {
    throw new Error("Invalid chat upload path");
  }

  const root = getPrivateChatUploadDirectory();
  const resolved = path.resolve(root, storedName);

  if (path.dirname(resolved) !== root) {
    throw new Error("Invalid chat upload path");
  }

  return resolved;
}

function escapeContentDispositionFileName(fileName: string) {
  return fileName.replace(/[\r\n"\\]/g, "_");
}

export function getChatUploadResponseHeaders({
  disposition,
  fileName,
  mimeType,
}: {
  disposition: "inline" | "attachment";
  fileName: string;
  mimeType: string;
}) {
  const safeName = escapeContentDispositionFileName(fileName);
  const encodedName = encodeURIComponent(safeName);

  return new Headers({
    "Cache-Control": "private, no-store",
    "Content-Disposition": `${disposition}; filename="${safeName}"; filename*=UTF-8''${encodedName}`,
    "Content-Security-Policy": "sandbox; default-src 'none'",
    "Content-Type": mimeType,
    "Cross-Origin-Resource-Policy": "same-origin",
    "X-Content-Type-Options": "nosniff",
  });
}
