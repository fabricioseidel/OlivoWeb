"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useCategories } from "@/contexts/CategoryContext";
import { ChevronDownIcon, CheckIcon } from "@heroicons/react/24/outline";

export default function CategorySelector({ value, isDirty, onChange }: { value: string[]; isDirty: boolean; onChange: (next: string[]) => void }) {
  const { categories: allCategories } = useCategories();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const options = useMemo(() => {
    const set = new Set<string>(allCategories);
    value.forEach((c) => set.add(c));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "es"));
  }, [allCategories, value]);

  const toggleOpen = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const width = Math.max(r.width, 240);
      const left = Math.min(r.left, window.innerWidth - width - 8);
      const top = Math.min(r.bottom + 4, window.innerHeight - 280);
      setPos({ top, left, width });
    }
    setOpen(!open);
  };

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (panelRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener("mousedown", onClickOutside);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const toggleCategory = (cat: string) => {
    const next = value.includes(cat) ? value.filter((c) => c !== cat) : [...value, cat];
    onChange(next);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggleOpen}
        className={`w-full flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.05em] transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${
          isDirty
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-inner"
            : value.length > 0
            ? "bg-gray-100 text-gray-600 border border-transparent hover:bg-gray-200"
            : "bg-rose-50 text-rose-400 border border-rose-100 hover:bg-rose-100"
        }`}
      >
        <span className="flex-1 truncate text-left">{value.length > 0 ? value.join(", ") : "Sin categoría"}</span>
        <ChevronDownIcon className={`w-3 h-3 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && pos && (
        <div
          ref={panelRef}
          style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width }}
          className="z-[60] max-h-64 overflow-y-auto bg-white rounded-xl border border-gray-200 shadow-2xl p-1.5"
        >
          {options.length === 0 && (
            <p className="px-2 py-2 text-[10px] text-gray-400 font-bold">No hay categorías creadas</p>
          )}
          {options.map((cat) => {
            const checked = value.includes(cat);
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-[10px] font-black uppercase tracking-wide transition-colors ${
                  checked ? "bg-emerald-50 text-emerald-700" : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                <span
                  className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                    checked ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-300"
                  }`}
                >
                  {checked && <CheckIcon className="w-2.5 h-2.5" strokeWidth={3} />}
                </span>
                <span className="truncate">{cat}</span>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
