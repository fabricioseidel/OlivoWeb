"use client";

import React, { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRightIcon } from "@heroicons/react/24/outline";

type Tone = "default" | "emerald" | "amber" | "rose" | "sky" | "indigo";

type DeltaTone = "positive" | "negative" | "neutral";

type Props = {
  label: string;
  value: ReactNode;
  delta?: { value: string; tone?: DeltaTone };
  icon?: ReactNode;
  tone?: Tone;
  href?: string;
  hint?: string;
  className?: string;
};

const toneAccent: Record<Tone, string> = {
  default: "text-gray-700 bg-gray-100",
  emerald: "text-emerald-700 bg-emerald-100",
  amber: "text-amber-700 bg-amber-100",
  rose: "text-rose-700 bg-rose-100",
  sky: "text-sky-700 bg-sky-100",
  indigo: "text-indigo-700 bg-indigo-100",
};

const deltaTone: Record<DeltaTone, string> = {
  positive: "text-emerald-700 bg-emerald-50",
  negative: "text-rose-700 bg-rose-50",
  neutral: "text-gray-700 bg-gray-100",
};

export default function StatsCard({
  label,
  value,
  delta,
  icon,
  tone = "default",
  href,
  hint,
  className = "",
}: Props) {
  const body = (
    <div
      className={`relative h-full rounded-2xl bg-white ring-1 ring-gray-200 hover:ring-emerald-300 transition-all p-4 sm:p-5 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-gray-500">
          {label}
        </p>
        {icon && (
          <span
            className={`flex items-center justify-center w-8 h-8 rounded-xl ${toneAccent[tone]}`}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-black text-gray-900 leading-none">
          {value}
        </span>
        {delta && (
          <span
            className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
              deltaTone[delta.tone ?? "neutral"]
            }`}
          >
            {delta.value}
          </span>
        )}
      </div>
      {hint && (
        <p className="mt-1 text-[11px] text-gray-500 truncate">{hint}</p>
      )}
      {href && (
        <ArrowUpRightIcon className="absolute top-3 right-3 w-4 h-4 text-gray-300 group-hover:text-emerald-500 transition-colors" />
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="group block min-h-[44px]">
        {body}
      </Link>
    );
  }
  return body;
}

export function StatsRow({
  children,
  cols = 4,
  className = "",
}: {
  children: ReactNode;
  cols?: 2 | 3 | 4;
  className?: string;
}) {
  const colClasses =
    cols === 2
      ? "grid-cols-2"
      : cols === 3
      ? "grid-cols-2 md:grid-cols-3"
      : "grid-cols-2 md:grid-cols-4";
  return (
    <div className={`grid gap-3 sm:gap-4 ${colClasses} ${className}`}>
      {children}
    </div>
  );
}
