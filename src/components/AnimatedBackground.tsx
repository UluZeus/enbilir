import type { CSSProperties } from "react";
import type { SiteVisualSettings } from "@/lib/site-visual-settings";
import { isVisualEnabled } from "@/lib/site-visual-settings";

type AnimatedBackgroundProps = {
  settings: SiteVisualSettings;
};

function imageVariable(url: string) {
  return url ? `url("${url.replaceAll('"', "%22")}")` : "none";
}

export function AnimatedBackground({ settings }: AnimatedBackgroundProps) {
  const animationsEnabled = isVisualEnabled(settings, "animationsEnabled");
  const card3dEnabled = isVisualEnabled(settings, "card3dEnabled");
  const style = {
    "--visual-gradient-primary": settings.gradientPrimary,
    "--visual-gradient-secondary": settings.gradientSecondary,
    "--visual-accent": settings.accentColor,
    "--visual-hero-image": imageVariable(settings.heroBackgroundImageUrl),
    "--visual-home-overlay-image": imageVariable(settings.homeOverlayImageUrl),
    "--visual-ad-image": imageVariable(settings.adImageUrl),
  } as CSSProperties;

  return (
    <div
      aria-hidden="true"
      className={`animated-background ${animationsEnabled ? "" : "visual-motion-off"} ${
        card3dEnabled ? "" : "visual-card3d-off"
      }`}
      style={style}
    >
      <div className="animated-background__mesh" />
      <div className="animated-background__market-grid" />
      <div className="animated-background__noise" />
    </div>
  );
}
