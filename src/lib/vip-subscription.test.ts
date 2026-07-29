import { describe, expect, it } from "vitest";

import { addOneClampedCalendarMonth } from "@/lib/vip-subscription";

describe("VIP calendar-month entitlement", () => {
  it.each([
    ["2025-01-31T12:30:00.000Z", "2025-02-28T12:30:00.000Z"],
    ["2024-01-31T12:30:00.000Z", "2024-02-29T12:30:00.000Z"],
    ["2024-02-29T12:30:00.000Z", "2024-03-29T12:30:00.000Z"],
    ["2025-02-28T12:30:00.000Z", "2025-03-28T12:30:00.000Z"],
  ])("clamps %s to %s", (start, expected) => {
    expect(addOneClampedCalendarMonth(new Date(start)).toISOString()).toBe(expected);
  });
});
