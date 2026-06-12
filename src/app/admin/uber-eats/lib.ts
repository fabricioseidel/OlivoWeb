// ====== SISTEMA DE LOGGING ======
const LOG_PREFIX = "🍔 [UBER-EATS]";
export const log = {
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
export const PRODUCT_TYPES = [
  { value: "null", label: "null" },
  { value: "Alcohol", label: "Alcohol" },
  { value: "Tobacco", label: "Tabaco" },
  { value: "Vapes", label: "Vapes/Cigarros Electrónicos" },
];

// HFSS Items (High Fat, Sugar, Salt)
export const HFSS_OPTIONS = [
  { value: "", label: "No aplica" },
  { value: "HFSS Food", label: "HFSS Food (Comida alta en grasa/azúcar/sal)" },
  { value: "HFSS Drink", label: "HFSS Drink (Bebida alta en azúcar)" },
];

export const EXPORT_SELECTED_KEY = "uberEats_exportSelectedProducts";
export const EXPORTED_PRODUCTS_KEY = "uberEats_exportedProducts";

export const ITEMS_PER_PAGE = 50;

export interface UberEatsProduct {
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

export interface UberEatsStats {
  total: number;
  exportSelected: number;
  editSelected: number;
  valid: number;
  invalid: number;
  exportSelectedValid: number;
}

// ====== SELECTOR FLOTANTE DE CATEGORÍAS ======
export type CategoryPopoverState = {
  productId: string;
  top: number;
  left: number;
  openUp: boolean;
};

// Detectar tipo de producto (Alcohol, Tobacco, Vapes)
export function detectProductType(category: string, name: string): string {
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
export function detectHFSS(category: string, name: string): string {
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
export function extractMeasurement(name: string): { value: number; unit: string } {
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
export function validateProduct(product: UberEatsProduct): string[] {
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

// ====== HELPERS DE LOCALSTORAGE (inicialización de estado) ======
export function initExportedProductsFromStorage(): Set<string> {
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
}

export function initExcludedProductsFromStorage(): Set<string> {
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
}

export function initProductModificationsFromStorage(): Record<string, Partial<UberEatsProduct>> {
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
}

// ====== HELPERS DE LOCALSTORAGE (persistencia) ======
export function persistExcludedProducts(excludedProducts: Set<string>) {
  log.save("Guardando productos excluidos...", "Count:", excludedProducts.size);
  if (excludedProducts.size > 0) {
    const data = JSON.stringify([...excludedProducts]);
    localStorage.setItem("uberEats_excludedProducts", data);
    log.success("Productos excluidos guardados:", data);
  } else {
    localStorage.removeItem("uberEats_excludedProducts");
    log.info("Sin productos excluidos, limpiado localStorage");
  }
}

export function persistProductModifications(productModifications: Record<string, Partial<UberEatsProduct>>) {
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
}

export function persistCustomCategories(customCategories: string[]) {
  log.save("Guardando categorías personalizadas...", "Count:", customCategories.length);
  if (customCategories.length > 0) {
    const data = JSON.stringify(customCategories);
    localStorage.setItem("uberEats_customCategories", data);
    log.success("Categorías guardadas:", data);
  } else {
    localStorage.removeItem("uberEats_customCategories");
    log.info("Sin categorías personalizadas, limpiado localStorage");
  }
}

export function loadCustomCategoriesFromStorage(setCustomCategories: (cats: string[]) => void) {
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
}

// ====== HELPERS DE CARGA DE PRODUCTOS ======
export async function getResponseErrorDetails(res: Response): Promise<string> {
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
  return details;
}

export function readSavedModificationsForLoad(): Record<string, Partial<UberEatsProduct>> {
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

  return savedModifications;
}

export function readExportSelectedSet(): Set<string> {
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
  return exportSelectedSet;
}

export function readExcludedSetForLoad(): Set<string> {
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
  return excludedSet;
}

export function mapApiProductToUber(
  p: any,
  savedModifications: Record<string, Partial<UberEatsProduct>>,
  exportSelectedSet: Set<string>,
): UberEatsProduct {
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
}

// ====== HELPERS DE FILTRADO ======
export function productMatchesFilters(
  p: UberEatsProduct,
  searchTerm: string,
  filterCategory: string,
  filterValid: "all" | "valid" | "invalid",
  showOnlySelected: boolean,
): boolean {
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
}

// ====== HELPERS DE ACCIONES MASIVAS ======
export function applyBulkActionToMods(
  entry: Partial<UberEatsProduct>,
  p: UberEatsProduct,
  bulkAction: string,
  bulkValue: string,
) {
  switch (bulkAction) {
    case "category": {
      // Agregar categoría a las existentes (sin duplicar)
      const currentCats = (p.uberCategories || []);
      if (!currentCats.includes(bulkValue)) {
        entry.uberCategories = [...currentCats, bulkValue];
      }
      entry.uberCategory = bulkValue;
      break;
    }
    case "productType":
      entry.productType = bulkValue;
      break;
    case "hfss":
      entry.hfssItem = bulkValue;
      break;
    case "vat":
      entry.vatPercentage = parseFloat(bulkValue) || 19;
      break;
  }
}

export function applyBulkActionToProduct(
  updated: UberEatsProduct,
  bulkAction: string,
  bulkValue: string,
) {
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
}

// Normalizar unidades existentes
export function normalizeUnitsInName(name: string): string {
  let newName = name;
  newName = newName.replace(/(\d+)\s*ml\b/gi, '$1 ML');
  newName = newName.replace(/(\d+)\s*lt?\b/gi, '$1 LT');
  newName = newName.replace(/(\d+)\s*g\b/gi, '$1 G');
  newName = newName.replace(/(\d+)\s*gr\b/gi, '$1 G');
  newName = newName.replace(/(\d+)\s*kg\b/gi, '$1 KG');
  newName = newName.replace(/(\d+)\s*cc\b/gi, '$1 ML');
  return newName;
}

// ====== HELPERS DE EXPORTACIÓN CSV ======
export function downloadCSV(headers: string[], rows: any[][], filename: string) {
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
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function buildUberEatsCsv(toExport: UberEatsProduct[]): { headers: string[]; rows: any[][] } {
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

  return { headers, rows };
}

// Exportar SOLO los productos modificados
export function exportModifiedProductsCsv(
  products: UberEatsProduct[],
  productModifications: Record<string, Partial<UberEatsProduct>>,
) {
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

  downloadCSV(headers, rows, `Productos_Modificados_${new Date().toISOString().slice(0, 10)}.csv`);

  log.success("Exportados", rows.length, "productos modificados");
  alert(`✅ Exportados ${rows.length} productos modificados`);
}

// Exportar lista ORIGINAL sin modificaciones (datos del API)
export async function exportOriginalListCsv() {
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

    downloadCSV(headers, rows, `Productos_Original_${new Date().toISOString().slice(0, 10)}.csv`);

    log.success("Exportados", rows.length, "productos originales");
    alert(`✅ Exportados ${rows.length} productos (lista original sin modificar)`);
  } catch (err) {
    console.error("Error exportando lista original:", err);
    alert("Error al exportar lista original");
  }
}

// Exportar lista COMPLETA con modificaciones aplicadas (para respaldo)
export function exportFullListWithModsCsv(
  products: UberEatsProduct[],
  productModifications: Record<string, Partial<UberEatsProduct>>,
) {
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

  downloadCSV(headers, rows, `Productos_Completo_Modificado_${new Date().toISOString().slice(0, 10)}.csv`);

  log.success("Exportados", products.length, "productos con modificaciones");
  alert(`✅ Exportados ${products.length} productos (con modificaciones aplicadas)`);
}

// ====== HELPERS DE GUARDADO Y SINCRONIZACIÓN ======
export function buildSaveItems(
  productsToSave: UberEatsProduct[],
  productModifications: Record<string, Partial<UberEatsProduct>>,
  hasExplicitSelection: boolean,
): any[] {
  return productsToSave.map((product) => {
    const mods = (productModifications || {})[product.id] || {};
    const payload: any = { barcode: product.barcode };

    const normalizeText = (v: any) => {
      const s = String(v ?? "").trim();
      if (!s || s.toLowerCase() === "null") return "";
      return s;
    };

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
}

// Mapear al formato esperado por la API
export function buildSyncPayload(
  productsToSync: UberEatsProduct[],
  productModifications: Record<string, Partial<UberEatsProduct>>,
) {
  return productsToSync.map(p => ({
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
}

// ====== HELPERS DE SUBIDA DE IMÁGENES ======
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB en bytes

export function validateImageFile(file: File): boolean {
  // Validar tamaño
  if (file.size > MAX_IMAGE_SIZE) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(2);
    alert(`❌ El archivo es muy grande (${sizeMB}MB). Máximo permitido: 2MB`);
    return false;
  }

  // Validar tipo
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    alert(`❌ Tipo de archivo no permitido: ${file.type}. Use: PNG, JPG, WEBP o GIF`);
    return false;
  }

  return true;
}

export async function uploadImageRequest(barcode: string, file: File): Promise<string> {
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

  return data.url;
}

// ====== HELPERS DERIVADOS DE PRODUCTOS ======
// Categorías: deben ser idénticas a las categorías locales del producto.
// Usamos `uberCategories` (derivadas desde la BD) como fuente.
export function getUniqueCategories(products: UberEatsProduct[]): string[] {
  const cats = new Set<string>();
  for (const p of products) {
    for (const c of p.uberCategories || []) {
      const s = String(c || '').trim();
      if (s) cats.add(s);
    }
  }
  return Array.from(cats).sort();
}

// Estadísticas
export function computeStats(products: UberEatsProduct[]): UberEatsStats {
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
}

// Mantener price (neto) y priceWithVat coherentes
export function recalcPricesForField(updated: UberEatsProduct, field: keyof UberEatsProduct, value: any) {
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
}

export function persistExportSelectionIds(next: UberEatsProduct[]) {
  const ids = next.filter(p => p.exportSelected).map(p => p.id);
  localStorage.setItem(EXPORT_SELECTED_KEY, JSON.stringify(ids));
}

// ====== TYPE-AHEAD DEL SELECTOR FLOTANTE DE CATEGORÍAS ======
export function categoryTypeAheadKeyDown(
  ev: { key: string; preventDefault: () => void },
  categoryTypeBufferRef: { current: { value: string; lastAt: number } },
  categoryPopoverListRef: { current: HTMLDivElement | null },
  closeCategoryPopover: () => void,
) {
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
}

// ====== REQUESTS AL SERVIDOR ======
export async function postSaveItems(items: any[]) {
  const res = await fetch("/api/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });

  if (!res.ok) {
    const details = await getResponseErrorDetails(res);
    throw new Error(`Error guardando productos (${res.status} ${res.statusText})${details}`);
  }
}

export async function syncToSupabaseRequest(
  mode: 'all' | 'selected' | 'from_main',
  products: UberEatsProduct[],
  productModifications: Record<string, Partial<UberEatsProduct>>,
) {
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

  const payload = buildSyncPayload(productsToSync, productModifications);

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
}
