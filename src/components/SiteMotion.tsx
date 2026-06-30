export type SiteMotionVariant =
  | "macro"
  | "crypto"
  | "trend"
  | "dollar"
  | "network"
  | "live"
  | "clock"
  | "compare"
  | "path"
  | "community"
  | "bars"
  | "pulse";

type SiteMotionProps = {
  variant?: SiteMotionVariant;
  className?: string;
};

export function SiteMotion({ variant = "macro", className = "" }: SiteMotionProps) {
  const classes = `site-motion site-motion--${variant} ${className}`.trim();

  return (
    <span className={classes} aria-hidden="true">
      {variant === "macro" ? <MacroMotion /> : null}
      {variant === "crypto" ? <CryptoMotion /> : null}
      {variant === "trend" ? <TrendMotion /> : null}
      {variant === "dollar" ? <DollarMotion /> : null}
      {variant === "network" ? <NetworkMotion /> : null}
      {variant === "live" ? <LiveMotion /> : null}
      {variant === "clock" ? <ClockMotion /> : null}
      {variant === "compare" ? <CompareMotion /> : null}
      {variant === "path" ? <PathMotion /> : null}
      {variant === "community" ? <CommunityMotion /> : null}
      {variant === "bars" ? <BarsMotion /> : null}
      {variant === "pulse" ? <PulseMotion /> : null}
    </span>
  );
}

function MacroMotion() {
  return (
    <svg className="site-motion-svg" viewBox="0 0 100 100">
      <circle className="site-motion-macro-glow" cx="50" cy="50" r="45" />
      <path className="site-motion-spin site-motion-stroke site-motion-stroke--thin" d="M50 15 A35 35 0 1 1 49.9 15" strokeDasharray="2 2" />
      <circle className="site-motion-stroke" cx="50" cy="50" r="25" fill="none" />
      <path className="site-motion-wave" d="M20 55 Q40 25 60 55 T100 55" fill="none" />
      <circle className="site-motion-dot" cx="50" cy="50" r="3" />
    </svg>
  );
}

function CryptoMotion() {
  return (
    <svg className="site-motion-svg" viewBox="0 0 100 100">
      <circle className="site-motion-spin site-motion-stroke site-motion-stroke--amber" cx="50" cy="50" r="30" fill="none" strokeDasharray="5 5" />
      <text className="site-motion-text site-motion-text--amber" x="50" y="62" textAnchor="middle">B</text>
      <path className="site-motion-crypto-wave" d="M35 50 Q50 30 65 50" fill="none" />
    </svg>
  );
}

function TrendMotion() {
  return (
    <svg className="site-motion-svg" viewBox="0 0 100 100">
      <path className="site-motion-trend-line" d="M10 80 L30 60 L50 70 L70 30 L90 40" fill="none" />
      <circle className="site-motion-blink-dot" cx="90" cy="40" r="4" />
      <rect className="site-motion-fade-box" x="65" y="25" width="10" height="10" />
    </svg>
  );
}

function DollarMotion() {
  return (
    <svg className="site-motion-svg" viewBox="0 0 100 100">
      <text className="site-motion-text site-motion-text--blue site-motion-breathe" x="50" y="60" textAnchor="middle">$</text>
      <path className="site-motion-stroke site-motion-stroke--faint" d="M30 40 L70 40 M30 70 L70 70" />
      <path className="site-motion-stroke site-motion-stroke--bold" d="M50 20 L50 30 M50 70 L50 80" />
      <path className="site-motion-signal-line" d="M20 50 H30 M70 50 H80" />
    </svg>
  );
}

function NetworkMotion() {
  return (
    <svg className="site-motion-svg" viewBox="0 0 100 100">
      <circle className="site-motion-node site-motion-node--teal" cx="30" cy="30" r="5" />
      <circle className="site-motion-node site-motion-node--blue" cx="70" cy="40" r="4" />
      <circle className="site-motion-node site-motion-node--teal site-motion-node--large" cx="50" cy="70" r="6" />
      <path className="site-motion-network-line" d="M30 30 L70 40 L50 70 Z" />
      <circle className="site-motion-network-ring" cx="50" cy="50" r="40" fill="none" />
    </svg>
  );
}

