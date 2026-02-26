"use client";

import { ChangeEvent } from "react";

type Option = {
  value: string;
  label: string;
};

interface SelectProps {
  label?: string;
  value?: string;
  options: Option[];
  disabled?: boolean;
  error?: string;
  onChange?: (value: string) => void;
}

export default function Select({ label, value, options, disabled, error, onChange }: SelectProps) {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChange?.(event.target.value);
  };

  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-semibold text-gray-700">{label}</label>}
      <select
        className={`w-full rounded-xl border-2 bg-white px-4 py-2.5 text-sm text-gray-900 outline-none transition focus:ring-2 ${
          error
            ? "border-red-500 focus:border-red-500 focus:ring-red-500/40"
            : "border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/40"
        }`}
        value={value}
        onChange={handleChange}
        disabled={disabled}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}
