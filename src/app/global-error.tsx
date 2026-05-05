"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="tr">
      <body>
        <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#101827", color: "white", padding: 20 }}>
          <section style={{ maxWidth: 560, border: "1px solid rgba(245,166,35,.4)", borderRadius: 8, padding: 32, textAlign: "center" }}>
            <p style={{ color: "#f5a623", fontWeight: 900, letterSpacing: 2 }}>SİSTEM HATASI</p>
            <h1>Beklenmeyen bir hata oluştu</h1>
            <p>Sayfayı yeniden deneyebilir veya daha sonra tekrar giriş yapabilirsin.</p>
            <button onClick={reset} style={{ marginTop: 16, background: "#f5a623", color: "#101827", border: 0, borderRadius: 6, padding: "12px 18px", fontWeight: 900 }}>
              Tekrar dene
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
