"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { uploadImageToCloudinaryServerAction } from "@/actions/upload";
import { useToast } from "@/contexts/ToastContext";

// ── Types ──────────────────────────────────────────────────────────────────

type Product = {
  id: number;
  barcode: string;
  name: string;
  category: string | null;
  description: string | null;
  sale_price: number;
  offer_price: number | null;
  measurement_unit: string;
  measurement_value: number;
  is_active: boolean;
  image_url: string | null;
  features: Record<string, string> | null;
  updated_at: string;
};

type FormState = {
  name: string;
  barcode: string;
  category: string;
  variant: string;
  description: string;
  uberSubCategory: string;
  productType: string;
  hfssItem: string;
  salePrice: string;
  offerPrice: string;
  measurementUnit: string;
  measurementValue: string;
  isActive: boolean;
  imageUrl: string;
};

type Stats = { total: number; active: number; withImg: number };

const EMPTY_FORM: FormState = {
  name: "",
  barcode: "",
  category: "",
  variant: "",
  description: "",
  uberSubCategory: "",
  productType: "",
  hfssItem: "",
  salePrice: "",
  offerPrice: "",
  measurementUnit: "un",
  measurementValue: "1",
  isActive: true,
  imageUrl: "",
};

// ── Main component ──────────────────────────────────────────────────────────

