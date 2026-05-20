"use client";

import React, { ReactNode } from "react";

type Props = {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  cta?: ReactNode;
  className?: string;
};

export default function EmptyState({
  icon,
  title,
  description,
  cta,
  className = "",
}: Props) {
  return (
    <div
      className={`flex flex-col items-center text-center py-10 px-4 ${className}`}
    >
      {icon && (
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 mb-3">
          {icon}
        </div>
      )}
      <h3 className="text-base font-bold text-gray-900">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-gray-500 max-w-md">{description}</p>
      )}
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  );
}
