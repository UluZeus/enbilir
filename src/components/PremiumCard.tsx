import type { HTMLAttributes, ReactNode } from "react";
import { SiteMotion, type SiteMotionVariant } from "@/components/SiteMotion";

type PremiumCardProps = {
  children: ReactNode;
  interactive?: boolean;
  dark?: boolean;
  motion?: SiteMotionVariant | false;
  className?: string;
} & HTMLAttributes<HTMLDivElement>;

export function PremiumCard({
  children,
  interactive = false,
  dark = false,
  motion,
  className = "",
  ...props
}: PremiumCardProps) {
  const classes = [
    "premium-card",
    interactive ? "premium-card--interactive" : "",
    dark ? "premium-card--dark" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...props}>
      {motion !== false ? <SiteMotion variant={motion ?? (dark ? "pulse" : "trend")} className="premium-card-motion-corner" /> : null}
      {children}
    </div>
  );
}