export default function CreadorUberEats() {
  const { showToast } = useToast();

  // Navigation
  const [tab, setTab] = useState<"visualizador" | "edicion" | "descarga">("visualizador");
  const [card, setCard] = useState(1);

  // Data
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, withImg: 0 });
  const [uberPreview, setUberPreview] = useState<Product[]>([]);

  // Form
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // UI states
  const [loading, setLoading] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  // ── Data fetching ──────────────────────────────────────────────────────

  async function loadProducts() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select(
          "id,barcode,name,category,image_url,is_active,sale_price,offer_price,description,features,measurement_unit,measurement_value,updated_at"
        )
        .order("name", { ascending: true });
      if (error) throw error;
      setProducts(data || []);
    } catch (e: any) {
      showToast("Error cargando productos: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const { data } = await supabase
        .from("categories")
        .select("name")
        .eq("is_active", true)
        .order("name", { ascending: true });
      setCategories((data || []).map((c: any) => c.name));
    } catch {
      // non-critical
    }
  }

  async function loadExportStats() {
    try {
      const { data } = await supabase.from("products").select("id,is_active,image_url");
      const rows = data || [];
      setStats({
        total: rows.length,
        active: rows.filter((p: any) => p.is_active).length,
        withImg: rows.filter((p: any) => p.image_url).length,
      });
    } catch {}
  }

  async function loadUberPreview() {
    setLoadingPreview(true);
    try {
      const { data } = await supabase
        .from("products")
        .select("id,barcode,name,category,image_url,sale_price,features,measurement_unit,measurement_value,offer_price,description,is_active,updated_at")
        .eq("is_active", true)
        .not("image_url", "is", null)
        .order("name", { ascending: true })
        .limit(30);
      setUberPreview((data || []) as Product[]);
    } catch {
    } finally {
      setLoadingPreview(false);
    }
  }

  // ── Tab switching ──────────────────────────────────────────────────────

  function switchTab(next: "visualizador" | "edicion" | "descarga") {
    setTab(next);
    if (next === "descarga") loadExportStats();
  }

  // ── Form helpers ──────────────────────────────────────────────────────

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function startNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setImagePreview(null);
    setCard(1);
    setTab("edicion");
  }

  function startEdit(p: Product) {
    setEditingId(p.id);
    setImagePreview(p.image_url || null);
    setForm({
      name: p.name || "",
      barcode: p.barcode || "",
      category: p.category || "",
      variant: p.features?.variante || "",
      description: p.description || "",
      uberSubCategory: p.features?.uber_sub_category || "",
      productType: p.features?.product_type || "",
      hfssItem: p.features?.hfss_item || "",
      salePrice: String(p.sale_price || ""),
      offerPrice: p.offer_price != null ? String(p.offer_price) : "",
      measurementUnit: p.measurement_unit || "un",
      measurementValue: String(p.measurement_value || "1"),
      isActive: p.is_active,
      imageUrl: p.image_url || "",
    });
    setCard(1);
    setTab("edicion");
  }

  // ── Image upload ──────────────────────────────────────────────────────

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setImagePreview(base64);
      const result = await uploadImageToCloudinaryServerAction(base64);
      if (!result.ok) {
        showToast("Error subiendo imagen: " + result.error, "error");
        setImagePreview(form.imageUrl || null);
        return;
      }
      setField("imageUrl", result.url!);
      setImagePreview(result.url!);
      showToast("✅ Imagen subida", "success");
    } catch (e: any) {
      showToast("Error: " + e.message, "error");
    } finally {
      setUploadingImage(false);
      // Reset input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // ── Save product ──────────────────────────────────────────────────────

  async function saveProduct() {
    if (!form.name.trim()) {
      showToast("El nombre es obligatorio", "error");
      setCard(1);
      return;
    }
    if (!form.barcode.trim()) {
      showToast("El código es obligatorio", "error");
      setCard(1);
      return;
    }

    const features: Record<string, string> = {};
    if (form.variant.trim()) features.variante = form.variant.trim();
    if (form.uberSubCategory.trim()) features.uber_sub_category = form.uberSubCategory.trim();
    if (form.productType) features.product_type = form.productType;
    if (form.hfssItem) features.hfss_item = form.hfssItem;

    const payload = {
      name: form.name.trim(),
      barcode: form.barcode.trim(),
      category: form.category || null,
      description: form.description.trim() || null,
      sale_price: parseFloat(form.salePrice) || 0,
      offer_price: form.offerPrice ? parseFloat(form.offerPrice) : null,
      measurement_unit: form.measurementUnit,
      measurement_value: parseFloat(form.measurementValue) || 1,
      is_active: form.isActive,
      image_url: form.imageUrl || null,
      features: Object.keys(features).length > 0 ? features : null,
      updated_at: new Date().toISOString(),
    };

    setSavingProduct(true);
    try {
      if (editingId) {
        const { error } = await supabase.from("products").update(payload).eq("id", editingId);
        if (error) throw error;
        showToast("✅ Producto actualizado", "success");
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
        showToast("✅ Producto creado", "success");
      }
      await loadProducts();
      setTab("visualizador");
    } catch (e: any) {
      showToast("Error guardando: " + e.message, "error");
    } finally {
      setSavingProduct(false);
    }
  }

  // ── CSV / JSON export ──────────────────────────────────────────────────

  function exportUberEatsCSV() {
    const eligible = products.filter(
      (p) => p.is_active && p.image_url && p.name && p.barcode
    );
    if (!eligible.length) {
      showToast("No hay productos activos con imagen para exportar", "error");
      return;
    }
    const headers = [
      "Item Code", "Item Name", "Category", "Sub Category",
      "Product Type", "Price", "Price With VAT", "VAT Percentage",
      "Description", "Image URL", "In Stock",
      "Measurement Unit", "Measurement Value",
      "HFSS Item", "Alcohol Units", "Quantity Restriction",
    ];
    const rows = eligible.map((p) => [
      p.barcode,
      `"${(p.name || "").replace(/"/g, '""')}"`,
      `"${(p.category || "").replace(/"/g, '""')}"`,
      `"${(p.features?.uber_sub_category || "").replace(/"/g, '""')}"`,
      p.features?.product_type || "",
      p.sale_price || 0,
      p.offer_price ?? p.sale_price ?? 0,
      "19",
      `"${(p.description || "").replace(/"/g, '""')}"`,
      p.image_url || "",
      p.is_active ? "TRUE" : "FALSE",
      p.measurement_unit || "un",
      p.measurement_value || 1,
      p.features?.hfss_item || "",
      "",
      "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `uber-eats-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`✅ CSV exportado: ${eligible.length} productos`, "success");
  }

  function exportAllJSON() {
    const blob = new Blob([JSON.stringify(products, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `productos-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`✅ JSON exportado: ${products.length} productos`, "success");
  }

  // ── Derived data ──────────────────────────────────────────────────────

  const filteredProducts = products.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.name || "").toLowerCase().includes(q) ||
      (p.barcode || "").toLowerCase().includes(q) ||
      (p.category || "").toLowerCase().includes(q)
    );
  });

  const today = new Date().toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  // ── Shared UI atoms ────────────────────────────────────────────────────

  const inputCls =
    "w-full px-3 py-2.5 border-[1.5px] border-gray-200 rounded-lg text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 transition";

  const selectCls =
    "w-full px-3 py-2.5 border-[1.5px] border-gray-200 rounded-lg text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 bg-white appearance-none transition";

  const labelCls =
    "block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-1.5";

  const fieldCls = "flex flex-col";

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Loading overlay ── */}
      {(loading || savingProduct) && (
        <div className="fixed inset-0 bg-white/80 z-50 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-green-600 rounded-full animate-spin" />
          <p className="text-sm font-medium text-gray-600">
            {savingProduct ? "Guardando producto..." : "Cargando..."}
          </p>
        </div>
      )}

      {/* ── Top navigation ── */}
      <nav className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm flex">
        {(
          [
            {
              id: "visualizador",
              label: "Visualizador",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M9 11l3 3L22 4" />
                  <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
                </svg>
              ),
            },
            {
              id: "edicion",
              label: "Edición",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              ),
            },
            {
              id: "descarga",
              label: "Descarga",
              icon: (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polyline points="8 17 12 21 16 17" />
                  <line x1="12" y1="12" x2="12" y2="21" />
                  <path d="M20.88 18.09A5 5 0 0018 9h-1.26A8 8 0 103 16.29" />
                </svg>
              ),
            },
          ] as const
        ).map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => switchTab(id)}
            className={`flex-1 flex flex-col items-center gap-1.5 py-3 px-2 text-[11px] font-semibold uppercase tracking-wider border-b-[3px] transition-colors ${
              tab === id
                ? "border-green-600 text-green-600"
                : "border-transparent text-gray-400 hover:bg-green-50 hover:text-green-600"
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </nav>

      {/* ════════════════════════════════════════════════════════
          VISUALIZADOR
      ════════════════════════════════════════════════════════ */}
      {tab === "visualizador" && (
        <div>
          <div className="bg-gradient-to-br from-green-600 to-green-500 text-white px-5 py-5 flex items-center justify-between">
            <h1 className="text-lg font-bold tracking-tight">Visualizador de Productos</h1>
            <span className="text-[11px] font-mono bg-white/20 px-2.5 py-1 rounded-full">{today}</span>
          </div>

          {/* Search + New */}
          <div className="flex gap-2 px-4 py-3 bg-white border-b border-gray-100 sticky top-[57px] z-30">
            <input
              type="text"
              placeholder="🔍  Buscar por nombre, código o categoría..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={inputCls + " flex-1"}
            />
            <button
              onClick={startNew}
              className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition whitespace-nowrap"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Nuevo
            </button>
          </div>

          {/* Count + refresh */}
          <div className="flex items-center justify-between px-4 py-2 text-xs text-gray-400 font-medium">
            <span>
              {filteredProducts.length} producto{filteredProducts.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={loadProducts}
              className="text-green-600 font-semibold hover:underline"
            >
              ↻ Actualizar
            </button>
          </div>

          {/* Product cards */}
          <div className="flex flex-col gap-2.5 px-4 py-2 pb-20">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="mx-auto mb-3 opacity-40">
                  <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                </svg>
                <p className="text-sm">{searchQuery ? "No se encontraron productos" : "No hay productos aún"}</p>
              </div>
            ) : (
              filteredProducts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => startEdit(p)}
                  className="bg-white rounded-xl shadow-sm flex items-center gap-3 p-3 cursor-pointer border border-transparent hover:border-green-400 hover:shadow-md transition"
                >
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="w-16 h-16 object-cover rounded-lg bg-gray-100 flex-shrink-0"
                      onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center text-gray-300 flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-800 truncate">
                      {p.name || "(sin nombre)"}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 flex gap-2 flex-wrap">
                      {p.barcode && <span>{p.barcode}</span>}
                      {p.category && <span>• {p.category}</span>}
                      {p.sale_price ? <span>• ${p.sale_price}</span> : null}
                    </div>
                    <div className="mt-1 flex gap-1 flex-wrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {p.is_active ? "Activo" : "Inactivo"}
                      </span>
                      {p.image_url && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-700">
                          📷 Imagen
                        </span>
                      )}
                      {p.features?.uber_sub_category && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                          UE
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); startEdit(p); }}
                    className="w-9 h-9 flex-shrink-0 bg-green-50 text-green-600 rounded-lg flex items-center justify-center hover:bg-green-600 hover:text-white transition"
                    aria-label="Editar"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          EDICIÓN
      ════════════════════════════════════════════════════════ */}
      {tab === "edicion" && (
        <div>
          <div className="bg-gradient-to-br from-green-600 to-green-500 text-white px-5 py-5 flex items-center justify-between">
            <h1 className="text-lg font-bold tracking-tight">Creador de Productos</h1>
            <span className="text-[11px] font-mono bg-white/20 px-2.5 py-1 rounded-full">
              {editingId ? `ID: ${editingId}` : "Nuevo"}
            </span>
          </div>

          {/* Card tabs */}
          <div className="mx-4 mt-4 bg-gray-100 rounded-t-xl overflow-hidden flex">
            {[1, 2].map((n) => (
              <button
                key={n}
                onClick={() => setCard(n)}
                className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-all ${
                  card === n
                    ? "bg-white text-green-600 border-green-600"
                    : "text-gray-500 border-transparent"
                }`}
              >
                CARD {n}
              </button>
            ))}
          </div>

          <div className="mx-4 bg-white rounded-b-xl shadow-md relative">
            {/* Exit button */}
            <div className="absolute top-3 right-3 z-10">
              <button
                onClick={() => {
                  if (confirm("¿Salir sin guardar los cambios?"))
                    setTab("visualizador");
                }}
                className="flex items-center gap-1.5 bg-red-50 text-red-500 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-500 hover:text-white transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                SALIR
              </button>
            </div>

            {/* ── CARD 1: imagen + datos base ── */}
            {card === 1 && (
              <div className="p-4 pt-12 space-y-3.5">
                {/* Image upload */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl aspect-[4/3] flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-green-500 hover:bg-green-50 transition overflow-hidden mb-1"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {imagePreview ? (
                    <>
                      <img
                        src={imagePreview}
                        alt="preview"
                        className="absolute inset-0 w-full h-full object-cover rounded-[10px]"
                      />
                      <div className="absolute inset-0 bg-black/45 flex flex-col items-center justify-center gap-1.5 text-white opacity-0 hover:opacity-100 transition rounded-[10px]">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        <span className="text-sm font-semibold">Cambiar imagen</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="text-gray-300">
                        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" />
                      </svg>
                      <span className="text-sm text-gray-400 font-medium">Toca para subir imagen</span>
                    </>
                  )}

                  {uploadingImage && (
                    <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center gap-2.5 rounded-[10px] z-10">
                      <div className="w-8 h-8 border-4 border-gray-200 border-t-green-600 rounded-full animate-spin" />
                      <span className="text-xs text-gray-500">Subiendo a Cloudinary...</span>
                    </div>
                  )}
                </div>

                <div className={fieldCls}>
                  <label className={labelCls}>Nombre</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    placeholder="Nombre del producto"
                    className={inputCls}
                  />
                </div>

                <div className={fieldCls}>
                  <label className={labelCls}>Código / Barcode</label>
                  <input
                    type="text"
                    value={form.barcode}
                    onChange={(e) => setField("barcode", e.target.value)}
                    placeholder="Código de barras o SKU"
                    className={inputCls}
                  />
                </div>

                <div className={fieldCls}>
                  <label className={labelCls}>Categoría</label>
                  <select
                    value={form.category}
                    onChange={(e) => setField("category", e.target.value)}
                    className={selectCls}
                  >
                    <option value="">— Seleccionar —</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* ── CARD 2: detalles Uber Eats + precios ── */}
            {card === 2 && (
              <div className="p-4 pt-12 space-y-3.5">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider pb-2 border-b border-gray-100">
                  Variante &amp; Descripción
                </p>

                <div className={fieldCls}>
                  <label className={labelCls}>Variante</label>
                  <input
                    type="text"
                    value={form.variant}
                    onChange={(e) => setField("variant", e.target.value)}
                    placeholder="ej: Rojo 500ml, Talla M, etc."
                    className={inputCls}
                  />
                </div>

                <div className={fieldCls}>
                  <label className={labelCls}>Descripción</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setField("description", e.target.value)}
                    placeholder="Descripción del producto para Uber Eats..."
                    rows={3}
                    className={inputCls + " resize-y min-h-[80px]"}
                  />
                </div>

                <div className={fieldCls}>
                  <label className={labelCls}>Subcategoría Uber Eats</label>
                  <input
                    type="text"
                    value={form.uberSubCategory}
                    onChange={(e) => setField("uberSubCategory", e.target.value)}
                    placeholder="ej: Bebidas frías, Snacks, etc."
                    className={inputCls}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className={fieldCls}>
                    <label className={labelCls}>Tipo producto</label>
                    <select
                      value={form.productType}
                      onChange={(e) => setField("productType", e.target.value)}
                      className={selectCls}
                    >
                      <option value="">Normal</option>
                      <option value="Alcohol">Alcohol</option>
                      <option value="Tobacco">Tabaco</option>
                      <option value="Vapes">Vapes</option>
                    </select>
                  </div>
                  <div className={fieldCls}>
                    <label className={labelCls}>HFSS</label>
                    <select
                      value={form.hfssItem}
                      onChange={(e) => setField("hfssItem", e.target.value)}
                      className={selectCls}
                    >
                      <option value="">No aplica</option>
                      <option value="HFSS Food">HFSS Food</option>
                      <option value="HFSS Drink">HFSS Drink</option>
                    </select>
                  </div>
                </div>

                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider pt-1 pb-2 border-b border-gray-100">
                  Precios
                </p>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className={fieldCls}>
                    <label className={labelCls}>Precio venta</label>
                    <input
                      type="number"
                      value={form.salePrice}
                      onChange={(e) => setField("salePrice", e.target.value)}
                      placeholder="0"
                      min="0"
                      className={inputCls}
                    />
                  </div>
                  <div className={fieldCls}>
                    <label className={labelCls}>Precio oferta</label>
                    <input
                      type="number"
                      value={form.offerPrice}
                      onChange={(e) => setField("offerPrice", e.target.value)}
                      placeholder="0"
                      min="0"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className={fieldCls}>
                    <label className={labelCls}>Unidad medida</label>
                    <select
                      value={form.measurementUnit}
                      onChange={(e) => setField("measurementUnit", e.target.value)}
                      className={selectCls}
                    >
                      <option value="un">un (Unidad)</option>
                      <option value="g">g (Gramos)</option>
                      <option value="kg">kg (Kilos)</option>
                      <option value="ml">ml</option>
                      <option value="l">l (Litros)</option>
                    </select>
                  </div>
                  <div className={fieldCls}>
                    <label className={labelCls}>Valor medida</label>
                    <input
                      type="number"
                      value={form.measurementValue}
                      onChange={(e) => setField("measurementValue", e.target.value)}
                      placeholder="1"
                      min="0"
                      step="0.1"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className={fieldCls}>
                  <label className={labelCls}>Estado</label>
                  <select
                    value={form.isActive ? "true" : "false"}
                    onChange={(e) => setField("isActive", e.target.value === "true")}
                    className={selectCls}
                  >
                    <option value="true">✅ Activo</option>
                    <option value="false">❌ Inactivo</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Card navigation buttons */}
          <div className="flex items-center justify-between px-4 py-3 gap-3">
            <button
              onClick={() => setCard((c) => Math.max(1, c - 1))}
              disabled={card === 1}
              className="flex items-center gap-1.5 bg-gray-100 text-gray-600 px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:bg-gray-200 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Anterior
            </button>
            <button
              onClick={() => setCard((c) => Math.min(2, c + 1))}
              disabled={card === 2}
              className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:enabled:bg-green-700 transition"
            >
              Siguiente
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          {/* Save button */}
          <div className="px-4 pb-20">
            <button
              onClick={saveProduct}
              disabled={savingProduct}
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-3.5 rounded-xl text-sm font-bold hover:bg-green-700 disabled:opacity-60 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {savingProduct ? "Guardando..." : "Guardar Producto"}
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          DESCARGA
      ════════════════════════════════════════════════════════ */}
      {tab === "descarga" && (
        <div>
          <div className="bg-gradient-to-br from-green-600 to-green-500 text-white px-5 py-5 flex items-center justify-between">
            <h1 className="text-lg font-bold tracking-tight">Descarga de Productos</h1>
            <span className="text-[11px] font-mono bg-white/20 px-2.5 py-1 rounded-full">{today}</span>
          </div>

          <div className="flex flex-col gap-3 p-4 pb-20">
            {/* Stats card */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="text-base font-bold mb-0.5">📊 Resumen</h3>
              <p className="text-xs text-gray-400 mb-3">Productos listos para exportar a Uber Eats</p>
              <div className="flex gap-2 mb-3">
                {(
                  [
                    { num: stats.total, label: "Total" },
                    { num: stats.active, label: "Activos" },
                    { num: stats.withImg, label: "Con imagen" },
                  ] as const
                ).map((s) => (
                  <div key={s.label} className="flex-1 bg-gray-50 rounded-lg p-2.5 text-center">
                    <div className="text-2xl font-bold text-green-600 font-mono">{s.num || "—"}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
              <button
                onClick={loadExportStats}
                className="w-full bg-green-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition"
              >
                ↻ Actualizar stats
              </button>
            </div>

            {/* Export card */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="text-base font-bold mb-0.5">📥 Exportar para Uber Eats</h3>
              <p className="text-xs text-gray-400 mb-3">
                Genera el CSV con el formato requerido por Uber Eats Grocery. Solo incluye productos activos con imagen.
              </p>
              <button
                onClick={exportUberEatsCSV}
                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition mb-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <polyline points="8 17 12 21 16 17" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.88 18.09A5 5 0 0018 9h-1.26A8 8 0 103 16.29" />
                </svg>
                Descargar CSV Uber Eats
              </button>
              <button
                onClick={exportAllJSON}
                className="w-full border border-green-600 text-green-600 py-2.5 rounded-lg text-sm font-semibold hover:bg-green-50 transition"
              >
                Exportar JSON completo
              </button>
            </div>

            {/* Preview card */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h3 className="text-base font-bold mb-0.5">👁 Vista previa Uber Eats</h3>
              <p className="text-xs text-gray-400 mb-3">
                Productos que se incluirán en la exportación (activos con imagen, máx. 30)
              </p>
              <button
                onClick={loadUberPreview}
                disabled={loadingPreview}
                className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-200 transition mb-3"
              >
                {loadingPreview ? "Cargando..." : "Cargar vista previa"}
              </button>

              {uberPreview.length > 0 && (
                <div className="flex flex-col gap-2">
                  {uberPreview.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2.5 border border-green-100 rounded-lg p-2.5"
                    >
                      {p.image_url && (
                        <img
                          src={p.image_url}
                          alt={p.name}
                          className="w-12 h-12 object-cover rounded-md bg-gray-100 flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">{p.name}</div>
                        <div className="text-[11px] text-gray-400">
                          {p.barcode}
                          {p.category ? ` • ${p.category}` : ""}
                        </div>
                      </div>
                      <div className="text-sm font-bold text-green-600 font-mono whitespace-nowrap">
                        ${p.sale_price || 0}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
