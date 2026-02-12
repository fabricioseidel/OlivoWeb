"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowDownTrayIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  PlusIcon,
  PencilIcon,
  CloudArrowUpIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";

// ====== SISTEMA DE LOGGING ======
const LOG_PREFIX = "🍔 [UBER-EATS]";
const log = {
  info: (...args: any[]) => console.log(LOG_PREFIX, "ℹ️", ...args),
  success: (...args: any[]) => console.log(LOG_PREFIX, "✅", ...args),
  warn: (...args: any[]) => console.warn(LOG_PREFIX, "⚠️", ...args),
  error: (...args: any[]) => console.error(LOG_PREFIX, "❌", ...args),
  storage: (...args: any[]) => console.log(LOG_PREFIX, "💾", ...args),
  load: (...args: any[]) => console.log(LOG_PREFIX, "📥", ...args),
  save: (...args: any[]) => console.log(LOG_PREFIX, "📤", ...args),
  action: (...args: any[]) => console.log(LOG_PREFIX, "🎯", ...args),
};

// Tipos de producto para Uber Eats
const PRODUCT_TYPES = [
  { value: "null", label: "null" },
  { value: "Alcohol", label: "Alcohol" },
  { value: "Tobacco", label: "Tabaco" },
  { value: "Vapes", label: "Vapes/Cigarros Electrónicos" },
];

// HFSS Items (High Fat, Sugar, Salt)
const HFSS_OPTIONS = [
  { value: "", label: "No aplica" },
  { value: "HFSS Food", label: "HFSS Food (Comida alta en grasa/azúcar/sal)" },
  { value: "HFSS Drink", label: "HFSS Drink (Bebida alta en azúcar)" },
];

interface UberEatsProduct {
  id: string;
  barcode: string;
  name: string;
  originalCategory: string;
  uberCategory: string; // Categoría principal
  uberCategories: string[]; // Múltiples categorías
  price: number;
  priceWithVat: number;
  vatPercentage: number; // porcentaje (ej: 19)
  description: string;
  imageUrl: string;
  productType: string;
  hfssItem: string;
  alcoholUnits: number | null;
  quantityRestriction: number | null;
  inStock: boolean;
  measurementUnit: string;
  measurementValue: number;
  externalData?: string;
  exportSelected: boolean; // Para exportar a Uber Eats
  editSelected: boolean; // Para edición/eliminación masiva
  isValid: boolean;
  validationErrors: string[];
}

// Detectar tipo de producto (Alcohol, Tobacco, Vapes)
function detectProductType(category: string, name: string): string {
  const cat = (category || "").toLowerCase();
  const n = (name || "").toLowerCase();

  if (
    cat.includes("alcohol") ||
    cat.includes("cerveza") ||
    cat.includes("vino") ||
    cat.includes("licor") ||
    cat.includes("pisco") ||
    n.includes("cerveza") ||
    n.includes("vino") ||
    n.includes("pisco")
  ) {
    return "Alcohol";
  }

  if (cat.includes("tabaco") || cat.includes("cigarr") || n.includes("cigarr") || n.includes("tabaco")) {
    return "Tobacco";
  }

  if (cat.includes("vape") || cat.includes("vaporizador") || n.includes("vape") || n.includes("pod")) {
    return "Vapes";
  }

  return "";
}

// Detectar HFSS
function detectHFSS(category: string, name: string): string {
  const cat = (category || "").toLowerCase();
  const n = (name || "").toLowerCase();

  // Bebidas azucaradas
  if (
    cat.includes("gaseosa") ||
    cat.includes("refresco") ||
    n.includes("coca") ||
    n.includes("pepsi") ||
    n.includes("fanta") ||
    n.includes("sprite") ||
    n.includes("energy") ||
    n.includes("red bull")
  ) {
    return "HFSS Drink";
  }

  // Comidas altas en grasa/azúcar/sal
  if (
    cat.includes("snack") ||
    cat.includes("chocolate") ||
    cat.includes("golosina") ||
    cat.includes("galleta") ||
    n.includes("chip") ||
    n.includes("doritos") ||
    n.includes("cheetos") ||
    n.includes("chocolate")
  ) {
    return "HFSS Food";
  }

  return "";
}

// Extraer medida del nombre del producto
function extractMeasurement(name: string): { value: number; unit: string } {
  const patterns = [
    /(\d+(?:[.,]\d+)?)\s*(lt?|litros?)\b/i,
    /(\d+(?:[.,]\d+)?)\s*(ml|mililitros?)\b/i,
    /(\d+(?:[.,]\d+)?)\s*(kg|kilos?|kilogramos?)\b/i,
    /(\d+(?:[.,]\d+)?)\s*(g|gr|gramos?)\b/i,
    /(\d+(?:[.,]\d+)?)\s*(cc)\b/i,
    /(\d+(?:[.,]\d+)?)\s*(un|unidades?)\b/i,
  ];

  for (const pattern of patterns) {
    const match = name.match(pattern);
    if (match) {
      const value = parseFloat(match[1].replace(",", "."));
      let unit = match[2].toLowerCase();
      // Normalizar unidades
      if (unit.startsWith("l") || unit === "lt") unit = "L";
      else if (unit === "ml" || unit === "mililitros") unit = "ml";
      else if (unit.startsWith("k")) unit = "kg";
      else if (unit === "g" || unit === "gr" || unit.startsWith("gramo")) unit = "g";
      else if (unit === "cc") unit = "ml";
      else if (unit.startsWith("un")) unit = "un";

      return { value, unit };
    }
  }

  return { value: 1, unit: "un" };
}

// Validar producto para Uber Eats
function validateProduct(product: UberEatsProduct): string[] {
  const errors: string[] = [];

  if (!product.barcode || product.barcode.length < 8) {
    errors.push("Código de barras inválido o muy corto");
  }

  if (!product.name || product.name.length < 3) {
    errors.push("Nombre del producto muy corto");
  }

  if (!product.uberCategory) {
    errors.push("Falta categoría de Uber Eats");
  }

  if (!product.priceWithVat || product.priceWithVat <= 0) {
    errors.push("Precio inválido");
  }

  return errors;
}

