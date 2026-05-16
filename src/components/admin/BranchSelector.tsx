"use client";

import React, { useState, useRef, useEffect } from "react";
import { BuildingStorefrontIcon, ChevronDownIcon, CheckIcon } from "@heroicons/react/24/outline";
import { useBranch } from "@/contexts/BranchContext";

interface BranchSelectorProps {
  collapsed?: boolean;
}

export default function BranchSelector({ collapsed = false }: BranchSelectorProps) {
  const { branches, currentBranch, setBranch } = useBranch();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (branches.length <= 1) return null;

  return (
    <div ref={ref} className="relative px-3 mb-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={currentBranch?.name ?? "Sucursal"}
        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/10 ${
          collapsed ? "justify-center" : "justify-between"
        }`}
      >
        <span className="flex items-center gap-2 min-w-0">
          <BuildingStorefrontIcon className="h-4 w-4 text-emerald-400 shrink-0" />
          {!collapsed && (
            <span className="text-[10px] font-black uppercase tracking-widest text-white truncate">
              {currentBranch?.name ?? "—"}
            </span>
          )}
        </span>
        {!collapsed && (
          <ChevronDownIcon
            className={`h-3 w-3 text-white/40 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 z-50 bg-emerald-950 border border-white/10 rounded-xl shadow-xl overflow-hidden">
          {branches.map((branch) => (
            <button
              key={branch.id}
              type="button"
              onClick={() => { setBranch(branch); setOpen(false); }}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/10 transition-colors"
            >
              <span className="text-[11px] font-bold text-white uppercase tracking-widest">
                {branch.name}
              </span>
              {branch.id === currentBranch?.id && (
                <CheckIcon className="h-4 w-4 text-emerald-400 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
