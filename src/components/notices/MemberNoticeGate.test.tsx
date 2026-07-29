import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  getIstanbulPeriodKey,
  getMemberNoticeEntryToken,
  MemberNotice,
} from "@/components/notices/MemberNoticeGate";

describe("MemberNoticeGate", () => {
  it("reuses one session entry token for each Istanbul month", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };
    const createToken = vi.fn(() => "entry-token");
    const periodKey = getIstanbulPeriodKey(new Date("2026-07-31T21:30:00.000Z"));

    expect(periodKey).toBe("2026-08");
    expect(getMemberNoticeEntryToken(storage, periodKey, createToken)).toBe("entry-token");
    expect(getMemberNoticeEntryToken(storage, periodKey, createToken)).toBe("entry-token");
    expect(createToken).toHaveBeenCalledTimes(1);
  });

  it("keeps onboarding free-first without modal semantics", () => {
    const html = renderToStaticMarkup(
      <MemberNotice
        locale="tr"
        notice={{
          kind: "ONBOARDING",
          periodKey: "2026-08",
          paymentUrl: "https://payment.example.test/vip",
        }}
        onClose={() => undefined}
        onSuppress={() => undefined}
      />,
    );

    expect(html).toContain("Enbilir’e hoş geldiniz — ücretsiz erişiminiz devam eder");
    expect(html).toContain("Ücretsiz devam et");
    expect(html).toContain("Bu ay tekrar gösterme");
    expect(html).toContain("günlük 10 AI sorgu");
    expect(html).toContain("15 sorguya");
    expect(html).toContain("otomatik yenilenmez");
    expect(html).toContain('href="https://payment.example.test/vip"');
    expect(html).not.toContain('role="dialog"');
    expect(html).not.toContain("aria-modal");
  });

  it("omits payment control and explains when secure payment is unavailable", () => {
    const html = renderToStaticMarkup(
      <MemberNotice
        locale="en"
        notice={{ kind: "MONTHLY_SUPPORT", periodKey: "2026-08", paymentUrl: null }}
        onClose={() => undefined}
        onSuppress={() => undefined}
      />,
    );

    expect(html).toContain("Continue for free");
    expect(html).toContain("Secure payment is temporarily unavailable");
    expect(html).not.toContain("Support with 100 TL");
  });
});
