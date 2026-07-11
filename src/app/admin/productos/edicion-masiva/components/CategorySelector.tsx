"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useCategories } from "@/hooks/useCategories";
import { ChevronDownIcon, CheckIcon } from "@heroicons/react/24/outline";

export default function CategorySelector({ value, isDirty, onChange }: { value: string[]; isDirty: boolean; onChange: (next: string[]) => void }) {
  const { categories: categoryObjects } = useCategories();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Compara sin distinguir mayúsculas/minúsculas: si el valor guardado en el
  // producto ("bebidas") difiere solo en casing de la categoría canónica
  // ("Bebidas"), deben verse como la MISMA opción, no como dos entradas.
  const options = useMemo(() => {
    const byLower = new Map<string, string>();
    categoryObjects.forEach((c) => byLower.set(c.name.trim().toLowerCase(), c.name.trim()));
    value.forEach((c) => {
      const key = c.trim().toLowerCase();
      if (!byLower.has(key)) byLower.set(key, c.trim());
    });
    return Array.from(byLower.values()).sort((a, b) => a.localeCompare(b, "es"));
  }, [categoryObjects, value]);

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
    // Cierra si la página/tabla detrás se desplaza (el panel es position:fixed y
    // quedaría desalineado), pero ignora el scroll que ocurre dentro del propio
    // panel — si no, listar categorías con scroll lo cerraba de inmediato.
    const closeOnOutsideScroll = (e: Event) => {
      if (panelRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener("mousedown", onClickOutside);
    window.addEventListener("scroll", closeOnOutsideScroll, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("scroll", closeOnOutsideScroll, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const toggleCategory = (cat: string) => {
    const key = cat.trim().toLowerCase();
    const alreadySelected = value.some((c) => c.trim().toLowerCase() === key);
    const next = alreadySelected
      ? value.filter((c) => c.trim().toLowerCase() !== key)
      : [...value, cat];
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
            const checked = value.some((c) => c.trim().toLowerCase() === cat.trim().toLowerCase());
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
