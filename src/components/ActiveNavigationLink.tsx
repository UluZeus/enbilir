"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type ActiveNavigationLinkProps = {
  href: string;
  children: ReactNode;
  className: string;
  activeClassName?: string;
  exact?: boolean;
  dataNavKey?: string;
  dataProductTone?: string;
};

export function ActiveNavigationLink({
  href,
  children,
  className,
  activeClassName = "ring-2 ring-[#0f766e] ring-offset-1",
  exact = false,
  dataNavKey,
  dataProductTone,
}: ActiveNavigationLinkProps) {
  const pathname = usePathname();
  const hrefPath = href.split("?")[0];
  const isCurrent = exact ? pathname === hrefPath : pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);

  return (
    <Link
      href={href}
      aria-current={isCurrent ? "page" : undefined}
      className={`${className} ${isCurrent ? activeClassName : ""}`}
      data-nav-key={dataNavKey}
      data-product-tone={dataProductTone}
    >
      {children}
    </Link>
  );
}
