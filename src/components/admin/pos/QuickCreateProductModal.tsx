"use client";

import { useEffect, useRef, useState } from "react";
import { BoltIcon, XMarkIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { saveProduct } from "@/services/products";
import { useToast } from "@/contexts/ToastContext";
import type { ProductUI } from "@/types";

interface QuickCreateProductModalProps {
  initialBarcode: string;
  onClose: () => void;
  onCreated: (product: ProductUI) => void;
}

// Creación mínima de un producto directamente desde el POS, para cuando se
// va a vender algo que todavía no existe en el catálogo. A propósito pide
// solo lo esencial para vender ya (código, nombre, precio, stock) — el resto
// (foto, categoría) se completa después en Edición Masiva.
export default function QuickCreateProductModal({ initialBarcode, onClose, onCreated }: QuickCreateProductModalProps) {
  const { showToast } = useToast();
  const [barcode, setBarcode] = useState(initialBarcode);
  const [name, setName] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [stock, setStock] = useState(1);
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedBarcode = barcode.trim();
    const trimmedName = name.trim();

    if (!trimmedBarcode || !trimmedName || !price || Number(price) <= 0) {
      showToast("Completa código, nombre y precio", "error");
      return;
    }

    setSaving(true);
    try {
      await saveProduct({
        barcode: trimmedBarcode,
        name: trimmedName,
        sale_price: Number(price),
        stock: Number(stock) || 0,
        is_active: true,
      } as any);

      const product: ProductUI = {
        id: trimmedBarcode,
        barcode: trimmedBarcode,
        name: trimmedName,
        price: Number(price),
        image: "/file.svg",
        slug: trimmedName.toLowerCase().trim().replace(/\s+/g, "-"),
        description: "",
        categories: [],
        stock: Number(stock) || 0,
        featured: false,
        isActive: true,
      };

      showToast(`Producto creado: ${trimmedName}`, "success");
      onCreated(product);
    } catch (err: any) {
      showToast(err?.message || "Error al crear el producto", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#111] border border-white/10 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-brand-400">
            <BoltIcon className="h-5 w-5" />
            <h2 className="text-sm font-black uppercase tracking-widest">Creación rápida</h2>
          </div>
          <button type="button" onClick={onClose} className="text-white/40 hover:text-white">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <p className="text-xs text-white/40 mb-4">
          Producto no encontrado. Complétalo con lo esencial para venderlo ahora; puedes agregar foto y
          categoría después en Edición Masiva.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">
              Código de barras
            </label>
            <input
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-white font-mono text-sm outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">
              Nombre *
            </label>
            <input
              ref={nameRef}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-brand-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">
                Precio *
              </label>
              <input
                type="number"
                inputMode="decimal"
                min={1}
                required
                value={price}
                onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-1">
                Stock
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={stock}
                onChange={(e) => setStock(Number(e.target.value) || 0)}
                className="w-full bg-black border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-brand-500"
              />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl bg-white/5 text-white/60 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-[2] h-11 rounded-xl bg-brand-500 text-black text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 active:bg-brand-600 transition-colors"
            >
              {saving && <ArrowPathIcon className="h-4 w-4 animate-spin" />}
              Crear y agregar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
