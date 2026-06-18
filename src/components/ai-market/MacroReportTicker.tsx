"use client";

import { useEffect, useState } from "react";

const REPORT_HOURS = [6, 8, 11, 14, 17, 20, 23];
const REPORT_MINUTE = 55;
const ISTANBUL_OFFSET_MS = 3 * 60 * 60 * 1000;

function getNextReportTime(now: Date) {
  const turkeyNow = new Date(now.getTime() + ISTANBUL_OFFSET_MS);
  const year = turkeyNow.getUTCFullYear();
  const month = turkeyNow.getUTCMonth();
  const day = turkeyNow.getUTCDate();

  for (const hour of REPORT_HOURS) {
    const candidateUtc = Date.UTC(year, month, day, hour - 3, REPORT_MINUTE, 0, 0);

    if (candidateUtc > now.getTime()) {
      return new Date(candidateUtc);
    }
  }

  return new Date(Date.UTC(year, month, day + 1, REPORT_HOURS[0] - 3, REPORT_MINUTE, 0, 0));
}

function formatCountdown(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, "0")} saat ${String(minutes).padStart(2, "0")} dakika ${String(seconds).padStart(2, "0")} saniye`;
}

export function MacroReportTicker({ variant = "light" }: { variant?: "light" | "dark" }) {
  const [now, setNow] = useState<Date | null>(null);
  const message = now
    ? (() => {
        const nextReportTime = getNextReportTime(now);
        const countdown = formatCountdown(nextReportTime.getTime() - now.getTime());
        const nextReportLabel = new Intl.DateTimeFormat("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Europe/Istanbul",
        }).format(nextReportTime);

        return `Dr. Hakan Ünsal'ın hazırladığı yeni makro raporun hazırlanmasına ${countdown} kaldı. Sıradaki rapor Türkiye saatiyle ${nextReportLabel}. Buradaki yorumlar ve tavsiyeler asla yatırım tavsiyesi niteliğinde olmayıp Dr. Hakan Ünsal'ın kendi bilgisiyle oluşturduğu yorumlarıdır. Piyasa verileri gecikmeli, eksik veya hatalı olabilir; karar almadan önce bağımsız kaynaklarla doğrulama yapılmalıdır.`;
      })()
    : "Dr. Hakan Ünsal'ın hazırladığı yeni makro raporun hazırlanma süresi hesaplanıyor. Buradaki yorumlar ve tavsiyeler asla yatırım tavsiyesi niteliğinde olmayıp Dr. Hakan Ünsal'ın kendi bilgisiyle oluşturduğu yorumlarıdır. Piyasa verileri gecikmeli, eksik veya hatalı olabilir; karar almadan önce bağımsız kaynaklarla doğrulama yapılmalıdır.";
  const tone =
    variant === "dark"
      ? "border-cyan-300/20 bg-cyan-300/10 text-cyan-50"
      : "border-[#0f766e]/20 bg-white/80 text-[#152033]";

  useEffect(() => {
    const updateTime = () => setNow(new Date());
    const timeoutId = window.setTimeout(updateTime, 0);
    const intervalId = window.setInterval(updateTime, 1000);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <section className={`macro-report-ticker overflow-hidden rounded-md border shadow-lg backdrop-blur ${tone}`} aria-label="Makro rapor geri sayımı">
      <div className="macro-report-ticker__track py-2 text-sm font-black">
        <span className="macro-report-ticker__item px-4">{message}</span>
        <span className="macro-report-ticker__item px-4" aria-hidden="true">{message}</span>
      </div>
    </section>
  );
}
