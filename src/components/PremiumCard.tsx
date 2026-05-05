import type { HTMLAttributes, ReactNode } from "react";

type PremiumCardProps = {
  children: ReactNode;
  interactive?: boolean;
  dark?: boolean;
  className?: string;
} & HTMLAttributes<HTMLDivElement>;

export function PremiumCard({
  children,
  interactive = false,
  dark = false,
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
      {children}
    </div>
  );
}
