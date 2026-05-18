"use client";

import React from "react";

export type FilterOption = {
  value: string;
  label: string;
  count?: number;
};

type Props = {
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
};

export default function FilterChips({
  options,
  value,
  onChange,
  label,
  className = "",
}: Props) {
  return (
    <div className={className}>
      {label && (
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">
          {label}
        </p>
      )}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`inline-flex items-center min-h-[36px] px-3 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                active
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-white text-gray-700 ring-1 ring-gray-200 hover:ring-emerald-300"
              }`}
            >
              {opt.label}
              {typeof opt.count === "number" && (
                <span
                  className={`ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${
                    active ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {opt.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
