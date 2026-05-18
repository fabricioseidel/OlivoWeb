"use client";

import React, { ReactNode } from "react";

type Props = {
  primary: ReactNode;
  secondary?: ReactNode;
  meta?: ReactNode;
  sticky?: boolean;
  className?: string;
};

export default function ActionBar({
  primary,
  secondary,
  meta,
  sticky = true,
  className = "",
}: Props) {
  return (
    <div
      className={`${
        sticky
          ? "fixed inset-x-0 bottom-0 z-30 md:relative md:inset-auto md:z-auto"
          : "relative"
      } bg-white/95 backdrop-blur md:bg-transparent md:backdrop-blur-0 border-t border-gray-200 md:border-0 md:rounded-2xl md:ring-1 md:ring-gray-200 md:bg-white md:p-3 ${className}`}
      style={
        sticky
          ? { paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }
          : undefined
      }
    >
      <div className="px-4 pt-3 md:p-0 flex items-center gap-3 flex-wrap md:flex-nowrap">
        {meta && (
          <div className="text-xs text-gray-600 min-w-0 truncate flex-1 md:flex-initial md:mr-auto">
            {meta}
          </div>
        )}
        <div className="flex items-center gap-2 ml-auto md:ml-0">
          {secondary}
          {primary}
        </div>
      </div>
    </div>
  );
}
