import { describe, expect, it } from "vitest";
import {
  detectAllowedChatUpload,
  getChatUploadResponseHeaders,
  getSafeChatUploadFileName,
  resolvePrivateChatUploadPath,
} from "@/lib/chat-upload-policy";

describe("chat upload policy", () => {
  it("rejects SVG, HTML, text and mismatched active content", () => {
    expect(detectAllowedChatUpload(Buffer.from("<svg onload=alert(1)>"), "image/svg+xml")).toBeNull();
    expect(detectAllowedChatUpload(Buffer.from("<html><script>alert(1)</script>"), "text/html")).toBeNull();
    expect(detectAllowedChatUpload(Buffer.from("<script>alert(1)</script>"), "image/png")).toBeNull();
  });

  it("accepts allowlisted formats only when their magic bytes match", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(detectAllowedChatUpload(png, "image/png")).toEqual({
      extension: ".png",
      kind: "IMAGE",
      mimeType: "image/png",
      disposition: "inline",
    });
    expect(detectAllowedChatUpload(png, "application/pdf")).toBeNull();
  });

  it("forces safe extensions and prevents upload path traversal", () => {
    expect(getSafeChatUploadFileName("../../payload.svg", ".png")).toMatch(/^[\w.-]+\.png$/);
    expect(() => resolvePrivateChatUploadPath("..%2F..%2Fsecret.txt")).toThrow();
    expect(() => resolvePrivateChatUploadPath("../secret.txt")).toThrow();
  });

  it("serves files with nosniff and a safe content disposition", () => {
    const headers = getChatUploadResponseHeaders({
      disposition: "attachment",
      fileName: "rapor.pdf",
      mimeType: "application/pdf",
    });

    expect(headers.get("Content-Type")).toBe("application/pdf");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Content-Disposition")).toContain("attachment");
    expect(headers.get("Content-Security-Policy")).toContain("sandbox");
  });
});
