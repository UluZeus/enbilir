type HomeMotionCueVariant = "ai" | "badge" | "globe" | "line" | "radar" | "shield" | "signal";

type HomeMotionProps = {
  className?: string;
};

// CSS shader-inspired backdrop: keeps the WebGL mood from the reference without adding runtime canvas cost.
export function HomeShaderBackdrop() {
  return (
    <div className="home-shader-backdrop" aria-hidden="true">
      <span className="home-shader-flow home-shader-flow--one" />
      <span className="home-shader-flow home-shader-flow--two" />
      <span className="home-shader-node home-shader-node--one" />
      <span className="home-shader-node home-shader-node--two" />
      <span className="home-shader-node home-shader-node--three" />
    </div>
  );
}

export function HomeMotionCue({ variant, className = "" }: HomeMotionProps & { variant: HomeMotionCueVariant }) {
  return <span className={`home-motion-cue home-motion-cue--${variant} ${className}`.trim()} aria-hidden="true" />;
}

// CSS-only market study visual: animated bars, trend flow, and orbital rings without canvas weight.
export function HomeHeroDataFlow() {
  return (
    <div className="home-market-visual" aria-hidden="true">
      <div className="home-market-window-dots">
        <span />
        <span />
        <span />
      </div>

      <svg className="home-market-trend" viewBox="0 0 600 220" preserveAspectRatio="none">
        <defs>
          <linearGradient id="home-market-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#44e2cd" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#44e2cd" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="home-market-line" x1="0" x2="1">
            <stop offset="0%" stopColor="#98cbff" />
            <stop offset="58%" stopColor="#44e2cd" />
            <stop offset="100%" stopColor="#f9bd22" />
          </linearGradient>
        </defs>
        <path className="home-market-trend-area" d="M0 178 C45 166 72 182 112 151 S177 119 220 140 S284 169 326 112 S393 64 438 91 S516 124 600 42 L600 220 L0 220 Z" fill="url(#home-market-area)" />
        <path className="home-market-trend-line" pathLength="1" d="M0 178 C45 166 72 182 112 151 S177 119 220 140 S284 169 326 112 S393 64 438 91 S516 124 600 42" fill="none" stroke="url(#home-market-line)" strokeLinecap="round" strokeWidth="4" />
        <circle className="home-market-trend-point home-market-trend-point--one" cx="220" cy="140" r="5" />
        <circle className="home-market-trend-point home-market-trend-point--two" cx="438" cy="91" r="5" />
        <circle className="home-market-trend-point home-market-trend-point--three" cx="600" cy="42" r="7" />
      </svg>

      <div className="home-market-bars">
        {Array.from({ length: 10 }, (_, index) => <span className="home-market-bar" key={index} />)}
      </div>

      <div className="home-market-orbits">
        <span className="home-market-ring home-market-ring--outer" />
        <span className="home-market-ring home-market-ring--middle" />
        <span className="home-market-ring home-market-ring--inner" />
        <span className="home-market-orbit-core" />
      </div>

      <div className="home-market-mini-rings">
        <span className="home-market-mini-ring home-market-mini-ring--one" />
        <span className="home-market-mini-ring home-market-mini-ring--two" />
        <span className="home-market-mini-ring home-market-mini-ring--three" />
      </div>

      <span className="home-market-scan" />
    </div>
  );
}

export function HomeInsightSignal() {
  return <span className="home-insight-scan" aria-hidden="true" />;
}

// A restrained SVG pulse based on the reference animation: AI activity without a casino/trading-terminal tone.
export function HomeAiPulseCore() {
  return (
    <div className="home-ai-pulse-core" aria-hidden="true">
      <svg className="home-ai-pulse-svg" viewBox="0 0 100 100" role="img">
        <circle className="home-ai-pulse-ring home-ai-pulse-ring--outer" cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle className="home-ai-pulse-ring home-ai-pulse-ring--inner" cx="50" cy="50" r="24" fill="none" stroke="currentColor" strokeWidth="0.8" />
        <circle className="home-ai-pulse-center" cx="50" cy="50" r="9" fill="currentColor" />
        <g className="home-ai-pulse-cross">
          <path d="M50 21 L50 79 M21 50 L79 50" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
        </g>
        <path
          className="home-ai-pulse-orbit"
          d="M24 50a26 26 0 0 1 52 0"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.4"
        />
      </svg>
    </div>
  );
}

// Mini loop icons are intentionally abstract: they suggest data, AI and learning without a trading-app tone.
export function HomeMiniLoop({ tone }: HomeMotionProps & { tone: string }) {
  return (
    <span className={`home-mini-loop home-mini-loop--${tone}`} aria-hidden="true">
      <span />
      <span />
      <span />
    </span>
  );
}

export function HomeTimelinePulse() {
  return <span className="home-timeline-pulse" aria-hidden="true" />;
}

export function HomeAcademyMotion({ tone }: { tone: string }) {
  return (
    <div className={`home-academy-thumb home-academy-thumb--motion home-academy-thumb--${tone}`} aria-hidden="true">
      <span />
      <span />
      <span />
      <span className="home-academy-stream" />
      <span className="home-academy-node" />
      <span className="home-academy-radar" />
    </div>
  );
}

export function HomeFeatureMotion({ tone }: { tone: string }) {
  const variant = tone === "market" ? "clock" : tone === "community" ? "pulse" : "bars";

  return (
    <div className={`home-feature-visual home-feature-visual--motion home-feature-visual--${tone} home-feature-visual--${variant}`} aria-hidden="true">
      <span className="home-feature-visual-glow" />
      {variant === "bars" ? (
        <svg className="home-feature-svg home-feature-svg--bars" viewBox="0 0 100 100">
          <rect className="home-feature-bar home-feature-bar--one" x="10" y="70" width="15" height="20" rx="2" />
          <rect className="home-feature-bar home-feature-bar--two" x="30" y="60" width="15" height="30" rx="2" />
          <rect className="home-feature-bar home-feature-bar--three" x="50" y="50" width="15" height="40" rx="2" />
          <rect className="home-feature-bar home-feature-bar--four" x="70" y="40" width="15" height="50" rx="2" />
        </svg>
      ) : null}
      {variant === "clock" ? (
        <svg className="home-feature-svg home-feature-svg--clock" viewBox="0 0 100 100">
          <circle className="home-feature-clock-ring" cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeDasharray="10 5" strokeWidth="4" />
          <path className="home-feature-clock-hand" d="M50 30 L50 50 L65 50" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
          <circle className="home-feature-clock-center" cx="50" cy="50" r="3.5" fill="currentColor" />
        </svg>
      ) : null}
      {variant === "pulse" ? (
        <svg className="home-feature-svg home-feature-svg--pulse" viewBox="0 0 100 100">
          <circle className="home-feature-pulse-ring" cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="1" />
          <circle className="home-feature-pulse-center" cx="50" cy="50" r="10" fill="currentColor" />
          <g className="home-feature-pulse-cross">
            <path d="M50 20 L50 80 M20 50 L80 50" fill="none" stroke="currentColor" strokeWidth="2" />
          </g>
        </svg>
      ) : null}
    </div>
  );
}
