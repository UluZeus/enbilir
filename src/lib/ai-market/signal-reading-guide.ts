import type { SignalType } from "@/lib/ai-market/types";

export function getSignalReadingGuide(signal: SignalType, locale: string) {
  const isEnglish = locale === "en";

  if (signal === "STRONG_BUY" || signal === "BUY") {
    return isEnglish
      ? "Read this as a learning cue: check whether trend, volume, risk score, and your own time frame agree before adding any virtual exposure."
      : "Bunu emir gibi değil, öğrenme ipucu gibi oku: trend, hacim, risk skoru ve kendi vaden aynı şeyi söylüyor mu diye kontrol et.";
  }

  if (signal === "SELL" || signal === "AVOID") {
    return isEnglish
      ? "This warns that pressure or risk is elevated. In a virtual portfolio, review position size, downside scenario, and whether waiting is wiser."
      : "Bu uyarı baskı veya riskin arttığını söyler. Sanal portföyde pozisyon büyüklüğünü, ters senaryoyu ve beklemenin daha doğru olup olmadığını gözden geçir.";
  }

  if (signal === "TAKE_PROFIT") {
    return isEnglish
      ? "This does not mean everything must be closed; it means the move may be mature enough to review partial profit, risk, and patience."
      : "Bu her şeyi kapat demek değildir; hareketin olgunlaşmış olabileceğini, kısmi kar, risk ve sabır tarafını incelemek gerektiğini anlatır.";
  }

  if (signal === "WATCH") {
    return isEnglish
      ? "The setup is interesting but incomplete. Use it to create a watch note, not to rush into a decision."
      : "Kurulum ilginç ama tamamlanmış değil. Bunu acele karar için değil, izleme notu oluşturmak için kullan.";
  }

  return isEnglish
    ? "There is no strong action cue. Compare the indicators calmly and wait for a cleaner market structure."
    : "Güçlü bir aksiyon ipucu yok. Göstergeleri sakin karşılaştır ve daha temiz piyasa yapısı oluşmasını bekle.";
}