function LiveMotion() {
  return (
    <svg className="site-motion-svg" viewBox="0 0 100 100">
      <circle className="site-motion-live-core" cx="50" cy="50" r="10" />
      <circle className="site-motion-spin site-motion-stroke" cx="50" cy="50" r="30" fill="none" strokeDasharray="10 5" />
      <path className="site-motion-stroke site-motion-stroke--faint" d="M50 20 L50 35 M80 50 L65 50" />
      <rect className="site-motion-live-track" x="20" y="70" width="60" height="15" rx="4" />
      <rect className="site-motion-live-fill" x="25" y="75" width="20" height="5" rx="2" />
    </svg>
  );
}

function ClockMotion() {
  return (
    <svg className="site-motion-svg" viewBox="0 0 100 100">
      <circle className="site-motion-stroke site-motion-stroke--amber site-motion-stroke--soft" cx="50" cy="50" r="40" fill="none" />
      <path className="site-motion-slow-spin site-motion-stroke site-motion-stroke--amber site-motion-stroke--bold" d="M50 20 V50 H75" fill="none" />
      <rect className="site-motion-clock-tick" x="45" y="10" width="10" height="4" rx="1" />
      <rect className="site-motion-clock-data" x="86" y="45" width="4" height="10" rx="1" />
    </svg>
  );
}

function CompareMotion() {
  return (
    <svg className="site-motion-svg" viewBox="0 0 100 100">
      <rect className="site-motion-compare-frame" x="15" y="20" width="70" height="60" rx="8" fill="none" />
      <rect className="site-motion-compare-bar site-motion-compare-bar--one" x="25" y="35" width="20" height="30" />
      <rect className="site-motion-compare-bar site-motion-compare-bar--two" x="55" y="45" width="20" height="20" />
      <path className="site-motion-stroke site-motion-stroke--faint" d="M10 50 H90" />
    </svg>
  );
}

function PathMotion() {
  return (
    <svg className="site-motion-svg" viewBox="0 0 100 100">
      <path className="site-motion-path-line" d="M15 80 Q30 50 50 50 T85 20" fill="none" />
      <circle className="site-motion-node site-motion-node--teal" cx="15" cy="80" r="4" />
      <circle className="site-motion-live-core site-motion-live-core--small" cx="50" cy="50" r="4" />
      <circle className="site-motion-node site-motion-node--teal site-motion-node--pulse" cx="85" cy="20" r="6" />
    </svg>
  );
}

function CommunityMotion() {
  return (
    <svg className="site-motion-svg" viewBox="0 0 100 100">
      <circle className="site-motion-node site-motion-node--blue" cx="50" cy="35" r="8" />
      <circle className="site-motion-node site-motion-node--blue site-motion-node--muted" cx="30" cy="65" r="6" />
      <circle className="site-motion-node site-motion-node--blue site-motion-node--muted" cx="70" cy="65" r="6" />
      <path className="site-motion-stroke site-motion-stroke--faint" d="M50 35 L30 65 M50 35 L70 65" />
      <path className="site-motion-community-base" d="M20 85 H80" />
    </svg>
  );
}

function BarsMotion() {
  return (
    <svg className="site-motion-svg" viewBox="0 0 100 100">
      <rect className="site-motion-bar site-motion-bar--one" x="10" y="70" width="15" height="20" rx="2" />
      <rect className="site-motion-bar site-motion-bar--two" x="30" y="60" width="15" height="30" rx="2" />
      <rect className="site-motion-bar site-motion-bar--three" x="50" y="50" width="15" height="40" rx="2" />
      <rect className="site-motion-bar site-motion-bar--four" x="70" y="40" width="15" height="50" rx="2" />
    </svg>
  );
}

function PulseMotion() {
  return (
    <svg className="site-motion-svg" viewBox="0 0 100 100">
      <circle className="site-motion-pulse-ring" cx="50" cy="50" r="40" fill="none" />
      <circle className="site-motion-live-core" cx="50" cy="50" r="10" />
      <g className="site-motion-spin">
        <path className="site-motion-stroke" d="M50 20 L50 80 M20 50 L80 50" />
      </g>
    </svg>
  );
}
