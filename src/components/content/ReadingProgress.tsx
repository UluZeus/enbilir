"use client";

import { useEffect, useState } from "react";

export function ReadingProgress({ label }: { label: string }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const article = document.querySelector<HTMLElement>("[data-reading-article]");
        if (!article) return;

        const rect = article.getBoundingClientRect();
        const start = window.scrollY + rect.top;
        const available = Math.max(article.offsetHeight - window.innerHeight, 1);
        const next = Math.min(100, Math.max(0, ((window.scrollY - start) / available) * 100));
        setProgress(next);
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div className="reading-progress-v3" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
      <span style={{ width: `${progress}%` }} />
    </div>
  );
}
