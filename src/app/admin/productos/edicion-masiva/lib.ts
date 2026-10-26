
export type ProductChanges = {
  price?: number;
  offerPrice?: number | null;
  stock?: number;
  minStock?: number;
  optimumStock?: number;
  name?: string;
  barcode?: string;
  categories?: string[];
  description?: string;
  image?: string;
  isActive?: boolean;
  purchasePrice?: number;
};

export interface ProductSnapshot {
  id: string;
  barcode: string;
  name: string;
  price: number;
  offerPrice: number | null;
  stock: number;
  minStock: number;
  optimumStock: number;
  categories: string[];
  description: string;
  image?: string;
  isActive?: boolean;
  purchasePrice?: number;
}

export interface Backup {
  id: string;
  timestamp: string;
  label: string;
  products: ProductSnapshot[];
}

export const BACKUP_KEY = "olivo-bulk-editor-backups";
export const DISMISSED_DUPES_KEY = "olivo-bulk-editor-duplicados-descartados";
export const VIEW_KEY = "olivo-bulk-editor-view";
export const SORT_KEY = "olivo-bulk-editor-sort";
export const MAX_BACKUPS = 10;
// Renderizar cientos de filas con inputs congela la página; se pagina de a 60.
export const PAGE_SIZE = 60;

export type SortPriority =
  | "stock_real"       // Lo contado en la góndola primero: es lo que se publica
  | "near_ready"       // Casi listos primero: 1 faltante, luego 2, luego 3...
  | "most_incomplete"  // Más incompletos primero
  | "ready_first"      // Listos primero
  | "name_asc"         // Nombre A-Z
  | "name_desc"        // Nombre Z-A
  | "stock_asc"        // Menor stock primero
  | "stock_desc"       // Mayor stock primero
  | "price_asc"        // Menor precio
  | "price_desc";      // Mayor precio

/**
 * Pestañas por datos de ficha (foto, precio, categoría, SKU). El stock no
 * cuenta acá: va en su propia fila de filtros, y se combinan.
 */
export type CompletenessTab = "all" | "missing_1" | "missing_2" | "missing_3_plus" | "complete";

/**
 * Los dos grupos de filtros son independientes y se combinan: "Con stock" +
 * "Falta foto" es justamente lo que hay que fotografiar para publicar ya.
 */
export type StockFilter =
  | "all"
  | "with_stock"      // Stock real > 0: lo que hay de verdad en la tienda
  | "counted"         // Escaneado en un conteo físico (tenga o no stock)
  | "counted_today"   // Escaneado en el conteo más reciente (ayer / hoy)
  | "uncounted"       // Nunca pasó por un conteo: su stock no está confirmado
  | "duplicates";     // Posibles duplicados: el mismo producto en dos filas

export type MissingFilter =
  | "all"
  | "missing_photo"
  | "missing_price"
  | "missing_stock"
  | "missing_category"
  | "missing_barcode"
  | "missing_cost"
  | "inactive";

export interface ProductDiagnostics {
  missing: string[];
  missingCount: number;
  /** Lo que falta de la ficha (sin contar el stock), y cuántos son. */
  missingData: string[];
  missingDataCount: number;
  isReady: boolean;
  percentage: number;
  hasImage: boolean;
  hasPrice: boolean;
  hasStock: boolean;
  hasCategories: boolean;
  hasBarcode: boolean;
  hasCost: boolean;
  isActive: boolean;
}

export function getProductDiagnostics(p: any, changes?: ProductChanges): ProductDiagnostics {
  const currentImage = changes?.image !== undefined ? changes.image : p.image;
  const price = changes?.price ?? p.price;
  const stock = changes?.stock ?? p.stock;
  const categories = changes?.categories ?? p.categories ?? [];
  const barcode = changes?.barcode ?? p.barcode ?? "";
  const cost = changes?.purchasePrice ?? p.purchasePrice;
  const isActive = (changes?.isActive !== undefined ? changes.isActive : p.isActive) !== false;

  const hasImage = Boolean(currentImage && currentImage !== "/file.svg");
  const hasPrice = Number(price) > 0;
  const hasStock = Number(stock) > 0;
  const hasCategories = Array.isArray(categories) && categories.length > 0;
  const hasBarcode = Boolean(String(barcode).trim());
  const hasCost = Number(cost) > 0;

  const missing: string[] = [];
  if (!hasImage) missing.push("Sin foto");
  if (!hasPrice) missing.push("Sin precio");
  if (!hasStock) missing.push("Sin stock");
  if (!hasCategories) missing.push("Sin categoría");
  if (!hasBarcode) missing.push("Sin SKU");

  // El producto está "listo para vitrina" si cumple los 5 requisitos base
  const isReady = hasImage && hasPrice && hasStock && hasCategories && hasBarcode;

  // Calculamos el porcentaje sobre los 5 requisitos indispensables
  const completedCount = 5 - missing.length;
  const percentage = Math.round((completedCount / 5) * 100);

  // El stock no es un dato que se cargue escribiendo: es mercadería que falta
  // en la góndola. Contarlo como "dato faltante" hacía que "Falta 1 dato"
  // fuera casi todo el catálogo y dejara de servir para priorizar.
  const missingData = missing.filter((m) => m !== "Sin stock");

  return {
    missing,
    missingCount: missing.length,
    missingData,
    missingDataCount: missingData.length,
    isReady,
    percentage,
    hasImage,
    hasPrice,
    hasStock,
    hasCategories,
    hasBarcode,
    hasCost,
    isActive,
  };
}

