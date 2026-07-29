import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AiMarketChatPanel } from "@/components/ai-market/AiMarketChatPanel";

describe("AiMarketChatPanel membership presentation", () => {
  it("labels promotional full-content access as Free with 10 daily queries", () => {
    const html = renderToStaticMarkup(
      <AiMarketChatPanel
        locale="en"
        membershipTier="VIP"
        isPaidVipActive={false}
        paymentUrl={null}
      />,
    );

    expect(html).toContain("Free AI chat");
    expect(html).toContain("10 AI queries per day");
    expect(html).toContain("Secure payment is temporarily unavailable");
    expect(html).not.toContain("VIP supporter AI chat");
    expect(html).not.toContain("70 TL");
  });

  it("uses the VIP supporter label only for an active paid supporter", () => {
    const html = renderToStaticMarkup(
      <AiMarketChatPanel
        locale="tr"
        membershipTier="VIP"
        isPaidVipActive
        vipPaidUntil="2026-08-31T21:00:00.000Z"
        paymentUrl={null}
      />,
    );

    expect(html).toContain("VIP destekçi AI sohbet");
    expect(html).toContain("Günlük toplam 15 AI sorgu");
    expect(html).not.toContain("Free AI sohbet");
  });
});
