"use client";

import React from "react";
import { getStatusConfig, type StatusKey } from "@/lib/admin/statusMap";

type Size = "sm" | "md";

type Props = {
  status: StatusKey | null | undefined;
  size?: Size;
  showDot?: boolean;
  className?: string;
};

export default function StatusBadge({
  status,
  size = "md",
  showDot = true,
  className = "",
}: Props) {
  const cfg = getStatusConfig(status);
  const sizeClasses =
    size === "sm"
      ? "px-2 py-0.5 text-[10px] gap-1"
      : "px-2.5 py-1 text-xs gap-1.5";

  return (
    <span
      className={`inline-flex items-center font-semibold uppercase tracking-wide rounded-full ring-1 ${cfg.classes} ${sizeClasses} ${className}`}
    >
      {showDot && (
        <span
          aria-hidden
          className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}
        />
      )}
      {cfg.label}
    </span>
  );
}