export function loadBackups(): Backup[] {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Guarda los backups y devuelve los que realmente quedaron guardados.
 *
 * Si el navegador no tiene espacio, se van descartando los más viejos hasta
 * que entre; si ni el más nuevo entra, devuelve null y lo que ya estaba
 * guardado queda intacto (un setItem que falla no toca el valor anterior).
 * Antes un QuotaExceededError acá cortaba el guardado sin ningún aviso.
 */
export function saveBackups(backups: Backup[]): Backup[] | null {
  let lista = backups;
  while (lista.length > 0) {
    try {
      localStorage.setItem(BACKUP_KEY, JSON.stringify(lista));
      return lista;
    } catch {
      lista = lista.slice(0, -1);
    }
  }
  if (backups.length === 0) {
    try {
      localStorage.removeItem(BACKUP_KEY);
      return [];
    } catch {
      return null;
    }
  }
  return null;
}

export function createBackup(products: any[], label: string): Backup {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    label,
    products: products.map((p) => ({
      id: p.id,
      barcode: p.barcode || "",
      name: p.name,
      price: p.price,
      offerPrice: p.offerPrice ?? null,
      stock: p.stock,
      minStock: p.minStock ?? 5,
      optimumStock: p.optimumStock ?? 20,
      categories: p.categories || [],
      description: p.description || "",
      image: p.image,
      isActive: p.isActive,
      purchasePrice: p.purchasePrice,
    })),
  };
}

export function addBackup(existing: Backup[], newBackup: Backup): Backup[] {
  const updated = [newBackup, ...existing];
  return updated.slice(0, MAX_BACKUPS);
}

// Un producto está "listo para mostrar" si tiene imagen, precio, stock, SKU y categoría
export function isProductReady(p: any, changes?: ProductChanges): boolean {
  return getProductDiagnostics(p, changes).isReady;
}

export function normalizeHeader(h: string): string {
  return String(h)
    .toLowerCase()
    .trim()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export const COLUMN_MAP: Record<string, keyof ProductChanges | "barcode"> = {
  barcode: "barcode",
  codigobarras: "barcode",
  codigo: "barcode",
  sku: "barcode",
  idsku: "barcode",
  nombre: "name",
  name: "name",
  producto: "name",
  precio: "price",
  price: "price",
  saleprice: "price",
  precioven: "price",
  oferta: "offerPrice",
  offerprice: "offerPrice",
  preciooferta: "offerPrice",
  ofertaprecio: "offerPrice",
  stock: "stock",
  existencia: "stock",
  cantidad: "stock",
  stockminimo: "minStock",
  minstock: "minStock",
  minimo: "minStock",
  stockoptimo: "optimumStock",
  optimumstock: "optimumStock",
  optimo: "optimumStock",
  categorias: "categories",
  categories: "categories",
  categoria: "categories",
  descripcion: "description",
  description: "description",
  desc: "description",
  costo: "purchasePrice",
  preciocosto: "purchasePrice",
  purchaseprice: "purchasePrice",
  costodecompra: "purchasePrice",
  activo: "isActive",
  isactive: "isActive",
  imagen: "image",
  image: "image",
  fotourl: "image",
};

// ─────────────────────────────────────────────────────────────────────
// Números, validaciones e importación
// ─────────────────────────────────────────────────────────────────────

/**
 * Lee un número escrito como lo escribe una persona en Chile: "1.500" son mil
 * quinientos (no 1,5), "$ 1.990" también vale, "2,5" es dos y medio. Devuelve
 * null si no es un número. Los números que ya vienen como número (celdas
 * numéricas de Excel) pasan tal cual.
 */
export function parseLocaleNumber(raw: unknown): number | null {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw !== "string") return null;
  let s = raw.replace(/[$\s ]/g, "").replace(/clp/i, "");
  if (!s) return null;
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) {
    s = s.replace(/,/g, "");
  } else if (/^-?\d+,\d+$/.test(s)) {
    s = s.replace(",", ".");
  }
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** "Sí", "si", "x", "1", "activo", true → true; "No", "0", "inactivo", false → false. */
export function parseBooleanCell(raw: unknown): boolean | null {
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "number") return raw === 1 ? true : raw === 0 ? false : null;
  const s = String(raw ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  if (["si", "s", "x", "1", "true", "yes", "activo", "visible", "vitrina"].includes(s)) return true;
  if (["no", "n", "0", "false", "inactivo", "oculto"].includes(s)) return false;
  return null;
}

/**
 * Advertencias de precio de un producto con sus cambios pendientes. No
 * bloquean el guardado: se muestran en la fila y en el resumen antes de
 * guardar, para que nadie publique una oferta más cara que el precio o venda
 * bajo el costo sin darse cuenta.
 */
export function getPriceWarnings(p: any, changes?: ProductChanges): string[] {
  const price = Number(changes?.price ?? p?.price ?? 0);
  const offerRaw = changes?.offerPrice !== undefined ? changes.offerPrice : p?.offerPrice;
  const offer = offerRaw === null || offerRaw === undefined ? 0 : Number(offerRaw);
  const cost = Number(changes?.purchasePrice ?? p?.purchasePrice ?? 0);
  const warnings: string[] = [];
  if (offer > 0 && price > 0 && offer >= price) warnings.push("Oferta ≥ precio");
  if (cost > 0 && price > 0 && price < cost) warnings.push("Precio bajo costo");
  return warnings;
}