export default function UberEatsExportPage() {
  const router = useRouter();
  const pathname = usePathname();
  const isStandalone = pathname.startsWith("/uber-eats-editor");

  const EXPORT_SELECTED_KEY = "uberEats_exportSelectedProducts";
  const EXPORTED_PRODUCTS_KEY = "uberEats_exportedProducts";

  const [products, setProducts] = useState<UberEatsProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterValid, setFilterValid] = useState<"all" | "valid" | "invalid">("all");
  const [showOnlySelected, setShowOnlySelected] = useState(false);
  const [bulkAction, setBulkAction] = useState("");
  const [bulkValue, setBulkValue] = useState("");
  const [exporting, setExporting] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryValue, setEditCategoryValue] = useState("");
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 50;
  
  // ====== ESTADOS PARA SINCRONIZACIÓN Y SUBIDA DE IMÁGENES ======
  const [syncing, setSyncing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null); // barcode del producto subiendo
  const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB en bytes
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedProductForUpload, setSelectedProductForUpload] = useState<string | null>(null);

  // ====== SELECTOR FLOTANTE DE CATEGORÍAS ======
  type CategoryPopoverState = {
    productId: string;
    top: number;
    left: number;
    openUp: boolean;
  };

  const [categoryPopover, setCategoryPopover] = useState<CategoryPopoverState | null>(null);
  const categoryPopoverPanelRef = useRef<HTMLDivElement | null>(null);
  const categoryPopoverListRef = useRef<HTMLDivElement | null>(null);
  const categoryTypeBufferRef = useRef<{ value: string; lastAt: number }>({ value: '', lastAt: 0 });

  const closeCategoryPopover = useCallback(() => {
    categoryTypeBufferRef.current = { value: '', lastAt: 0 };
    setCategoryPopover(null);
  }, []);

  const openCategoryPopover = useCallback((productId: string, anchorEl: HTMLElement) => {
    const rect = anchorEl.getBoundingClientRect();
    const panelWidthPx = 320; // aprox w-80
    const marginPx = 8;
    const estimatedPanelHeightPx = 320;
    const openUp = rect.bottom + estimatedPanelHeightPx + marginPx > window.innerHeight;

    const left = Math.max(marginPx, Math.min(rect.left, window.innerWidth - panelWidthPx - marginPx));
    const top = openUp ? rect.top - marginPx : rect.bottom + marginPx;

    categoryTypeBufferRef.current = { value: '', lastAt: 0 };
    setCategoryPopover({ productId, top, left, openUp });

    requestAnimationFrame(() => {
      categoryPopoverPanelRef.current?.focus();
    });
  }, []);

  const handleCategoryPopoverKeyDown = useCallback(
    (ev: React.KeyboardEvent) => {
      if (ev.key === 'Escape') {
        ev.preventDefault();
        closeCategoryPopover();
        return;
      }

      if (ev.key.length !== 1) return;
      const ch = ev.key.toLowerCase();
      if (!/^[a-z0-9]$/.test(ch)) return;

      const now = Date.now();
      const prev = categoryTypeBufferRef.current;
      const nextValue = now - prev.lastAt < 700 ? prev.value + ch : ch;
      categoryTypeBufferRef.current = { value: nextValue, lastAt: now };

      const list = categoryPopoverListRef.current;
      if (!list) return;

      const items = Array.from(list.querySelectorAll('[data-cat-lower]')) as HTMLElement[];
      const match = items.find((el) => {
        const v = (el.dataset.catLower || '').toLowerCase();
        return v.startsWith(nextValue);
      });

      match?.scrollIntoView({ block: 'nearest' });
    },
    [closeCategoryPopover]
  );

  // ====== HISTORIAL DE EXPORTADOS (para saber cuáles ya se exportaron) ======
  const [exportedProducts, setExportedProducts] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    const raw = localStorage.getItem(EXPORTED_PRODUCTS_KEY);
    if (!raw) return new Set();
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed.map(String));
      return new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(EXPORTED_PRODUCTS_KEY, JSON.stringify(Array.from(exportedProducts)));
  }, [exportedProducts]);
  
  // ====== INICIALIZACIÓN DESDE LOCALSTORAGE CON LOGGING ======
  const [excludedProducts, setExcludedProducts] = useState<Set<string>>(() => {
    log.load("Iniciando carga de productos excluidos desde localStorage...");
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("uberEats_excludedProducts");
      log.storage("localStorage uberEats_excludedProducts raw:", saved);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          log.success("Productos excluidos cargados:", parsed.length, "items", parsed);
          return new Set(parsed);
        } catch (e) {
          log.error("Error parseando productos excluidos:", e);
          return new Set();
        }
      }
    }
    log.info("No hay productos excluidos guardados");
    return new Set();
  });
  
  const [productModifications, setProductModifications] = useState<Record<string, Partial<UberEatsProduct>>>(() => {
    log.load("Iniciando carga de modificaciones desde localStorage...");
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("uberEats_productModifications");
      log.storage("localStorage uberEats_productModifications raw:", saved);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          log.success("Modificaciones cargadas:", Object.keys(parsed).length, "productos", parsed);
          return parsed;
        } catch (e) {
          log.error("Error parseando modificaciones:", e);
          return {};
        }
      }
    }
    log.info("No hay modificaciones guardadas");
    return {};
  });
  
  const [hasChanges, setHasChanges] = useState(false);

  // ====== GUARDAR EN LOCALSTORAGE CON LOGGING ======
  useEffect(() => {
    log.save("Guardando productos excluidos...", "Count:", excludedProducts.size);
    if (excludedProducts.size > 0) {
      const data = JSON.stringify([...excludedProducts]);
      localStorage.setItem("uberEats_excludedProducts", data);
      log.success("Productos excluidos guardados:", data);
    } else {
      localStorage.removeItem("uberEats_excludedProducts");
      log.info("Sin productos excluidos, limpiado localStorage");
    }
  }, [excludedProducts]);
  
  // Guardar modificaciones
  useEffect(() => {
    const keys = Object.keys(productModifications);
    log.save("Guardando modificaciones...", "Count:", keys.length);
    if (keys.length > 0) {
      const data = JSON.stringify(productModifications);
      localStorage.setItem("uberEats_productModifications", data);
      log.success("Modificaciones guardadas:", data);
    } else {
      localStorage.removeItem("uberEats_productModifications");
      log.info("Sin modificaciones, limpiado localStorage");
    }
  }, [productModifications]);
  
  // Guardar categorías personalizadas
  useEffect(() => {
    log.save("Guardando categorías personalizadas...", "Count:", customCategories.length);
    if (customCategories.length > 0) {
      const data = JSON.stringify(customCategories);
      localStorage.setItem("uberEats_customCategories", data);
      log.success("Categorías guardadas:", data);
    } else {
      localStorage.removeItem("uberEats_customCategories");
      log.info("Sin categorías personalizadas, limpiado localStorage");
    }
  }, [customCategories]);
  
  // Cargar categorías personalizadas al inicio
  useEffect(() => {
    log.load("Cargando categorías personalizadas desde localStorage...");
    const saved = localStorage.getItem("uberEats_customCategories");
    log.storage("localStorage uberEats_customCategories raw:", saved);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        log.success("Categorías cargadas:", parsed);
        setCustomCategories(parsed);
      } catch (e) {
        log.error("Error parseando categorías:", e);
      }
    }
  }, []);

  // Categorías: deben ser idénticas a las categorías locales del producto.
  // Usamos `uberCategories` (derivadas desde la BD) como fuente.
  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    for (const p of products) {
      for (const c of p.uberCategories || []) {
        const s = String(c || '').trim();
        if (s) cats.add(s);
      }
    }
    return Array.from(cats).sort();
  }, [products]);

  // Agregar nueva categoría
  const addCategory = useCallback(() => {
    const name = newCategoryName.trim();
    log.action("Intentando agregar categoría:", name);
    if (!name) {
      log.warn("Nombre de categoría vacío");
      return;
    }
    if (uniqueCategories.includes(name)) {
      log.warn("Categoría ya existe:", name);
      alert("Esta categoría ya existe");
      return;
    }
    log.success("Agregando categoría:", name);
    setCustomCategories(prev => {
      const updated = [...prev, name];
      log.info("Categorías personalizadas actualizadas:", updated);
      return updated;
    });
    setNewCategoryName("");
  }, [newCategoryName, uniqueCategories]);

  // Renombrar categoría en todos los productos
  const renameCategory = useCallback((oldName: string, newName: string) => {
    log.action("Renombrando categoría:", oldName, "→", newName);
    if (!newName.trim() || oldName === newName) {
      log.warn("Nombre inválido o sin cambios");
      setEditingCategory(null);
      return;
    }
    setProducts(prev => prev.map(p => {
      const updated = { ...p };
      if (p.originalCategory === oldName) updated.originalCategory = newName;
      if (p.uberCategory === oldName) updated.uberCategory = newName;
      updated.validationErrors = validateProduct(updated);
      updated.isValid = updated.validationErrors.length === 0;
      return updated;
    }));
    setCustomCategories(prev => {
      const updated = prev.map(c => c === oldName ? newName : c);
      log.success("Categorías actualizadas tras renombrar:", updated);
      return updated;
    });
    setEditingCategory(null);
    setEditCategoryValue("");
  }, []);

  // Cargar productos
  useEffect(() => {
    log.info("useEffect: Iniciando carga de productos...");
    loadProducts();
  }, []);

  const loadProducts = async () => {
    log.action("loadProducts() llamada");
    setLoading(true);
    try {
      log.info("Fetching /api/admin/uber-eats/products...");
      const res = await fetch("/api/admin/uber-eats/products");
      if (!res.ok) {
        let details = '';
        try {
          const body = await res.json();
          details = body?.error ? `: ${body.error}` : '';
        } catch {
          try {
            const text = await res.text();
            details = text ? `: ${text}` : '';
          } catch {
            // ignore
          }
        }
        throw new Error(`Error cargando productos (${res.status} ${res.statusText})${details}`);
      }
      const json = await res.json();
      log.success("API response recibida");
      
      // La API devuelve { items: [...] }
      const data = json.items || json.data || json || [];
      log.info("Productos del API:", data.length);

      // ====== CARGAR MODIFICACIONES GUARDADAS ======
      let savedModifications: Record<string, Partial<UberEatsProduct>> = {};
      const savedModsRaw = localStorage.getItem("uberEats_productModifications");
      log.load("Leyendo modificaciones guardadas:", savedModsRaw);
      if (savedModsRaw) {
        try {
          savedModifications = JSON.parse(savedModsRaw);
          log.success("Modificaciones parseadas:", Object.keys(savedModifications).length, "productos");
        } catch (e) {
          log.error("Error parseando modificaciones:", e);
        }
      }

      // Importante: el precio lo tomamos siempre desde la BD (products.sale_price = precio FINAL con IVA incluido).
      // Para evitar que un valor viejo en localStorage siga “pisando” el precio de BD, descartamos overrides de precio.
      if (savedModifications && Object.keys(savedModifications).length > 0) {
        let changed = false;
        for (const id of Object.keys(savedModifications)) {
          const mods: any = savedModifications[id];
          if (!mods) continue;

          if ('price' in mods || 'priceWithVat' in mods || 'vatPercentage' in mods) {
            delete mods.price;
            delete mods.priceWithVat;
            delete mods.vatPercentage;
            changed = true;
          }

          if (Object.keys(mods).length === 0) {
            delete savedModifications[id];
            changed = true;
          }
        }

        if (changed) {
          try {
            localStorage.setItem('uberEats_productModifications', JSON.stringify(savedModifications));
            log.save('Modificaciones limpiadas (precio) y re-guardadas:', Object.keys(savedModifications).length);
          } catch (e) {
            log.error('No se pudo re-guardar modificaciones limpiadas:', e);
          }
        }
      }

      // ====== CARGAR SELECCIÓN PARA EXPORTAR (autorizados) ======
      let exportSelectedSet = new Set<string>();
      const exportSelectedRaw = localStorage.getItem(EXPORT_SELECTED_KEY);
      if (exportSelectedRaw) {
        try {
          const parsed = JSON.parse(exportSelectedRaw);
          if (Array.isArray(parsed)) exportSelectedSet = new Set(parsed.map(String));
        } catch (e) {
          log.error("Error parseando exportSelected:", e);
        }
      }

      const uberProducts: UberEatsProduct[] = (Array.isArray(data) ? data : []).map((p: any) => {
        const measurement = extractMeasurement(p.name || "");
        // Usar product_type y hfss del CSV si existen, sino detectar
        const productTypeRaw = String(p.product_type ?? '').trim() || detectProductType(p.category || "", p.name || "");
        const productType = productTypeRaw ? productTypeRaw : "null";
        const hfss = p.hfss || detectHFSS(p.category || "", p.name || "");
        
        // `sale_price` lo tratamos como precio FINAL con IVA incluido
        const priceWithVat = Number(p.sale_price || 0);
        const vatPct = 19;
        const netPrice = Math.round(priceWithVat / (1 + vatPct / 100));

        // Categorías: deben reflejar la(s) categoría(s) local(es) del producto.
        const localRaw = String(p.local_category_raw ?? p.all_categories ?? p.category ?? "").trim();
        let uberCategories: string[] = [];
        if (Array.isArray(p.local_categories)) {
          uberCategories = (p.local_categories as any[]).map((c: any) => String(c).trim()).filter(Boolean);
        } else if (localRaw) {
          // Acepta separadores usados en la tienda (coma, /, |)
          uberCategories = localRaw.split(/[,/|]/).map((c: string) => c.trim()).filter(Boolean);
        }

        const originalCategory = localRaw;

        const descRaw = String(p.description ?? "").trim();
        const imgRaw = String(p.image_url ?? "").trim();

        const product: UberEatsProduct = {
          id: p.barcode,
          barcode: p.barcode,
          name: p.name || "",
          originalCategory: originalCategory,
          uberCategory: uberCategories[0] || "", // Categoría principal
          uberCategories: uberCategories, // Array de categorías desde CSV
          price: netPrice,
          priceWithVat,
          vatPercentage: vatPct,
          description: descRaw || "",
          imageUrl: imgRaw || "",
          productType,
          hfssItem: hfss,
          alcoholUnits: productType === "Alcohol" ? 1 : 0,
          quantityRestriction: 5,
          inStock: p.in_stock || false,
          measurementUnit: p.measurement_unit || measurement.unit,
          measurementValue: p.measurement_value || measurement.value,
          externalData: "",
          exportSelected: exportSelectedSet.has(String(p.barcode)),
          editSelected: false,
          isValid: true,
          validationErrors: [],
        };

        // ====== APLICAR MODIFICACIONES GUARDADAS ======
        const mods = savedModifications[product.id];
        if (mods) {
          log.info("Aplicando modificaciones a producto:", product.id, mods);
          Object.assign(product, mods);
          // Recalcular precio neto si cambió IVA o precio con IVA
          if (mods.priceWithVat !== undefined || mods.vatPercentage !== undefined) {
            const vat = Number(product.vatPercentage || 19);
            product.price = Math.round(Number(product.priceWithVat || 0) / (1 + vat / 100));
          }
          // Si hay uberCategories guardadas, usarlas
          if (mods.uberCategories) {
            product.uberCategories = mods.uberCategories as string[];
            product.uberCategory = product.uberCategories[0] || "";
          }
        }

        // Validar
        product.validationErrors = validateProduct(product);
        product.isValid = product.validationErrors.length === 0;

        return product;
      });

      // Leer productos excluidos directamente de localStorage para evitar problemas de sincronización
      let excludedSet = new Set<string>();
      const savedExcluded = localStorage.getItem("uberEats_excludedProducts");
      log.load("Leyendo productos excluidos:", savedExcluded);
      if (savedExcluded) {
        try {
          excludedSet = new Set(JSON.parse(savedExcluded));
          log.success("Productos excluidos:", excludedSet.size);
        } catch (e) {
          log.error("Error parseando excluidos:", e);
        }
      }

      // Filtrar productos excluidos
      const filteredByExclusion = uberProducts.filter(p => !excludedSet.has(p.id));
      log.info("Productos tras filtrar excluidos:", filteredByExclusion.length, "(excluidos:", excludedSet.size, ")");
      
      setProducts(filteredByExclusion);
      log.success("loadProducts() completado!");
    } catch (err) {
      log.error("Error cargando productos:", err);
    } finally {
      setLoading(false);
    }
  };

  // Productos filtrados
  const filteredProducts = useMemo(() => {
    // Resetear a página 1 cuando cambian filtros (se hace en un efecto separado)
    return products.filter((p) => {
      // Búsqueda
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (
          !p.name.toLowerCase().includes(term) &&
          !p.barcode.toLowerCase().includes(term) &&
          !p.originalCategory.toLowerCase().includes(term)
        ) {
          return false;
        }
      }

      // Filtro por categoría original (en español)
      if (filterCategory && p.originalCategory !== filterCategory) {
        return false;
      }

      // Filtro por validez
      if (filterValid === "valid" && !p.isValid) return false;
      if (filterValid === "invalid" && p.isValid) return false;

      // Solo seleccionados
      if (showOnlySelected && !p.exportSelected) return false;

      return true;
    });
  }, [products, searchTerm, filterCategory, filterValid, showOnlySelected]);

  // Resetear página cuando cambian filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterValid, showOnlySelected]);

  // Estadísticas
  const stats = useMemo(() => {
    const exportSelected = products.filter((p) => p.exportSelected);
    const editSelected = products.filter((p) => p.editSelected);
    const valid = products.filter((p) => p.isValid);
    const invalid = products.filter((p) => !p.isValid);

    return {
      total: products.length,
      exportSelected: exportSelected.length,
      editSelected: editSelected.length,
      valid: valid.length,
      invalid: invalid.length,
      exportSelectedValid: exportSelected.filter((p) => p.isValid).length,
    };
  }, [products]);

  const persistExportSelection = useCallback((next: UberEatsProduct[]) => {
    const ids = next.filter(p => p.exportSelected).map(p => p.id);
    localStorage.setItem(EXPORT_SELECTED_KEY, JSON.stringify(ids));
  }, [EXPORT_SELECTED_KEY]);

  // Selección para EXPORTAR
  const toggleExportSelected = useCallback((id: string) => {
    setProducts((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, exportSelected: !p.exportSelected } : p));
      persistExportSelection(next);
      return next;
    });
  }, [persistExportSelection]);

  const selectAllExportFiltered = useCallback(() => {
    const filteredIds = new Set(filteredProducts.map((p) => p.id));
    setProducts((prev) => {
      const next = prev.map((p) => (filteredIds.has(p.id) ? { ...p, exportSelected: true } : p));
      persistExportSelection(next);
      return next;
    });
  }, [filteredProducts, persistExportSelection]);

  const deselectAllExport = useCallback(() => {
    setProducts((prev) => {
      const next = prev.map((p) => ({ ...p, exportSelected: false }));
      persistExportSelection(next);
      return next;
    });
  }, [persistExportSelection]);

  // Selección para EDITAR/ELIMINAR
  const toggleEditSelected = useCallback((id: string) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, editSelected: !p.editSelected } : p)));
  }, []);

  const selectAllEditFiltered = useCallback(() => {
    const filteredIds = new Set(filteredProducts.map((p) => p.id));
    setProducts((prev) => prev.map((p) => (filteredIds.has(p.id) ? { ...p, editSelected: true } : p)));
  }, [filteredProducts]);

  const deselectAllEdit = useCallback(() => {
    setProducts((prev) => prev.map((p) => ({ ...p, editSelected: false })));
  }, []);

  // Seleccionar todos los filtrados
  // Excluir productos seleccionados para edición (se guarda en localStorage)
  const removeSelected = useCallback(() => {
    log.action("removeSelected() - productos seleccionados para edición:", stats.editSelected);
    if (!confirm(`¿Excluir ${stats.editSelected} productos del editor? (No se eliminan de la base de datos)`)) return;
    const selectedIds = products.filter(p => p.editSelected).map(p => p.id);
    log.info("IDs a excluir:", selectedIds);
    setExcludedProducts(prev => {
      const updated = new Set([...prev, ...selectedIds]);
      log.success("Productos excluidos actualizados:", [...updated]);
      return updated;
    });
    setProducts((prev) => prev.filter((p) => !p.editSelected));
  }, [stats.editSelected, products]);

  // Restaurar productos excluidos
  const restoreExcluded = useCallback(() => {
    log.action("restoreExcluded()");
    setExcludedProducts(new Set());
    loadProducts();
  }, []);
  
  // Resetear todos los cambios guardados
  const resetAllChanges = useCallback(() => {
    log.action("resetAllChanges() - Limpiando todo localStorage");
    if (!confirm("¿Eliminar TODOS los cambios guardados? (productos excluidos, modificaciones, categorías personalizadas)")) return;
    localStorage.removeItem("uberEats_excludedProducts");
    localStorage.removeItem("uberEats_productModifications");
    localStorage.removeItem("uberEats_customCategories");
    localStorage.removeItem(EXPORT_SELECTED_KEY);
    localStorage.removeItem(EXPORTED_PRODUCTS_KEY);
    setExcludedProducts(new Set());
    setProductModifications({});
    setCustomCategories([]);
    setExportedProducts(new Set());
    log.success("localStorage limpiado, recargando productos...");
    loadProducts();
  }, [EXPORT_SELECTED_KEY, EXPORTED_PRODUCTS_KEY]);

  // Actualizar campo de producto y marcar que hay cambios
  const updateProduct = useCallback((id: string, field: keyof UberEatsProduct, value: any) => {
    log.action("updateProduct():", id, field, "=", value);
    setHasChanges(true);
    
    // Guardar la modificación en localStorage
    setProductModifications(prev => {
      const updated = { ...prev };
      if (!updated[id]) updated[id] = {};
      updated[id][field] = value;
      log.save("Guardando modificación para producto:", id, updated[id]);
      return updated;
    });
    
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const updated = { ...p, [field]: value };

        // Mantener price (neto) y priceWithVat coherentes
        if (field === "priceWithVat") {
          updated.priceWithVat = Number(value) || 0;
          const vat = Number(updated.vatPercentage || 19);
          updated.price = Math.round(updated.priceWithVat / (1 + vat / 100));
        }

        if (field === "vatPercentage") {
          updated.vatPercentage = Number(value) || 19;
          const vat = Number(updated.vatPercentage || 19);
          updated.price = Math.round(Number(updated.priceWithVat || 0) / (1 + vat / 100));
        }
        
        // Re-validar
        updated.validationErrors = validateProduct(updated);
        updated.isValid = updated.validationErrors.length === 0;
        return updated;
      })
    );
  }, []);

  // Guardar cambios en la base de datos
  const saveChanges = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const selectedIds = new Set(products.filter(p => p.editSelected).map(p => p.id));
      const modifiedIds = new Set(Object.keys(productModifications || {}));

      // Si no hay selección explícita, guardar lo modificado (más intuitivo)
      const idsToSave = selectedIds.size > 0 ? selectedIds : modifiedIds;
      if (idsToSave.size === 0) {
        alert("No hay cambios para guardar");
        return;
      }

      const productsToSave = products.filter(p => idsToSave.has(p.id));

      const items = productsToSave.map((product) => {
        const mods = (productModifications || {})[product.id] || {};
        const payload: any = { barcode: product.barcode };

        const normalizeText = (v: any) => {
          const s = String(v ?? "").trim();
          if (!s || s.toLowerCase() === "null") return "";
          return s;
        };

        const hasExplicitSelection = selectedIds.size > 0;

        // Campos base: si el usuario seleccionó explícitamente, guardamos estado actual
        // para precio/stock/imagen/categoría (comportamiento esperado).
        if (hasExplicitSelection) {
          payload.sale_price = product.priceWithVat;
          payload.stock = product.inStock ? 1 : 0;
          payload.image_url = normalizeText(product.imageUrl);
          payload.category = (product.uberCategories && product.uberCategories.length > 0)
            ? product.uberCategories.join(', ')
            : normalizeText(product.uberCategory);
        }

        // Campos sensibles: sólo enviarlos si realmente fueron modificados,
        // para evitar sobrescribir valores existentes con placeholders.
        if (Object.prototype.hasOwnProperty.call(mods, "priceWithVat") || Object.prototype.hasOwnProperty.call(mods, "vatPercentage")) {
          payload.sale_price = product.priceWithVat;
        }
        if (Object.prototype.hasOwnProperty.call(mods, "inStock")) {
          payload.stock = product.inStock ? 1 : 0;
        }
        if (Object.prototype.hasOwnProperty.call(mods, "imageUrl")) {
          payload.image_url = normalizeText(product.imageUrl);
        }
        if (Object.prototype.hasOwnProperty.call(mods, "uberCategories") || Object.prototype.hasOwnProperty.call(mods, "uberCategory")) {
          payload.category = (product.uberCategories && product.uberCategories.length > 0)
            ? product.uberCategories.join(', ')
            : normalizeText(product.uberCategory);
        }
        if (Object.prototype.hasOwnProperty.call(mods, "description")) {
          payload.description = normalizeText(product.description);
        }
        if (Object.prototype.hasOwnProperty.call(mods, "name")) {
          payload.name = normalizeText(product.name);
        }

        return payload;
      });

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      if (!res.ok) {
        let details = '';
        try {
          const j = await res.json();
          details = j?.error ? `: ${j.error}` : '';
        } catch {
          try {
            const t = await res.text();
            details = t ? `: ${t}` : '';
          } catch {
            // ignore
          }
        }
        throw new Error(`Error guardando productos (${res.status} ${res.statusText})${details}`);
      }
      
      setHasChanges(false);

      // Limpiar modificaciones guardadas para que al recargar tome el valor real de la BD
      setProductModifications((prev) => {
        const next = { ...(prev || {}) };
        for (const id of idsToSave) delete next[id];
        return next;
      });

      alert(`✅ Guardados ${productsToSave.length} productos`);
    } catch (err) {
      console.error("Error guardando:", err);
      alert(String((err as any)?.message || "Error al guardar cambios"));
    } finally {
      setSaving(false);
    }
  }, [products, productModifications, saving]);

  const handleBack = useCallback(async () => {
    const shouldSave = confirm("¿Guardar todos los cambios antes de salir?\n\nNota: si no hay selección, se guardará lo que esté modificado.");
    if (shouldSave) {
      try {
        await saveChanges();
      } catch (e) {
        console.error("Error guardando antes de salir:", e);
        alert("No se pudo guardar antes de salir");
        return;
      }
    }

    router.push("/admin");
  }, [router, saveChanges]);

  // Acción masiva - MEJORADA con persistencia
  const applyBulkAction = useCallback(() => {
    if (!bulkAction || !bulkValue) return;

    const selectedIds = new Set(products.filter((p) => p.editSelected).map((p) => p.id));
    if (selectedIds.size === 0) {
      alert("Selecciona productos primero");
      return;
    }

    log.action("applyBulkAction:", bulkAction, "=", bulkValue, "a", selectedIds.size, "productos");

    // Guardar modificaciones para cada producto seleccionado
    setProductModifications(prev => {
      const updated = { ...prev };
      products.filter(p => p.editSelected).forEach(p => {
        if (!updated[p.id]) updated[p.id] = {};
        switch (bulkAction) {
          case "category":
            // Agregar categoría a las existentes (sin duplicar)
            const currentCats = (p.uberCategories || []);
            if (!currentCats.includes(bulkValue)) {
              updated[p.id].uberCategories = [...currentCats, bulkValue];
            }
            updated[p.id].uberCategory = bulkValue;
            break;
          case "productType":
            updated[p.id].productType = bulkValue;
            break;
          case "hfss":
            updated[p.id].hfssItem = bulkValue;
            break;
          case "vat":
            updated[p.id].vatPercentage = parseFloat(bulkValue) || 19;
            break;
        }
      });
      log.save("Guardando modificaciones masivas para", selectedIds.size, "productos");
      return updated;
    });

    setProducts((prev) =>
      prev.map((p) => {
        if (!selectedIds.has(p.id)) return p;
        const updated = { ...p };

        switch (bulkAction) {
          case "category":
            // Agregar categoría a las existentes (sin duplicar)
            if (!updated.uberCategories.includes(bulkValue)) {
              updated.uberCategories = [...updated.uberCategories, bulkValue];
            }
            updated.uberCategory = bulkValue;
            break;
          case "productType":
            updated.productType = bulkValue;
            if (bulkValue && updated.quantityRestriction == null) updated.quantityRestriction = 5;
            break;
          case "hfss":
            updated.hfssItem = bulkValue;
            break;
          case "vat":
            updated.vatPercentage = parseFloat(bulkValue) || 19;
            updated.priceWithVat = Math.round(updated.price * (1 + updated.vatPercentage / 100));
            break;
        }

        // Re-validar
        updated.validationErrors = validateProduct(updated);
        updated.isValid = updated.validationErrors.length === 0;
        return updated;
      })
    );

    setBulkAction("");
    setBulkValue("");
    setHasChanges(true);
    log.success("Acción masiva aplicada!");
  }, [bulkAction, bulkValue, products]);

  // NUEVA FUNCIÓN: Aplicar patrón de nombre a productos seleccionados
  const applyNamePattern = useCallback((pattern: string, replacement: string) => {
    const selectedProducts = products.filter(p => p.editSelected);
    if (selectedProducts.length === 0) {
      alert("Selecciona productos primero");
      return;
    }

    log.action("applyNamePattern:", pattern, "→", replacement, "a", selectedProducts.length, "productos");
    
    let count = 0;
    const regex = new RegExp(pattern, 'gi');
    
    setProductModifications(prev => {
      const updated = { ...prev };
      selectedProducts.forEach(p => {
        const newName = p.name.replace(regex, replacement);
        if (newName !== p.name) {
          if (!updated[p.id]) updated[p.id] = {};
          updated[p.id].name = newName;
          count++;
        }
      });
      return updated;
    });
    
    setProducts(prev => prev.map(p => {
      if (!p.editSelected) return p;
      const newName = p.name.replace(regex, replacement);
      if (newName !== p.name) {
        return { ...p, name: newName };
      }
      return p;
    }));
    
    log.success("Patrón aplicado a", count, "productos");
    alert(`Patrón aplicado a ${count} productos`);
  }, [products]);

  // NUEVA FUNCIÓN: Normalizar unidades de medida en nombres
  const addMeasurementUnits = useCallback(() => {
    let count = 0;
    
    setProductModifications(prev => {
      const updated = { ...prev };
      products.forEach(p => {
        let newName = p.name;
        // Normalizar unidades existentes
        newName = newName.replace(/(\d+)\s*ml\b/gi, '$1 ML');
        newName = newName.replace(/(\d+)\s*lt?\b/gi, '$1 LT');
        newName = newName.replace(/(\d+)\s*g\b/gi, '$1 G');
        newName = newName.replace(/(\d+)\s*gr\b/gi, '$1 G');
        newName = newName.replace(/(\d+)\s*kg\b/gi, '$1 KG');
        newName = newName.replace(/(\d+)\s*cc\b/gi, '$1 ML');
        
        if (newName !== p.name) {
          if (!updated[p.id]) updated[p.id] = {};
          updated[p.id].name = newName;
          count++;
        }
      });
      log.save("Normalizando unidades en", count, "productos");
      return updated;
    });
    
    setProducts(prev => prev.map(p => {
      let newName = p.name;
      newName = newName.replace(/(\d+)\s*ml\b/gi, '$1 ML');
      newName = newName.replace(/(\d+)\s*lt?\b/gi, '$1 LT');
      newName = newName.replace(/(\d+)\s*g\b/gi, '$1 G');
      newName = newName.replace(/(\d+)\s*gr\b/gi, '$1 G');
      newName = newName.replace(/(\d+)\s*kg\b/gi, '$1 KG');
      newName = newName.replace(/(\d+)\s*cc\b/gi, '$1 ML');
      
      if (newName !== p.name) {
        return { ...p, name: newName };
      }
      return p;
    }));
    
    log.success("Unidades normalizadas en", count, "productos");
    alert(`Unidades de medida normalizadas en ${count} productos`);
  }, [products]);

  // Exportar a CSV para Uber Eats
  const exportToCSV = useCallback(async () => {
    const toExport = products.filter((p) => p.exportSelected && p.isValid);
    if (toExport.length === 0) {
      alert("No hay productos válidos seleccionados para exportar");
      return;
    }

    setExporting(true);

    try {
      // Cabeceras según el formato solicitado (Excel/CSV)
      const headers = [
        "UPC/EAN",
        "External ID",
        "Category",
        "Product Name (+ brand + size / weight)",
        "Product Type",
        "Total Alcohol Units",
        "HFSS Item",
        "Price (incl VAT)",
        "VAT percentage",
        "Description",
        "Item Image URL",
        "Quantity Restriction",
        "Out of Stock? (0 or 1)",
        "External Data",
      ];

      const rows = toExport.map((p) => [
        p.barcode, // UPC/EAN
        p.barcode, // External ID (usamos barcode)
        p.uberCategory || p.uberCategories[0] || "", // Category principal
        p.name, // Product Name
        p.productType || "null", // Product Type
        p.alcoholUnits ?? 0, // Total Alcohol Units
        p.hfssItem || "null", // HFSS Item
        p.priceWithVat, // Price (incl VAT)
        Number(p.vatPercentage || 19), // VAT percentage
        p.description || "null", // Description
        p.imageUrl || "null", // Item Image URL
        p.quantityRestriction ?? 5, // Quantity Restriction
        p.inStock ? 0 : 1, // Out of Stock? (1 = sin stock)
        p.externalData || "null", // External Data
      ]);

      // Crear CSV
      const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
          row
            .map((cell) => {
              const str = String(cell ?? "");
              // Escapar comas y comillas
              if (str.includes(",") || str.includes('"') || str.includes("\n")) {
                return `"${str.replace(/"/g, '""')}"`;
              }
              return str;
            })
            .join(",")
        ),
      ].join("\n");

      // Descargar
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `UberEats_Menu_OlivoMarket_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Marcar como exportados (historial)
      setExportedProducts(prev => {
        const next = new Set(prev);
        toExport.forEach(p => next.add(p.id));
        return next;
      });

      alert(`✅ Exportados ${toExport.length} productos para Uber Eats`);
    } catch (err) {
      console.error("Error exportando:", err);
      alert("Error al exportar");
    } finally {
      setExporting(false);
    }
  }, [products]);

  // NUEVA: Exportar SOLO los productos modificados
  const exportModifiedProducts = useCallback(() => {
    const modifiedIds = Object.keys(productModifications);
    if (modifiedIds.length === 0) {
      alert("No hay productos modificados para exportar");
      return;
    }

    log.action("Exportando", modifiedIds.length, "productos modificados");

    // Cabeceras simples para revisar cambios
    const headers = [
      "Código de Barras",
      "Nombre Original",
      "Nombre Modificado",
      "Categoría Original",
      "Categoría Modificada",
      "Precio Original",
      "Precio Modificado",
      "Stock",
      "Campos Modificados"
    ];

    const rows: string[][] = [];
    
    // Necesitamos obtener datos originales del API para comparar
    products.forEach(p => {
      const mods = productModifications[p.id];
      if (!mods) return;
      
      const fieldsChanged = Object.keys(mods).join(", ");
      
      rows.push([
        p.barcode,
        p.name, // Este ya es el modificado, no tenemos el original aquí
        mods.name || p.name,
        p.originalCategory,
        mods.uberCategory || p.uberCategory,
        String(p.price),
        mods.priceWithVat ? String(mods.priceWithVat) : String(p.priceWithVat),
        p.inStock ? "En Stock" : "Sin Stock",
        fieldsChanged
      ]);
    });

    // También incluir modificaciones de productos que podrían no estar cargados
    modifiedIds.forEach(id => {
      if (!products.find(p => p.id === id)) {
        const mods = productModifications[id];
        rows.push([
          id,
          "(No cargado)",
          mods.name || "",
          "",
          mods.uberCategory || "",
          "",
          mods.priceWithVat ? String(mods.priceWithVat) : "",
          "",
          Object.keys(mods).join(", ")
        ]);
      }
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => {
        const str = String(cell ?? "");
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Productos_Modificados_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    log.success("Exportados", rows.length, "productos modificados");
    alert(`✅ Exportados ${rows.length} productos modificados`);
  }, [products, productModifications]);

  // NUEVA: Exportar lista ORIGINAL sin modificaciones (datos del API)
  const exportOriginalList = useCallback(async () => {
    log.action("Exportando lista original desde API...");
    
    try {
      const res = await fetch("/api/admin/uber-eats/products");
      if (!res.ok) throw new Error("Error cargando productos");
      const json = await res.json();
      const data = json.items || json.data || json || [];

      const headers = [
        "Código de Barras",
        "Nombre",
        "Categoría",
        "Precio Neto",
        "Precio con IVA (19%)",
        "Descripción",
        "URL Imagen"
      ];

      const rows = (Array.isArray(data) ? data : []).map((p: any) => {
        // `sale_price` ya viene como precio final con IVA incluido.
        const priceWithVat = Math.round(Number(p.sale_price || 0));
        const netPrice = Math.round(priceWithVat / 1.19);
        
        return [
          p.barcode || "",
          p.name || "",
          p.category || "",
          String(netPrice),
          String(priceWithVat),
          p.description || "",
          p.image_url || ""
        ];
      });

      const csvContent = [
        headers.join(","),
        ...rows.map((row: string[]) => row.map((cell: string) => {
          const str = String(cell ?? "");
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        }).join(","))
      ].join("\n");

      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Productos_Original_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      log.success("Exportados", rows.length, "productos originales");
      alert(`✅ Exportados ${rows.length} productos (lista original sin modificar)`);
    } catch (err) {
      console.error("Error exportando lista original:", err);
      alert("Error al exportar lista original");
    }
  }, []);

  // NUEVA: Exportar lista COMPLETA con modificaciones aplicadas (para respaldo)
  const exportFullListWithMods = useCallback(() => {
    log.action("Exportando lista completa con modificaciones...");

    const headers = [
      "Código de Barras",
      "Nombre",
      "Categoría Principal",
      "Todas las Categorías",
      "Precio con IVA",
      "En Stock",
      "Tipo Producto",
      "HFSS",
      "Descripción",
      "URL Imagen",
      "Modificado"
    ];

    const rows = products.map(p => {
      const isModified = !!productModifications[p.id];
      return [
        p.barcode,
        p.name,
        p.uberCategory || p.uberCategories[0] || "",
        p.uberCategories.join(" | "),
        String(p.priceWithVat),
        p.inStock ? "1" : "0",
        p.productType || "",
        p.hfssItem || "",
        p.description || "",
        p.imageUrl || "",
        isModified ? "SÍ" : "NO"
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => {
        const str = String(cell ?? "");
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Productos_Completo_Modificado_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    log.success("Exportados", products.length, "productos con modificaciones");
    alert(`✅ Exportados ${products.length} productos (con modificaciones aplicadas)`);
  }, [products, productModifications]);

  // ====== SINCRONIZAR CON SUPABASE ======
  const syncToSupabase = useCallback(async (mode: 'all' | 'selected' | 'from_main' = 'all') => {
    log.action("syncToSupabase() - modo:", mode);
    setSyncing(true);
    
    try {
      if (mode === 'from_main') {
        // Sincronizar desde la tabla products principal
        const res = await fetch("/api/admin/uber-eats/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: 'sync_from_main' }),
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error sincronizando");
        
        log.success("Sincronizado desde products:", data.synced);
        alert(`✅ Sincronizados ${data.synced || 0} productos desde la tabla principal`);
        return;
      }
      
      // Preparar productos para sincronizar
      const productsToSync = mode === 'selected' 
        ? products.filter(p => p.exportSelected)
        : products;
      
      if (productsToSync.length === 0) {
        alert("No hay productos para sincronizar");
        return;
      }
      
      // Mapear al formato esperado por la API
      const payload = productsToSync.map(p => ({
        barcode: p.barcode,
        name: p.name,
        originalCategory: p.originalCategory,
        uberCategory: p.uberCategory,
        uberCategories: p.uberCategories,
        price: p.price,
        priceWithVat: p.priceWithVat,
        vatPercentage: p.vatPercentage,
        description: p.description,
        imageUrl: p.imageUrl,
        productType: p.productType,
        hfssItem: p.hfssItem,
        alcoholUnits: p.alcoholUnits,
        quantityRestriction: p.quantityRestriction,
        inStock: p.inStock,
        measurementUnit: p.measurementUnit,
        measurementValue: p.measurementValue,
        isValid: p.isValid,
        validationErrors: p.validationErrors,
        modified: !!productModifications[p.id],
        excluded: false,
      }));
      
      const res = await fetch("/api/admin/uber-eats/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products: payload, action: 'upsert' }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error sincronizando");
      
      log.success("Sincronizados:", data.synced);
      
      if (data.errors && data.errors.length > 0) {
        console.warn("Errores de sincronización:", data.errors);
        alert(`⚠️ Sincronización parcial: ${data.synced} productos. Errores: ${data.errors.length}`);
      } else {
        alert(`✅ Sincronizados ${data.synced} productos a Supabase`);
      }
    } catch (err: any) {
      log.error("Error en syncToSupabase:", err);
      alert("❌ Error sincronizando: " + (err.message || "Error desconocido"));
    } finally {
      setSyncing(false);
    }
  }, [products, productModifications]);

  // ====== SUBIR IMAGEN CON LÍMITE DE 2MB ======
  const handleImageUpload = useCallback(async (barcode: string, file: File) => {
    log.action("handleImageUpload() para producto:", barcode);
    
    // Validar tamaño
    if (file.size > MAX_IMAGE_SIZE) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(2);
      alert(`❌ El archivo es muy grande (${sizeMB}MB). Máximo permitido: 2MB`);
      return;
    }
    
    // Validar tipo
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert(`❌ Tipo de archivo no permitido: ${file.type}. Use: PNG, JPG, WEBP o GIF`);
      return;
    }
    
    setUploadingImage(barcode);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('barcode', barcode);
      
      const res = await fetch("/api/admin/uber-eats/upload-image", {
        method: "POST",
        body: formData,
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Error subiendo imagen");
      }
      
      log.success("Imagen subida:", data.url);
      
      // Actualizar el producto con la nueva URL
      updateProduct(barcode, "imageUrl", data.url);
      
      // Guardar en modificaciones
      setProductModifications(prev => ({
        ...prev,
        [barcode]: {
          ...prev[barcode],
          imageUrl: data.url
        }
      }));
      
      log.success("Producto actualizado con nueva imagen");
    } catch (err: any) {
      log.error("Error subiendo imagen:", err);
      alert("❌ Error subiendo imagen: " + (err.message || "Error desconocido"));
    } finally {
      setUploadingImage(null);
      setSelectedProductForUpload(null);
    }
  }, [updateProduct, MAX_IMAGE_SIZE]);

  // Manejar selección de archivo del input
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedProductForUpload) {
      handleImageUpload(selectedProductForUpload, file);
    }
    // Limpiar input para permitir seleccionar el mismo archivo
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [selectedProductForUpload, handleImageUpload]);

  // Abrir diálogo de archivo para un producto específico
  const openImageUploadDialog = useCallback((barcode: string) => {
    setSelectedProductForUpload(barcode);
    fileInputRef.current?.click();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className={isStandalone ? "min-h-screen p-4 md:p-6 space-y-6" : "space-y-6"}>
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Uber_Eats_2020_logo.svg/1200px-Uber_Eats_2020_logo.svg.png" alt="Uber Eats" className="h-8" />
              Exportar a Uber Eats
            </h1>
            <p className="text-emerald-100 mt-1">
              Prepara tu catálogo de productos para subir a Uber Eats Grocery
            </p>
          </div>
          <div className="flex gap-3">
            {isStandalone && (
              <button
                onClick={handleBack}
                className="px-4 py-2 bg-black/20 hover:bg-black/30 text-white rounded-lg flex items-center gap-2 transition"
                title="Volver"
              >
                ← Volver
              </button>
            )}
            {!isStandalone && (
              <button
                onClick={() => router.push("/uber-eats-editor")}
                className="px-4 py-2 bg-black/20 hover:bg-black/30 text-white rounded-lg flex items-center gap-2 transition"
                title="Abrir editor en pantalla completa"
              >
                ⛶ Pantalla completa
              </button>
            )}
            {/* Input oculto para subir imágenes */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
              className="hidden"
            />
            
            {/* Botón de resetear todos los cambios */}
            <button
              onClick={resetAllChanges}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-100 rounded-lg flex items-center gap-2 transition"
              title="Eliminar TODOS los cambios guardados"
            >
              🗑️ Reset Todo
            </button>
            
            {/* Menú de Sincronización con Supabase */}
            <div className="relative group">
              <button
                disabled={syncing}
                className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-100 rounded-lg flex items-center gap-2 transition disabled:opacity-50"
              >
                <CloudArrowUpIcon className="w-5 h-5" />
                {syncing ? "Sincronizando..." : "Sync Supabase ▼"}
              </button>
              <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button
                  onClick={() => syncToSupabase('all')}
                  disabled={syncing || products.length === 0}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-purple-50 flex items-center gap-2 disabled:opacity-50 border-b"
                >
                  <span className="text-lg">📤</span>
                  <div>
                    <div className="font-medium text-gray-900">Subir todos</div>
                    <div className="text-xs text-gray-500">{products.length} productos</div>
                  </div>
                </button>
                <button
                  onClick={() => syncToSupabase('selected')}
                  disabled={syncing || stats.exportSelected === 0}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50 border-b"
                >
                  <span className="text-lg">✅</span>
                  <div>
                    <div className="font-medium text-gray-900">Subir seleccionados</div>
                    <div className="text-xs text-gray-500">{stats.exportSelected} productos</div>
                  </div>
                </button>
                <button
                  onClick={() => syncToSupabase('from_main')}
                  disabled={syncing}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-green-50 flex items-center gap-2 disabled:opacity-50"
                >
                  <span className="text-lg">🔄</span>
                  <div>
                    <div className="font-medium text-gray-900">Sync desde Products</div>
                    <div className="text-xs text-gray-500">Desde tabla principal</div>
                  </div>
                </button>
              </div>
            </div>
            
            {excludedProducts.size > 0 && (
              <button
                onClick={restoreExcluded}
                className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-100 rounded-lg flex items-center gap-2 transition"
              >
                <ArrowPathIcon className="w-5 h-5" />
                Restaurar ({excludedProducts.size})
              </button>
            )}
            {hasChanges && (
              <button
                onClick={saveChanges}
                disabled={saving}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-2 font-semibold disabled:opacity-50 transition"
              >
                {saving ? "Guardando..." : "💾 Guardar cambios"}
              </button>
            )}
            <button
              onClick={loadProducts}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-2 transition"
            >
              <ArrowPathIcon className="w-5 h-5" />
              Recargar
            </button>

            {/* Menú desplegable de exportación */}
            <div className="relative group">
              <button
                className="px-4 py-2 bg-white text-emerald-700 hover:bg-emerald-50 rounded-lg flex items-center gap-2 font-semibold transition"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
                Exportar CSV ▼
              </button>
              <div className="absolute right-0 mt-1 w-64 bg-white rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button
                  onClick={exportToCSV}
                  disabled={exporting || stats.exportSelectedValid === 0}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-emerald-50 flex items-center gap-2 disabled:opacity-50 border-b"
                >
                  <span className="text-lg">🍔</span>
                  <div>
                    <div className="font-medium text-gray-900">Uber Eats (Seleccionados)</div>
                    <div className="text-xs text-gray-500">{stats.exportSelectedValid} productos válidos</div>
                  </div>
                </button>
                <button
                  onClick={exportModifiedProducts}
                  disabled={Object.keys(productModifications).length === 0}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-orange-50 flex items-center gap-2 disabled:opacity-50 border-b"
                >
                  <span className="text-lg">✏️</span>
                  <div>
                    <div className="font-medium text-gray-900">Solo Modificados</div>
                    <div className="text-xs text-gray-500">{Object.keys(productModifications).length} productos editados</div>
                  </div>
                </button>
                <button
                  onClick={exportFullListWithMods}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-blue-50 flex items-center gap-2 border-b"
                >
                  <span className="text-lg">📋</span>
                  <div>
                    <div className="font-medium text-gray-900">Lista Completa (con cambios)</div>
                    <div className="text-xs text-gray-500">{products.length} productos</div>
                  </div>
                </button>
                <button
                  onClick={exportOriginalList}
                  className="w-full px-4 py-3 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <span className="text-lg">📁</span>
                  <div>
                    <div className="font-medium text-gray-900">Lista Original (sin cambios)</div>
                    <div className="text-xs text-gray-500">Datos del servidor</div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-500">Total productos</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="text-2xl font-bold text-emerald-600">{stats.exportSelected}</div>
          <div className="text-sm text-gray-500">Para exportar</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="text-2xl font-bold text-green-600">{stats.valid}</div>
          <div className="text-sm text-gray-500">Válidos</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="text-2xl font-bold text-red-600">{stats.invalid}</div>
          <div className="text-sm text-gray-500">Con errores</div>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border">
          <div className="text-2xl font-bold text-blue-600">{stats.exportSelectedValid}</div>
          <div className="text-sm text-gray-500">Listos para exportar</div>
        </div>
      </div>

      {/* BARRA DE DEBUG - Mostrar estado de localStorage */}
      <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <span className="font-bold text-yellow-800">🔍 DEBUG:</span>
            <span className="text-yellow-700">
              Excluidos: <strong>{excludedProducts.size}</strong>
            </span>
            <span className="text-yellow-700">
              Modificados: <strong>{Object.keys(productModifications).length}</strong>
            </span>
            <span className="text-yellow-700">
              Categorías custom: <strong>{customCategories.length}</strong>
            </span>
            <span className="text-yellow-700">
              Productos cargados: <strong>{products.length}</strong>
            </span>
          </div>
          <button
            onClick={() => {
              log.info("=== ESTADO ACTUAL DE LOCALSTORAGE ===");
              log.storage("uberEats_excludedProducts:", localStorage.getItem("uberEats_excludedProducts"));
              log.storage("uberEats_productModifications:", localStorage.getItem("uberEats_productModifications"));
              log.storage("uberEats_customCategories:", localStorage.getItem("uberEats_customCategories"));
              log.info("=== FIN DEBUG ===");
              alert("Estado guardado en consola (F12)");
            }}
            className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
          >
            Ver en consola
          </button>
        </div>
      </div>

      {/* Gestor de Categorías */}
      <div className="bg-white rounded-lg shadow-sm border overflow-visible">
        <button
          onClick={() => setShowCategoryManager(!showCategoryManager)}
          className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition"
        >
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-gray-900">📂 Gestionar Categorías</span>
            <span className="text-sm text-gray-500">({uniqueCategories.length} categorías)</span>
          </div>
          <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform ${showCategoryManager ? "rotate-180" : ""}`} />
        </button>
        
        {showCategoryManager && (
          <div className="p-4 space-y-4">
            <p className="text-sm text-gray-600">
              Estas son tus categorías actuales. Puedes agregar nuevas o editar las existentes.
              Los cambios se aplicarán a todos los productos de esa categoría.
            </p>

            {/* Agregar nueva categoría */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nueva categoría..."
                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
                onKeyDown={(e) => e.key === "Enter" && addCategory()}
              />
              <button
                onClick={addCategory}
                disabled={!newCategoryName.trim()}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1"
              >
                <PlusIcon className="w-4 h-4" />
                Agregar
              </button>
            </div>
            
            {/* Lista de categorías */}
            <div className="grid gap-2 max-h-[300px] overflow-y-auto">
              {uniqueCategories.map((cat) => (
                <div key={cat} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group">
                  {editingCategory === cat ? (
                    <>
                      <input
                        type="text"
                        value={editCategoryValue}
                        onChange={(e) => setEditCategoryValue(e.target.value)}
                        className="flex-1 px-2 py-1 border rounded focus:ring-2 focus:ring-emerald-500"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") renameCategory(cat, editCategoryValue);
                          if (e.key === "Escape") setEditingCategory(null);
                        }}
                      />
                      <button
                        onClick={() => renameCategory(cat, editCategoryValue)}
                        className="px-2 py-1 bg-emerald-600 text-white text-sm rounded"
                      >
                        Guardar
                      </button>
                      <button
                        onClick={() => setEditingCategory(null)}
                        className="px-2 py-1 border text-sm rounded"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{cat}</div>
                        <div className="text-xs text-gray-500">
                          {products.filter(p => p.uberCategory === cat).length} productos
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setEditingCategory(cat);
                          setEditCategoryValue(cat);
                        }}
                        className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded opacity-0 group-hover:opacity-100 transition"
                        title="Editar categoría"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-lg p-4 shadow-sm border space-y-4">
        <div className="flex flex-wrap gap-4">
          {/* Búsqueda */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre, código o categoría..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Filtro categoría original */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Todas las categorías</option>
            {uniqueCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          {/* Filtro validez */}
          <select
            value={filterValid}
            onChange={(e) => setFilterValid(e.target.value as any)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">Todos</option>
            <option value="valid">✅ Solo válidos</option>
            <option value="invalid">❌ Solo con errores</option>
          </select>

          {/* Solo seleccionados */}
          <label className="flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={showOnlySelected}
              onChange={(e) => setShowOnlySelected(e.target.checked)}
              className="rounded text-emerald-600"
            />
            <span className="text-sm">Solo para exportar</span>
          </label>
        </div>

        {/* Acciones masivas */}
        <div className="flex flex-wrap items-center gap-4 pt-4 border-t">
          <span className="text-sm font-medium text-gray-700">Acciones masivas:</span>

          <button
            onClick={selectAllExportFiltered}
            className="px-3 py-1.5 text-sm bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition"
          >
            Marcar export ({filteredProducts.length})
          </button>

          <button
            onClick={deselectAllExport}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            Quitar export
          </button>

          <button
            onClick={selectAllEditFiltered}
            className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition"
          >
            Seleccionar editar ({filteredProducts.length})
          </button>

          <button
            onClick={deselectAllEdit}
            className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            Quitar editar
          </button>

          <button
            onClick={removeSelected}
            disabled={stats.editSelected === 0}
            className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition disabled:opacity-50"
          >
            <TrashIcon className="w-4 h-4 inline mr-1" />
            Excluir del editor ({stats.editSelected})
          </button>

          <div className="flex items-center gap-2 ml-auto">
            <select
              value={bulkAction}
              onChange={(e) => {
                setBulkAction(e.target.value);
                setBulkValue("");
              }}
              className="px-3 py-1.5 text-sm border rounded-lg"
            >
              <option value="">Cambio masivo...</option>
              <option value="category">Categoría Uber</option>
              <option value="productType">Tipo de producto</option>
              <option value="hfss">HFSS</option>
              <option value="vat">% IVA</option>
            </select>

            {bulkAction === "category" && (
              <select
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
                className="px-3 py-1.5 text-sm border rounded-lg"
              >
                <option value="">Seleccionar categoría...</option>
                {uniqueCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}

            {bulkAction === "productType" && (
              <select
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
                className="px-3 py-1.5 text-sm border rounded-lg"
              >
                {PRODUCT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            )}

            {bulkAction === "hfss" && (
              <select
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
                className="px-3 py-1.5 text-sm border rounded-lg"
              >
                {HFSS_OPTIONS.map((h) => (
                  <option key={h.value} value={h.value}>
                    {h.label}
                  </option>
                ))}
              </select>
            )}

            {bulkAction === "vat" && (
              <input
                type="number"
                step="1"
                placeholder="19"
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
                className="px-3 py-1.5 text-sm border rounded-lg w-24"
              />
            )}

            {bulkAction && bulkValue && (
              <button
                onClick={applyBulkAction}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Aplicar
              </button>
            )}
          </div>
        </div>

        {/* NUEVA SECCIÓN: Herramientas de edición masiva de nombres */}
        <div className="flex flex-wrap items-center gap-4 pt-4 border-t">
          <span className="text-sm font-medium text-gray-700">🔧 Edición masiva de nombres:</span>
          
          <button
            onClick={addMeasurementUnits}
            className="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition"
            title="Normaliza unidades: ml→ML, lt→LT, g→G, kg→KG"
          >
            📏 Normalizar unidades
          </button>
          
          <button
            onClick={() => {
              const pattern = prompt("Buscar (regex o texto):", "");
              if (!pattern) return;
              const replacement = prompt("Reemplazar con:", "");
              if (replacement === null) return;
              applyNamePattern(pattern, replacement);
            }}
            className="px-3 py-1.5 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition"
            title="Buscar y reemplazar texto en nombres de productos seleccionados"
          >
            🔍 Buscar/Reemplazar
          </button>
          
          <button
            onClick={() => {
              const suffix = prompt("Agregar al final de cada nombre (ej: ' LT'):", "");
              if (!suffix) return;
              const selectedProducts = products.filter(p => p.editSelected);
              if (selectedProducts.length === 0) {
                alert("Selecciona productos primero");
                return;
              }
              setProductModifications(prev => {
                const updated = { ...prev };
                selectedProducts.forEach(p => {
                  if (!updated[p.id]) updated[p.id] = {};
                  updated[p.id].name = p.name.trim() + suffix;
                });
                return updated;
              });
              setProducts(prev => prev.map(p => {
                if (!p.editSelected) return p;
                return { ...p, name: p.name.trim() + suffix };
              }));
              log.success("Sufijo agregado a", selectedProducts.length, "productos");
              alert(`Sufijo "${suffix}" agregado a ${selectedProducts.length} productos`);
            }}
            disabled={stats.editSelected === 0}
            className="px-3 py-1.5 text-sm bg-teal-100 text-teal-700 rounded-lg hover:bg-teal-200 transition disabled:opacity-50"
          >
            ➕ Agregar sufijo ({stats.editSelected})
          </button>
          
          <button
            onClick={() => {
              const prefix = prompt("Agregar al inicio de cada nombre (ej: 'NUEVO '):", "");
              if (!prefix) return;
              const selectedProducts = products.filter(p => p.editSelected);
              if (selectedProducts.length === 0) {
                alert("Selecciona productos primero");
                return;
              }
              setProductModifications(prev => {
                const updated = { ...prev };
                selectedProducts.forEach(p => {
                  if (!updated[p.id]) updated[p.id] = {};
                  updated[p.id].name = prefix + p.name.trim();
                });
                return updated;
              });
              setProducts(prev => prev.map(p => {
                if (!p.editSelected) return p;
                return { ...p, name: prefix + p.name.trim() };
              }));
              log.success("Prefijo agregado a", selectedProducts.length, "productos");
              alert(`Prefijo "${prefix}" agregado a ${selectedProducts.length} productos`);
            }}
            disabled={stats.editSelected === 0}
            className="px-3 py-1.5 text-sm bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition disabled:opacity-50"
          >
            ⬅️ Agregar prefijo ({stats.editSelected})
          </button>
        </div>
      </div>

      {/* Tabla de productos - COMPACTA */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
                  <input
                    type="checkbox"
                    checked={filteredProducts.length > 0 && filteredProducts.every((p) => p.exportSelected)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      const filteredIds = new Set(filteredProducts.map((p) => p.id));
                      setProducts((prev) => {
                        const next = prev.map((p) => (filteredIds.has(p.id) ? { ...p, exportSelected: checked } : p));
                        localStorage.setItem(EXPORT_SELECTED_KEY, JSON.stringify(next.filter(x => x.exportSelected).map(x => x.id)));
                        return next;
                      });
                    }}
                    className="rounded text-emerald-600"
                    title="Exportar todos"
                  />
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-12">
                  <input
                    type="checkbox"
                    checked={filteredProducts.length > 0 && filteredProducts.every((p) => p.editSelected)}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      const filteredIds = new Set(filteredProducts.map((p) => p.id));
                      setProducts((prev) => prev.map((p) => (filteredIds.has(p.id) ? { ...p, editSelected: checked } : p)));
                    }}
                    className="rounded text-blue-600"
                    title="Seleccionar todos"
                  />
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-16">Estado</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">Precio</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase w-28">Acción</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts
                .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                .map((product) => (
                <tr
                  key={product.id}
                  className={`hover:bg-gray-50 transition cursor-pointer ${product.exportSelected ? "bg-emerald-50" : ""} ${
                    !product.isValid ? "bg-red-50" : ""
                  }`}
                  onClick={() => setSelectedProductForUpload(product.id)}
                >
                  <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={product.exportSelected}
                      onChange={() => toggleExportSelected(product.id)}
                      className="rounded text-emerald-600"
                    />
                  </td>
                  <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={product.editSelected}
                      onChange={() => toggleEditSelected(product.id)}
                      className="rounded text-blue-600"
                    />
                  </td>
                  <td className="px-3 py-4">
                    {product.isValid ? (
                      <div className="flex items-center gap-1">
                        <CheckCircleIcon className="w-5 h-5 text-green-500" title="Válido" />
                        {exportedProducts.has(product.id) && (
                          <span className="text-[10px] px-1 py-0.5 rounded bg-blue-100 text-blue-700">EXP</span>
                        )}
                      </div>
                    ) : (
                      <div className="relative group">
                        <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                        <div className="absolute z-10 hidden group-hover:block w-64 p-2 bg-red-100 text-red-800 text-xs rounded shadow-lg left-6 top-0">
                          {product.validationErrors.map((e, i) => (
                            <div key={i}>• {e}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-4">
                    <div className="max-w-md">
                      <div className="font-medium text-gray-900 truncate">{product.name}</div>
                      <div className="text-xs text-gray-500 font-mono truncate">{product.barcode}</div>
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="text-sm text-gray-900">
                      {product.uberCategories.length > 0 ? (
                        product.uberCategories.length === 1 ? (
                          <span className="px-2 py-1 bg-gray-100 rounded-md text-xs">{product.uberCategories[0]}</span>
                        ) : (
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-medium">
                            {product.uberCategories.length} categorías
                          </span>
                        )
                      ) : (
                        <span className="text-gray-400 text-xs italic">Sin categoría</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-4">
                    <div className="font-semibold text-gray-900">${product.priceWithVat.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">IVA {product.vatPercentage}%</div>
                  </td>
                  <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => setSelectedProductForUpload(product.id)}
                      className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <PencilIcon className="w-4 h-4" />
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {filteredProducts.length > ITEMS_PER_PAGE && (
          <div className="px-4 py-3 bg-gray-50 border-t flex flex-wrap items-center justify-between gap-4">
            <div className="text-sm text-gray-600">
              Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)} de {filteredProducts.length}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50">⏮️</button>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50">◀️</button>
              <span className="px-3 py-1 text-sm font-semibold bg-emerald-100 text-emerald-800 rounded">Pág. {currentPage}/{Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)}</span>
              <button onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredProducts.length / ITEMS_PER_PAGE), p + 1))} disabled={currentPage >= Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)} className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50">▶️</button>
              <button onClick={() => setCurrentPage(Math.ceil(filteredProducts.length / ITEMS_PER_PAGE))} disabled={currentPage >= Math.ceil(filteredProducts.length / ITEMS_PER_PAGE)} className="px-3 py-1 text-sm border rounded hover:bg-gray-100 disabled:opacity-50">⏭️</button>
            </div>
          </div>
        )}

        {filteredProducts.length === 0 && (
          <div className="px-4 py-12 text-center text-gray-500">
            No se encontraron productos
          </div>
        )}
      </div>

      {/* Panel lateral de edición - Se abre al hacer clic en Editar o en una fila */}
      {selectedProductForUpload && (() => {
        const product = products.find(p => p.id === selectedProductForUpload);
        if (!product) return null;

        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-end" onClick={() => setSelectedProductForUpload(null)}>
            <div className="bg-white h-full w-full max-w-2xl shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="sticky top-0 bg-emerald-600 text-white px-6 py-4 flex items-center justify-between z-10 shadow-md">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold">Editar Producto</h2>
                  <p className="text-sm text-emerald-100 truncate">{product.name}</p>
                </div>
                <button onClick={() => setSelectedProductForUpload(null)} className="p-2 hover:bg-emerald-700 rounded-lg transition ml-4 flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Contenido */}
              <div className="p-6 space-y-6">
                {/* Información básica */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Información Básica</h3>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Código de Barras</label><input type="text" value={product.barcode} onChange={(e) => updateProduct(product.id, "barcode", e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label><input type="text" value={product.name} onChange={(e) => updateProduct(product.id, "name", e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500" placeholder="Nombre + marca + tamaño" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label><textarea value={product.description} onChange={(e) => updateProduct(product.id, "description", e.target.value)} rows={3} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">External Data</label><input type="text" value={product.externalData || ""} onChange={(e) => updateProduct(product.id, "externalData", e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500" /></div>
                </div>

                {/* Categorías */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Categorías</h3>
                  <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1 bg-gray-50">
                    {uniqueCategories.map((cat) => (
                      <label key={cat} className="flex items-center gap-2 px-2 py-1.5 hover:bg-white rounded cursor-pointer">
                        <input type="checkbox" checked={product.uberCategories.includes(cat)} onChange={(e) => { const newCats = e.target.checked ? [...product.uberCategories, cat] : product.uberCategories.filter((c) => c !== cat); updateProduct(product.id, 'uberCategories', newCats); updateProduct(product.id, 'uberCategory', newCats[0] || ''); }} className="rounded text-emerald-600" />
                        <span className={product.uberCategories.includes(cat) ? 'font-medium text-emerald-700' : ''}>{cat}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Precios */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Precios e Inventario</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Precio *</label><div className="flex"><span className="px-3 py-2 bg-gray-100 border border-r-0 rounded-l-lg">$</span><input type="number" step="0.01" value={product.priceWithVat} onChange={(e) => updateProduct(product.id, "priceWithVat", Number(e.target.value))} className="flex-1 px-3 py-2 border rounded-r-lg focus:ring-2 focus:ring-emerald-500" /></div></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">IVA %</label><input type="number" value={product.vatPercentage} onChange={(e) => updateProduct(product.id, "vatPercentage", Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Cantidad máx</label><input type="number" value={product.quantityRestriction ?? 5} onChange={(e) => updateProduct(product.id, "quantityRestriction", Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Stock</label><label className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-gray-50"><input type="checkbox" checked={!product.inStock} onChange={(e) => updateProduct(product.id, "inStock", !e.target.checked)} className="rounded text-emerald-600" /><span className={`text-sm font-medium ${product.inStock ? "text-green-600" : "text-red-600"}`}>{product.inStock ? "✓ En stock" : "✗ Sin stock"}</span></label></div>
                  </div>
                </div>

                {/* Imagen */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Imagen</h3>
                  <div className="flex gap-2">
                    <input type="text" value={product.imageUrl} onChange={(e) => updateProduct(product.id, "imageUrl", e.target.value)} className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500" placeholder="URL de imagen" />
                    <button type="button" onClick={() => openImageUploadDialog(product.id)} disabled={uploadingImage === product.id} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"><ArrowUpTrayIcon className="w-4 h-4" />{uploadingImage === product.id ? "..." : "Subir"}</button>
                  </div>
                  {product.imageUrl && product.imageUrl !== "null" && (
                    <div className="p-4 bg-gray-50 rounded-lg border"><img src={product.imageUrl} alt={product.name} className="h-40 w-auto object-contain mx-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} /></div>
                  )}
                </div>

                {/* Tipos */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Tipos y Restricciones</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label><select value={product.productType} onChange={(e) => updateProduct(product.id, "productType", e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500">{PRODUCT_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}</select></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">HFSS</label><select value={product.hfssItem} onChange={(e) => updateProduct(product.id, "hfssItem", e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500">{HFSS_OPTIONS.map((h) => (<option key={h.value} value={h.value}>{h.label}</option>))}</select></div>
                    {product.productType === "Alcohol" && (<div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Unidades alcohol</label><input type="number" step="0.1" value={product.alcoholUnits ?? 0} onChange={(e) => updateProduct(product.id, "alcoholUnits", Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500" /></div>)}
                  </div>
                </div>

                {/* Errores */}
                {!product.isValid && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex gap-2"><ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" /><div><h4 className="text-sm font-semibold text-red-800 mb-1">Errores:</h4><ul className="text-sm text-red-700 space-y-1">{product.validationErrors.map((e, i) => (<li key={i}>• {e}</li>))}</ul></div></div>
                  </div>
                )}

                {/* Botones */}
                <div className="flex gap-3 pt-6 border-t">
                  <button onClick={() => setSelectedProductForUpload(null)} className="flex-1 px-4 py-3 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium">Cerrar</button>
                  <button onClick={() => setSelectedProductForUpload(null)} className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium">✓ Guardar</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Selector flotante de categorías */}
      {categoryPopover && (() => {
        const p = products.find((x) => x.id === categoryPopover.productId);
        if (!p) return null;

        return (
          <div
            className="fixed inset-0 z-50"
            onMouseDown={() => closeCategoryPopover()}
            onTouchStart={() => closeCategoryPopover()}
          >
            <div
              ref={categoryPopoverPanelRef}
              tabIndex={-1}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onKeyDown={handleCategoryPopoverKeyDown}
              className="fixed z-50 w-80 max-w-[calc(100vw-16px)] bg-white border rounded-lg shadow-lg"
              style={{
                left: categoryPopover.left,
                top: categoryPopover.top,
                transform: categoryPopover.openUp ? 'translateY(-100%)' : undefined,
              }}
            >
              <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50 rounded-t-lg">
                <div className="text-sm font-semibold text-gray-800">Categorías</div>
                <button
                  type="button"
                  onClick={() => closeCategoryPopover()}
                  className="px-2 py-1 text-sm border rounded hover:bg-gray-100"
                  title="Cerrar"
                >
                  ×
                </button>
              </div>

              <div className="px-3 py-2 text-xs text-gray-600 border-b">
                Escribe una letra para saltar a esa categoría.
              </div>

              <div ref={categoryPopoverListRef} className="max-h-60 overflow-y-auto">
                {uniqueCategories.map((cat) => (
                  <label
                    key={cat}
                    data-cat-lower={String(cat).toLowerCase()}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={p.uberCategories.includes(cat)}
                      onChange={(e) => {
                        const newCategories = e.target.checked
                          ? [...p.uberCategories, cat]
                          : p.uberCategories.filter((c) => c !== cat);
                        updateProduct(p.id, 'uberCategories', newCategories);
                        updateProduct(p.id, 'uberCategory', newCategories[0] || '');
                      }}
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className={p.uberCategories.includes(cat) ? 'font-medium text-emerald-700' : ''}>
                      {cat}
                    </span>
                  </label>
                ))}

                {uniqueCategories.length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500">No hay categorías</div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Instrucciones */}
      <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
          <InformationCircleIcon className="w-5 h-5" />
          Instrucciones para subir a Uber Eats
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
          <li>Selecciona los productos que deseas vender en Uber Eats (máximo recomendado: 200)</li>
          <li>Revisa y corrige las categorías asignadas automáticamente</li>
          <li>Si aplica, ajusta Product Type / Alcohol Units / HFSS</li>
          <li>Verifica que todos los productos seleccionados estén marcados como válidos (✅)</li>
          <li>Haz clic en Exportar CSV para descargar el archivo</li>
          <li>
            Envía el archivo CSV a <strong>mercados@uber.com</strong> para su revisión
          </li>
        </ol>
      </div>
    </div>
  );
}
