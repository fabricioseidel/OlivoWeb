"use client";

import React, { ReactNode } from "react";

type Tone = "emerald" | "dark";

type Props = {
  title: string;
  subtitle?: string;
  kicker?: string;
  icon?: ReactNode;
  right?: ReactNode;
  tone?: Tone;
  className?: string;
};

const toneClasses: Record<Tone, string> = {
  emerald: "from-emerald-950 via-emerald-900 to-emerald-950",
  dark: "from-[#0a0a0a] via-[#111111] to-[#0a0a0a]",
};

export default function HeroHeader({
  title,
  subtitle,
  kicker,
  icon,
  right,
  tone = "emerald",
  className = "",
}: Props) {
  return (
    <header
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${toneClasses[tone]} text-white px-5 py-6 sm:px-8 sm:py-8 shadow-xl ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-20 w-72 h-72 rounded-full bg-emerald-500/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-16 w-72 h-72 rounded-full bg-emerald-400/10 blur-3xl"
      />
      <div className="relative flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="min-w-0">
          {kicker && (
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-300/80">
              {kicker}
            </p>
          )}
          <div className="mt-1 flex items-center gap-3">
            {icon && (
              <span className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/10 ring-1 ring-white/15">
                {icon}
              </span>
            )}
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight">
              {title}
            </h1>
          </div>
          {subtitle && (
            <p className="mt-2 text-sm sm:text-base text-emerald-100/70 max-w-2xl">
              {subtitle}
            </p>
          )}
        </div>
        {right && (
          <div className="flex flex-wrap items-center gap-2 sm:justify-end shrink-0">
            {right}
          </div>
        )}
      </div>
    </header>
  );
}
