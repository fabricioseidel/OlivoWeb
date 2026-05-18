"use client";

import React, { ReactNode } from "react";
import Link from "next/link";
import { ChevronRightIcon } from "@heroicons/react/24/outline";

type Crumb = { label: string; href?: string };

type MaxWidth = "lg" | "xl" | "2xl" | "4xl" | "6xl" | "7xl" | "full";

const maxWidthClasses: Record<MaxWidth, string> = {
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "4xl": "max-w-4xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
  full: "max-w-none",
};

type Props = {
  children: ReactNode;
  breadcrumbs?: Crumb[];
  hero?: ReactNode;
  tabs?: ReactNode;
  className?: string;
  maxWidth?: MaxWidth;
  bottomPadding?: boolean;
};

export default function PageShell({
  children,
  breadcrumbs,
  hero,
  tabs,
  className = "",
  maxWidth = "7xl",
  bottomPadding = true,
}: Props) {
  return (
    <div
      className={`mx-auto w-full ${maxWidthClasses[maxWidth]} space-y-5 sm:space-y-6 ${
        bottomPadding ? "pb-28 sm:pb-10" : ""
      } ${className}`}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs crumbs={breadcrumbs} />
      )}
      {hero}
      {tabs}
      {children}
    </div>
  );
}

function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav
      aria-label="Breadcrumbs"
      className="flex items-center flex-wrap gap-1 text-xs text-gray-500"
    >
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <React.Fragment key={`${c.label}-${i}`}>
            {c.href && !isLast ? (
              <Link
                href={c.href}
                className="hover:text-emerald-700 transition-colors font-medium"
              >
                {c.label}
              </Link>
            ) : (
              <span
                className={
                  isLast ? "text-gray-900 font-semibold" : "font-medium"
                }
              >
                {c.label}
              </span>
            )}
            {!isLast && (
              <ChevronRightIcon className="w-3.5 h-3.5 text-gray-300" />
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