export interface ImportPlan {
  /** Cambios por id de producto, sólo los que difieren del valor actual. */
  changes: Record<string, ProductChanges>;
  matched: number;
  unmatched: number;
  /** Algunos códigos sin coincidencia, para mostrarlos. */
  unmatchedCodes: string[];
  /** Valores que no se pudieron leer: "Fila 4, Precio: «abc»". */
  invalid: string[];
  /** Cuántos productos cambian en cada campo. */
  fieldCounts: Partial<Record<keyof ProductChanges, number>>;
  /** Columnas del archivo que se usaron y las que no se reconocieron. */
  recognizedColumns: string[];
  ignoredColumns: string[];
  /** Si el archivo no se puede usar, por qué. */
  error?: string;
}

const NUMERIC_IMPORT_FIELDS: Partial<Record<keyof ProductChanges, { integer: boolean; label: string }>> = {
  price: { integer: false, label: "Precio" },
  offerPrice: { integer: false, label: "Oferta" },
  purchasePrice: { integer: false, label: "Costo" },
  stock: { integer: true, label: "Stock" },
  minStock: { integer: true, label: "Stock mínimo" },
  optimumStock: { integer: true, label: "Stock óptimo" },
};

/**
 * Arma los cambios de un XLSX (primera hoja, como filas de celdas) contra el
 * catálogo. No aplica nada: la página muestra el resumen y pide confirmación.
 *
 * La fila de encabezados es la primera (de las 10 primeras) que tenga una
 * columna de código; así un título arriba de la tabla no rompe la lectura.
 */
export function buildImportPlan(rows: unknown[][], products: any[]): ImportPlan {
  const plan: ImportPlan = {
    changes: {},
    matched: 0,
    unmatched: 0,
    unmatchedCodes: [],
    invalid: [],
    fieldCounts: {},
    recognizedColumns: [],
    ignoredColumns: [],
  };

  const headerIndex = rows
    .slice(0, 10)
    .findIndex((r) => Array.isArray(r) && r.some((c) => COLUMN_MAP[normalizeHeader(String(c ?? ""))] === "barcode"));
  if (headerIndex === -1) {
    plan.error = "No se encontró una columna de código (Código, SKU o Barcode).";
    return plan;
  }

  const header = rows[headerIndex];
  const columns: { index: number; field: keyof ProductChanges }[] = [];
  let barcodeCol = -1;
  header.forEach((h, index) => {
    const titulo = String(h ?? "").trim();
    if (!titulo) return;
    const field = COLUMN_MAP[normalizeHeader(titulo)];
    if (!field) {
      plan.ignoredColumns.push(titulo);
      return;
    }
    plan.recognizedColumns.push(titulo);
    if (field === "barcode") {
      if (barcodeCol === -1) barcodeCol = index;
      return;
    }
    columns.push({ index, field });
  });

  const byCode = new Map<string, any>();
  for (const p of products) {
    if (p.id) byCode.set(String(p.id).trim(), p);
    if (p.barcode) byCode.set(String(p.barcode).trim(), p);
  }

  for (let r = headerIndex + 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const fila = r + 1;
    const rawCode = row[barcodeCol];
    const code = typeof rawCode === "number" ? String(Math.trunc(rawCode)) : String(rawCode ?? "").trim();
    if (!code) continue;

    // Excel guarda los códigos como número y se come los ceros de adelante
    // (047800000144 → 47800000144): se prueba también con el largo EAN.
    const product =
      byCode.get(code) ??
      (typeof rawCode === "number" ? byCode.get(code.padStart(12, "0")) ?? byCode.get(code.padStart(13, "0")) : undefined);
    if (!product) {
      plan.unmatched++;
      if (plan.unmatchedCodes.length < 5) plan.unmatchedCodes.push(code);
      continue;
    }

    const changes: ProductChanges = {};
    for (const { index, field } of columns) {
      const raw = row[index];
      if (raw === "" || raw === undefined || raw === null) continue;

      const numeric = NUMERIC_IMPORT_FIELDS[field];
      if (numeric) {
        const v = parseLocaleNumber(raw);
        if (v === null || v < 0 || (numeric.integer && !Number.isInteger(v))) {
          plan.invalid.push(`Fila ${fila}, ${numeric.label}: «${String(raw)}»`);
          continue;
        }
        if (field === "offerPrice") {
          const actual = product.offerPrice ?? null;
          const nuevo = v > 0 ? v : null;
          if (nuevo !== actual) changes.offerPrice = nuevo;
        } else if (field === "purchasePrice") {
          if (v !== (product.purchasePrice ?? 0)) changes.purchasePrice = v;
        } else if (v !== product[field]) {
          (changes as any)[field] = v;
        }
      } else if (field === "name") {
        const v = String(raw).trim();
        if (v && v !== product.name) changes.name = v;
      } else if (field === "description") {
        const v = String(raw).trim();
        if (v && v !== (product.description || "")) changes.description = v;
      } else if (field === "categories") {
        const v = String(raw).split(/[,|;]/).map((s) => s.trim()).filter(Boolean);
        if (v.length > 0 && JSON.stringify([...v].sort()) !== JSON.stringify([...(product.categories || [])].sort())) {
          changes.categories = v;
        }
      } else if (field === "isActive") {
        const v = parseBooleanCell(raw);
        if (v === null) {
          plan.invalid.push(`Fila ${fila}, Activo: «${String(raw)}»`);
          continue;
        }
        if (v !== (product.isActive !== false)) changes.isActive = v;
      } else if (field === "image") {
        const v = String(raw).trim();
        if (!/^https?:\/\//i.test(v)) {
          plan.invalid.push(`Fila ${fila}, Imagen: debe ser un enlace http(s)`);
          continue;
        }
        if (v !== product.image) changes.image = v;
      }
    }

    if (Object.keys(changes).length > 0) {
      plan.changes[product.id] = { ...plan.changes[product.id], ...changes };
    }
  }

  plan.matched = Object.keys(plan.changes).length;
  for (const c of Object.values(plan.changes)) {
    for (const k of Object.keys(c) as (keyof ProductChanges)[]) {
      plan.fieldCounts[k] = (plan.fieldCounts[k] ?? 0) + 1;
    }
  }
  return plan;
}

