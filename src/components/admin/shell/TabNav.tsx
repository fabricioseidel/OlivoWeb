"use client";

import React from "react";
import Link from "next/link";

export type Tab = {
  key: string;
  label: string;
  href?: string;
  count?: number;
  badge?: string;
  disabled?: boolean;
};

type Props = {
  tabs: Tab[];
  value: string;
  onChange?: (key: string) => void;
  className?: string;
  variant?: "pills" | "underline";
};

export default function TabNav({
  tabs,
  value,
  onChange,
  className = "",
  variant = "pills",
}: Props) {
  return (
    <div
      role="tablist"
      className={`flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1 ${className}`}
    >
      {tabs.map((tab) => {
        const active = tab.key === value;
        const content = (
          <>
            <span className="truncate">{tab.label}</span>
            {typeof tab.count === "number" && (
              <span
                className={`ml-1.5 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold ${
                  active
                    ? "bg-white/20 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {tab.count}
              </span>
            )}
            {tab.badge && (
              <span
                className={`ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                  active ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"
                }`}
              >
                {tab.badge}
              </span>
            )}
          </>
        );

        const pillClasses =
          variant === "pills"
            ? `inline-flex items-center min-h-[40px] px-4 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                active
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "bg-white text-gray-700 ring-1 ring-gray-200 hover:ring-emerald-300 hover:text-emerald-700"
              } ${tab.disabled ? "opacity-50 cursor-not-allowed" : ""}`
            : `inline-flex items-center min-h-[44px] px-3 sm:px-4 border-b-2 text-sm font-semibold whitespace-nowrap transition-all ${
                active
                  ? "border-emerald-600 text-emerald-700"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
              } ${tab.disabled ? "opacity-50 cursor-not-allowed" : ""}`;

        if (tab.href && !tab.disabled) {
          return (
            <Link
              key={tab.key}
              href={tab.href}
              role="tab"
              aria-selected={active}
              className={pillClasses}
            >
              {content}
            </Link>
          );
        }
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange?.(tab.key)}
            className={pillClasses}
          >
            {content}
          </button>
        );
      })}
    </div>
  );
}
