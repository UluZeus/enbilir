import type { ReactNode } from "react";
import { SignalAlertOverlay } from "@/components/ai-market/SignalAlertOverlay";

export default function AiMarketAssistantLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SignalAlertOverlay />
      {children}
    </>
  );
}