/** Encabezados del XLSX exportado: el mismo archivo se puede volver a importar. */
export const EXPORT_COLUMNS: { header: string; width: number; value: (p: any) => string | number | null }[] = [
  { header: "Código", width: 18, value: (p) => String(p.barcode || p.id || "") },
  { header: "Nombre", width: 40, value: (p) => p.name ?? "" },
  { header: "Categorías", width: 24, value: (p) => (Array.isArray(p.categories) ? p.categories.join(", ") : "") },
  { header: "Costo", width: 10, value: (p) => (p.purchasePrice ?? null) },
  { header: "Precio", width: 10, value: (p) => (p.price ?? null) },
  { header: "Oferta", width: 10, value: (p) => (p.offerPrice ?? null) },
  { header: "Stock", width: 8, value: (p) => (p.stock ?? null) },
  { header: "Stock mínimo", width: 12, value: (p) => (p.minStock ?? null) },
  { header: "Stock óptimo", width: 12, value: (p) => (p.optimumStock ?? null) },
  { header: "Activo", width: 8, value: (p) => (p.isActive === false ? "No" : "Sí") },
  { header: "Descripción", width: 40, value: (p) => p.description ?? "" },
  { header: "Imagen", width: 40, value: (p) => (p.image && p.image !== "/file.svg" ? p.image : "") },
];

/**
 * Las diferencias entre un backup y el estado actual, como cambios
 * pendientes. Incluye foto, vitrina y costo: antes el backup los guardaba
 * pero restaurar no los devolvía.
 */
export function diffSnapshot(snap: ProductSnapshot, current: any): ProductChanges {
  const changes: ProductChanges = {};
  if (snap.price !== current.price) changes.price = snap.price;
  if (snap.offerPrice !== (current.offerPrice ?? null)) changes.offerPrice = snap.offerPrice;
  if (snap.stock !== current.stock) changes.stock = snap.stock;
  if (snap.minStock !== (current.minStock ?? 5)) changes.minStock = snap.minStock;
  if (snap.optimumStock !== (current.optimumStock ?? 20)) changes.optimumStock = snap.optimumStock;
  if (snap.name !== current.name) changes.name = snap.name;
  if (snap.description !== (current.description || "")) changes.description = snap.description;
  if (JSON.stringify([...(snap.categories || [])].sort()) !== JSON.stringify([...(current.categories || [])].sort())) {
    changes.categories = snap.categories;
  }
  if (snap.image !== undefined && snap.image !== current.image) changes.image = snap.image;
  if (snap.isActive !== undefined && (snap.isActive !== false) !== (current.isActive !== false)) {
    changes.isActive = snap.isActive !== false;
  }
  if (snap.purchasePrice !== undefined && snap.purchasePrice !== null && snap.purchasePrice !== (current.purchasePrice ?? 0)) {
    changes.purchasePrice = snap.purchasePrice;
  }
  return changes;
}

const CONFLICT_LABELS: Partial<Record<keyof ProductChanges, string>> = {
  price: "precio",
  offerPrice: "oferta",
  purchasePrice: "costo",
  stock: "stock",
  minStock: "stock mínimo",
  optimumStock: "stock óptimo",
  name: "nombre",
  categories: "categorías",
  description: "descripción",
  isActive: "vitrina",
  image: "foto",
};

function comparable(field: keyof ProductChanges, p: any): string {
  if (!p) return "";
  if (field === "categories") return JSON.stringify([...(p.categories || [])].sort());
  if (field === "isActive") return String(p.isActive !== false);
  if (field === "offerPrice") return String(p.offerPrice ?? null);
  if (field === "purchasePrice") return String(p.purchasePrice ?? 0);
  if (field === "description") return String(p.description ?? "");
  return String(p[field] ?? "");
}

export interface SaveConflict {
  id: string;
  name: string;
  field: string;
}

/**
 * Campos que alguien más cambió en la base mientras se editaba: el valor que
 * había al abrir la página ya no es el que está guardado. Guardar igual pisa
 * ese cambio, así que se avisa antes.
 */
export function findConflicts(
  changes: Record<string, ProductChanges>,
  loaded: any[],
  fresh: any[]
): SaveConflict[] {
  const antes = new Map(loaded.map((p) => [String(p.id), p]));
  const ahora = new Map(fresh.map((p) => [String(p.id), p]));
  const conflicts: SaveConflict[] = [];
  for (const [id, c] of Object.entries(changes)) {
    const a = antes.get(id);
    const b = ahora.get(id);
    if (!a || !b) continue;
    for (const field of Object.keys(c) as (keyof ProductChanges)[]) {
      const label = CONFLICT_LABELS[field];
      if (!label) continue;
      if (comparable(field, a) !== comparable(field, b)) {
        conflicts.push({ id, name: String(b.name ?? id), field: label });
      }
    }
  }
  return conflicts;
}

/** El valor guardado de un campo, normalizado como lo edita la página. */
export function originalOf(p: any, field: keyof ProductChanges): any {
  switch (field) {
    case "offerPrice":
      return p?.offerPrice || null;
    case "purchasePrice":
      return p?.purchasePrice ?? 0;
    case "isActive":
      return p?.isActive !== false;
    case "barcode":
      return p?.barcode ?? "";
    case "categories":
      return p?.categories ?? [];
    case "description":
      return p?.description ?? "";
    default:
      return p?.[field];
  }
}

export function sameValue(a: any, b: any): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    return JSON.stringify([...(a || [])].sort()) === JSON.stringify([...(b || [])].sort());
  }
  return a === b;
}

/**
 * Aplica `patch` a los cambios pendientes de `product` dentro de `map` (que
 * tiene que ser una copia propia del llamador). Un campo que vuelve a su
 * valor guardado deja de estar pendiente. Nunca muta el objeto de cambios
 * anterior del producto: las filas están memorizadas y un objeto mutado no
 * las volvería a dibujar.
 *
 * Devuelve true si algún valor efectivo cambió.
 */
export function applyPatch(
  map: Record<string, ProductChanges>,
  product: any,
  patch: Partial<ProductChanges>
): boolean {
  const id = String(product.id);
  const current: ProductChanges = { ...(map[id] ?? {}) };
  let changed = false;
  for (const key of Object.keys(patch) as (keyof ProductChanges)[]) {
    const value = (patch as any)[key];
    const before = key in current ? (current as any)[key] : originalOf(product, key);
    if (!sameValue(value, before)) changed = true;
    if (sameValue(value, originalOf(product, key))) delete (current as any)[key];
    else (current as any)[key] = value;
  }
  if (Object.keys(current).length > 0) map[id] = current;
  else delete map[id];
  return changed;
}

export interface ChangesSummary {
  /** Cuántos productos cambian en cada campo. */
  fieldCounts: Partial<Record<keyof ProductChanges, number>>;
  renames: { id: string; name: string; to: string }[];
  warnings: { id: string; name: string; warnings: string[] }[];
}

/** Lo que se va a guardar, para mostrarlo antes de confirmar. */
export function summarizeChanges(changes: Record<string, ProductChanges>, products: any[]): ChangesSummary {
  const porId = new Map(products.map((p) => [String(p.id), p]));
  const summary: ChangesSummary = { fieldCounts: {}, renames: [], warnings: [] };
  for (const [id, c] of Object.entries(changes)) {
    const p = porId.get(id);
    const name = String(c.name ?? p?.name ?? id);
    for (const k of Object.keys(c) as (keyof ProductChanges)[]) {
      summary.fieldCounts[k] = (summary.fieldCounts[k] ?? 0) + 1;
    }
    if (c.barcode !== undefined) summary.renames.push({ id, name, to: c.barcode });
    if (p) {
      const w = getPriceWarnings(p, c);
      if (w.length > 0) summary.warnings.push({ id, name, warnings: w });
    }
  }
  return summary;
}

/** Corre `fn` sobre los elementos con a lo sumo `limit` en paralelo. */
export async function mapWithConcurrency<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next++];
      await fn(item);
    }
  });
  await Promise.all(workers);
}

// ─────────────────────────────────────────────────────────────────────
// Stock real: qué se contó y cuándo
// ─────────────────────────────────────────────────────────────────────
//
// `verifiedAt` (products.verified_at) lo escribe el conteo físico: es la marca
// de "a este producto alguien lo tuvo en la mano". Un stock sin esa marca es
// lo que quedó de una carga vieja, y publicar contra ese número es ofrecer lo
// que quizá no está. Por eso la vitrina se llena en este orden: primero lo
// contado con stock, después lo que se vaya confirmando.

/** Ventana que cuenta como "el conteo reciente" (el de ayer, y lo de hoy). */
export const RECENT_COUNT_HOURS = 48;

export function getVerifiedAt(p: any): number | null {
  const raw = p?.verifiedAt ?? p?.verified_at ?? null;
  if (!raw) return null;
  const t = new Date(raw).getTime();
  return Number.isFinite(t) ? t : null;
}

export function isRecentlyCounted(p: any, now: number = Date.now()): boolean {
  const t = getVerifiedAt(p);
  if (t === null) return false;
  return now - t <= RECENT_COUNT_HOURS * 60 * 60 * 1000;
}

export function getStock(p: any, changes?: ProductChanges): number {
  const raw = changes?.stock ?? p?.stock ?? 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Orden de publicación. Lo primero que tiene que salir a la página es lo que
 * existe de verdad: contado y con stock. Dentro de eso, los que están más
 * cerca de poder publicarse (les falta menos), para que cada rato de trabajo
 * termine en productos publicados y no en productos a medias.
 */
export function getPublishPriority(p: any, changes?: ProductChanges): number {
  const stock = getStock(p, changes);
  const contado = getVerifiedAt(p) !== null;
  if (stock > 0 && contado) return 0;  // contado y hay: se publica ya
  if (stock > 0) return 1;             // hay stock, pero sin confirmar en góndola
  if (contado) return 2;               // contado y dio cero: no hay que publicarlo
  return 3;                            // ni contado ni con stock
}

// ─────────────────────────────────────────────────────────────────────
// Duplicados: el mismo producto en dos filas
// ─────────────────────────────────────────────────────────────────────
//
// Un producto entró dos veces (dos códigos de barra distintos para lo mismo:
// el del envase y uno interno, o el mismo producto tipeado dos veces). Como
// `barcode` es la clave del negocio, son dos filas, y los datos quedan
// repartidos: el precio y el costo en la vieja, el stock recién contado en la
// que se escaneó. Cada una por separado se ve incompleta y ninguna se publica.

const UNIDADES = /\b(lt|ltr|litro|litros|l|ml|cc|gr|grs|g|kg|kgs|un|uds|unid|unidad|unidades|pack|pza|pzas)\b/g;

/**
 * La misma lista sin la bandera `g`, para preguntar por una palabra suelta.
 * `UNIDADES.test()` lleva `lastIndex` entre llamadas y devuelve `true` y
 * `false` alternados sobre la misma entrada; acá hace falta una respuesta que
 * no dependa de cuántas veces se preguntó antes.
 */
const ES_UNIDAD = /^(lt|ltr|litro|litros|l|ml|cc|gr|grs|g|kg|kgs|un|uds|unid|unidad|unidades|pack|pza|pzas)$/;

/**
 * Clave de comparación por nombre. Saca acentos, mayúsculas, puntuación, las
 * marcas que dejó una unificación anterior ("[duplicado, unificado 27/08]") y
 * las unidades de medida, que es donde más varía la escritura del mismo
 * producto ("1.5" / "1.5 lt" / "1,5 Lt" son el mismo envase).
 */
export function normalizeDuplicateKey(name: string): string {
  return String(name ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/(\d)[,.](\d)/g, "$1$2")
    .replace(UNIDADES, " ")
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Los códigos de un mismo producto suelen compartir el final y diferir en el
 * prefijo (7801620009342 / 2848620009342: el del envase y el que generó la
 * balanza o una carga manual). Ocho dígitos finales es suficiente para que no
 * choquen productos distintos y alcanza para emparejar estos casos.
 */
export function barcodeSuffixKey(barcode: string): string | null {
  const digits = String(barcode ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.slice(-8);
}

/**
 * Los números que describen el envase: 200 de "200 gr", 15 de "1.5 Lt", 6 de
 * "bolsa 6 un.".
 *
 * `normalizeDuplicateKey` borra la unidad pero deja el número pegado al resto
 * del nombre, así que "Doritos Queso 125 Gr" y "Doritos Queso 200 gr" dan
 * claves distintas y por nombre no se emparejan. El problema aparece cuando
 * los empareja OTRA señal —el código— y nadie vuelve a mirar el formato.
 */
function numerosDelFormato(name: string): Set<string> {
  const limpio = String(name ?? "")
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/(\d)[,.](\d)/g, "$1$2");
  return new Set(limpio.match(/\d+/g) ?? []);
}

/**
 * ¿Los dos nombres describen envases de tamaño distinto?
 *
 * Es un veto, no una señal: si los dos nombres traen números de formato y no
 * comparten ninguno, son presentaciones distintas del mismo producto y
 * unificarlas destruye una de las dos.
 *
 * Existe porque el emparejamiento por código puede juntar cualquier cosa. En
 * el catálogo real, "Diablitos underwood 120" (047800000144) y "Lasaña
 * Precocida Lucchetti 360 gr" (900000000144) comparten los últimos ocho
 * dígitos **por casualidad**, y la herramienta los ofrecía como el mismo
 * producto. Con borrado de duplicados de por medio, un falso positivo no es
 * una molestia: es un producto real que desaparece del catálogo y de la
 * góndola.
 */
export function formatosDistintos(nombreA: string, nombreB: string): boolean {
  const a = numerosDelFormato(nombreA);
  const b = numerosDelFormato(nombreB);
  if (a.size === 0 || b.size === 0) return false; // sin datos no se veta
  for (const n of a) if (b.has(n)) return false;
  return true;
}

/**
 * ¿Dos nombres son lo bastante parecidos como para creerle a un código que
 * coincide?
 *
 * Pide que compartan la primera palabra —donde vive la marca— o que se
 * solapen en al menos la mitad de sus palabras. "Diablitos underwood" y
 * "Lasaña Precocida Lucchetti" no comparten nada, así que la coincidencia de
 * código queda descartada como casualidad.
 */
export function nombresCompatibles(nombreA: string, nombreB: string): boolean {
  const palabras = (n: string) =>
    String(n ?? "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\[[^\]]*\]/g, " ")
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length >= 3 && !ES_UNIDAD.test(w));

  const a = palabras(nombreA);
  const b = palabras(nombreB);
  if (a.length === 0 || b.length === 0) return false;
  if (a[0] === b[0]) return true;

  const setB = new Set(b);
  const comunes = a.filter((w) => setB.has(w)).length;
  return comunes >= Math.ceil(Math.min(a.length, b.length) / 2);
}

/**
 * Una fila que ya fue archivada como duplicado en una corrección anterior:
 * quedó marcada en el nombre, en cero y oculta. No vuelve a la lista de
 * pendientes — si no, cada corrección reaparecería como trabajo por hacer.
 */
export function isArchivedDuplicate(p: any): boolean {
  return (
    /\[duplicado/i.test(String(p?.name ?? "")) &&
    getStock(p) === 0 &&
    p?.isActive === false
  );
}

export interface DuplicateGroup {
  /** Identificador estable del grupo (el barcode del que se conserva). */
  id: string;
  /** El que se conserva: el escaneado más recientemente. */
  keeper: any;
  /** Las otras filas del mismo producto. */
  others: any[];
  /** Por qué se emparejaron, para que quien revisa pueda descartarlo. */
  reasons: ("nombre" | "codigo")[];
}

/**
 * El que manda es el que se escaneó más recientemente: ese código es el que
 * está en el envase que hoy está en la góndola. Si ninguno fue contado (o
 * empatan), gana el que tiene stock, y después el que tiene más datos.
 */
/**
 * GS1 reserva los prefijos 02 y 20-29 para códigos de uso interno del local
 * (los que genera una balanza o una carga a mano). Entre dos códigos del mismo
 * producto, el del envase es el que no empieza con 2 — y es el que conviene
 * conservar, porque es el que va a leer el escáner la próxima vez.
 */
export function isRealEan(barcode: string): boolean {
  return !/^(2|02)/.test(String(barcode ?? "").replace(/\D/g, ""));
}

function keeperScore(p: any): [number, number, number, number, number] {
  const verificado = getVerifiedAt(p) ?? 0;
  const stock = getStock(p);
  const diag = getProductDiagnostics(p);
  const completo = 5 - diag.missingCount + (diag.hasCost ? 1 : 0);
  const ean = isRealEan(p?.barcode ?? p?.id ?? "") ? 1 : 0;
  return [verificado, stock, completo, ean, diag.isActive ? 1 : 0];
}

function mejorQue(a: any, b: any): boolean {
  const sa = keeperScore(a);
  const sb = keeperScore(b);
  for (let i = 0; i < sa.length; i++) {
    if (sa[i] !== sb[i]) return sa[i] > sb[i];
  }
  // Desempate estable para que la lista no baile entre renders.
  return String(a.id ?? "") < String(b.id ?? "");
}

/**
 * Agrupa los productos que parecen ser el mismo. Dos reglas, unidas: mismo
 * nombre normalizado, o mismo final de código de barras. Es una sugerencia
 * para revisar — fusionar siempre lo confirma una persona.
 */
export function findDuplicateGroups(productsInput: any[]): DuplicateGroup[] {
  const products = productsInput.filter((p) => !isArchivedDuplicate(p));
  const porNombre = new Map<string, any[]>();
  const porCodigo = new Map<string, any[]>();

  for (const p of products) {
    const nk = normalizeDuplicateKey(p?.name ?? "");
    if (nk.length >= 4) {
      const arr = porNombre.get(nk);
      if (arr) arr.push(p);
      else porNombre.set(nk, [p]);
    }

    const bk = barcodeSuffixKey(p?.barcode ?? p?.id ?? "");
    if (bk) {
      const arr = porCodigo.get(bk);
      if (arr) arr.push(p);
      else porCodigo.set(bk, [p]);
    }
  }

  // Union-find: si A y B comparten nombre y B y C comparten código, los tres
  // son el mismo producto.
  const padre = new Map<string, string>();
  const find = (x: string): string => {
    let r = x;
    while (padre.get(r) !== r) r = padre.get(r) ?? r;
    let c = x;
    while (padre.get(c) !== c) {
      const sig = padre.get(c) ?? c;
      padre.set(c, r);
      c = sig;
    }
    return r;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) padre.set(ra, rb);
  };

  for (const p of products) padre.set(String(p.id), String(p.id));

  const motivos = new Map<string, Set<"nombre" | "codigo">>();
  const marcar = (ids: string[], motivo: "nombre" | "codigo") => {
    for (const id of ids) {
      const set = motivos.get(id) ?? new Set<"nombre" | "codigo">();
      set.add(motivo);
      motivos.set(id, set);
    }
  };

  /**
   * Une los miembros de un grupo, de a pares y sólo si el par sobrevive a los
   * dos vetos: formatos distintos y nombres incompatibles.
   *
   * Se comparan los pares y no el grupo entero porque un veto entre dos de
   * ellos no debe descartar a los demás.
   */
  const unirCompatibles = (grupo: any[], motivo: "nombre" | "codigo") => {
    for (let i = 0; i < grupo.length; i++) {
      for (let j = i + 1; j < grupo.length; j++) {
        const a = grupo[i];
        const b = grupo[j];
        const na = String(a?.name ?? "");
        const nb = String(b?.name ?? "");

        // Presentaciones distintas del mismo producto (125 g y 200 g) no son
        // duplicados: unificarlas borra una de las dos.
        if (formatosDistintos(na, nb)) continue;

        // Dos códigos pueden terminar igual por casualidad. Sin parecido de
        // nombre, esa coincidencia no alcanza.
        if (motivo === "codigo" && !nombresCompatibles(na, nb)) continue;

        marcar([String(a.id), String(b.id)], motivo);
        union(String(a.id), String(b.id));
      }
    }
  };

  for (const grupo of porNombre.values()) {
    if (grupo.length < 2) continue;
    unirCompatibles(grupo, "nombre");
  }
  for (const grupo of porCodigo.values()) {
    if (grupo.length < 2) continue;
    unirCompatibles(grupo, "codigo");
  }

  const porRaiz = new Map<string, any[]>();
  for (const p of products) {
    const id = String(p.id);
    if (!motivos.has(id)) continue;
    const raiz = find(id);
    const arr = porRaiz.get(raiz);
    if (arr) arr.push(p);
    else porRaiz.set(raiz, [p]);
  }

  const grupos: DuplicateGroup[] = [];
  for (const miembros of porRaiz.values()) {
    if (miembros.length < 2) continue;

    let keeper = miembros[0];
    for (const p of miembros) if (mejorQue(p, keeper)) keeper = p;

    const reasons = new Set<"nombre" | "codigo">();
    for (const p of miembros) {
      for (const r of motivos.get(String(p.id)) ?? []) reasons.add(r);
    }

    grupos.push({
      id: String(keeper.id),
      keeper,
      others: miembros.filter((p) => p !== keeper),
      reasons: [...reasons],
    });
  }

  // Primero los que tienen stock en juego: son los que afectan a la venta.
  return grupos.sort((a, b) => {
    const sa = a.others.reduce((acc, p) => acc + getStock(p), getStock(a.keeper));
    const sb = b.others.reduce((acc, p) => acc + getStock(p), getStock(b.keeper));
    if (sa !== sb) return sb - sa;
    return String(a.keeper.name ?? "").localeCompare(String(b.keeper.name ?? ""));
  });
}

export interface MergePlan {
  /** Cambios a aplicar, por id de producto (el mismo formato que edita la página). */
  changes: Record<string, ProductChanges>;
  /** Qué campos se rescataron de las filas repetidas hacia la que se conserva. */
  rescued: string[];
  /** Stock final del que se conserva, y de dónde sale. */
  stockFinal: number;
  stockSumado: boolean;
}

const CAMPOS_RESCATABLES: { campo: keyof ProductChanges; etiqueta: string }[] = [
  { campo: "price", etiqueta: "precio" },
  { campo: "purchasePrice", etiqueta: "costo" },
  { campo: "image", etiqueta: "foto" },
  { campo: "categories", etiqueta: "categoría" },
  { campo: "description", etiqueta: "descripción" },
];

function tieneValor(campo: keyof ProductChanges, valor: any): boolean {
  if (campo === "categories") return Array.isArray(valor) && valor.length > 0;
  if (campo === "image") return Boolean(valor) && valor !== "/file.svg";
  if (campo === "description") return Boolean(String(valor ?? "").trim());
  return Number(valor) > 0;
}

/**
 * Arma la corrección de un grupo de duplicados.
 *
 * - El que se conserva es el escaneado más recientemente: ese es el código que
 *   está hoy en el envase.
 * - Los datos que a él le faltan se rescatan de las otras filas (el precio y el
 *   costo suelen haber quedado en la vieja).
 * - El stock se SUMA cuando las dos filas se contaron en el mismo conteo: son
 *   unidades distintas que estaban en la góndola bajo dos códigos. El stock de
 *   una fila que no se contó no se suma: es un número viejo.
 * - Las filas repetidas quedan en 0 y ocultas, no se borran: tienen ventas y
 *   movimientos colgando, y borrarlas se lleva ese historial.
 */
export function buildMergePlan(group: DuplicateGroup, existing?: Record<string, ProductChanges>): MergePlan {
  const { keeper, others } = group;
  const changes: Record<string, ProductChanges> = {};
  const rescued: string[] = [];
  const keeperChanges: ProductChanges = {};

  // Donantes: el más recientemente contado primero, que es el dato más fresco.
  const donantes = [...others].sort(
    (a, b) => (getVerifiedAt(b) ?? 0) - (getVerifiedAt(a) ?? 0)
  );

  for (const { campo, etiqueta } of CAMPOS_RESCATABLES) {
    const actual = (existing?.[keeper.id] as any)?.[campo] ?? (keeper as any)[campo];
    if (tieneValor(campo, actual)) continue;

    for (const d of donantes) {
      const valor = (d as any)[campo];
      if (!tieneValor(campo, valor)) continue;
      (keeperChanges as any)[campo] = campo === "categories" ? [...valor] : valor;
      rescued.push(etiqueta);
      break;
    }
  }

  // El conteo del que se conserva manda; se le suma lo que se contó en el mismo
  // recorrido bajo el otro código.
  const verificadoKeeper = getVerifiedAt(keeper);
  let stockFinal = getStock(keeper);
  let stockSumado = false;

  for (const d of others) {
    const vd = getVerifiedAt(d);
    const stockD = getStock(d);
    if (stockD <= 0) continue;
    const mismoConteo =
      verificadoKeeper !== null &&
      vd !== null &&
      Math.abs(vd - verificadoKeeper) <= RECENT_COUNT_HOURS * 60 * 60 * 1000;
    if (!mismoConteo) continue;
    stockFinal += stockD;
    stockSumado = true;
  }

  if (stockFinal !== getStock(keeper)) keeperChanges.stock = stockFinal;
  if (keeper.isActive === false && stockFinal > 0) keeperChanges.isActive = true;

  // Si el que se conserva arrastra la marca de una unificación anterior, se le
  // saca: pasa a ser el producto bueno, no el repetido.
  const nombreKeeper = String(keeper.name ?? "");
  const nombreLimpio = nombreKeeper.replace(/\s*\[duplicado[^\]]*\]/gi, "").trim();
  if (nombreLimpio && nombreLimpio !== nombreKeeper) keeperChanges.name = nombreLimpio;

  if (Object.keys(keeperChanges).length > 0) changes[keeper.id] = keeperChanges;

  for (const d of others) {
    const cambios: ProductChanges = {};
    if (getStock(d) !== 0) cambios.stock = 0;
    if (d.isActive !== false) cambios.isActive = false;
    const nombre = String(d.name ?? "");
    if (!/\[duplicado/i.test(nombre)) {
      cambios.name = `${nombre} [duplicado de ${keeper.id}]`;
    }
    if (Object.keys(cambios).length > 0) changes[d.id] = cambios;
  }

  return { changes, rescued, stockFinal, stockSumado };
}

/** Grupos que alguien ya revisó y marcó como "no son el mismo producto". */
export function loadDismissedDuplicates(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_DUPES_KEY);
    const ids = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(ids) ? ids.map(String) : []);
  } catch {
    return new Set();
  }
}

export function saveDismissedDuplicates(ids: Set<string>) {
  try {
    localStorage.setItem(DISMISSED_DUPES_KEY, JSON.stringify([...ids]));
  } catch {
    // Sin localStorage (modo privado) la revisión sigue funcionando, sólo que
    // no se acuerda de lo descartado entre sesiones.
  }
}
