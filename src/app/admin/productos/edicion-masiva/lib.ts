import { hasRealImage } from "@/services/products";

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
export const VIEW_KEY = "olivo-bulk-editor-view";
export const SORT_KEY = "olivo-bulk-editor-sort";
export const MAX_BACKUPS = 10;
// Renderizar cientos de filas con inputs congela la página; se pagina de a 60.
export const PAGE_SIZE = 60;

export type SortPriority =
  | "near_ready"       // Casi listos primero: 1 faltante, luego 2, luego 3...
  | "most_incomplete"  // Más incompletos primero
  | "ready_first"      // Listos primero
  | "name_asc"         // Nombre A-Z
  | "name_desc"        // Nombre Z-A
  | "stock_asc"        // Menor stock primero
  | "price_asc"        // Menor precio
  | "price_desc";      // Mayor precio

export type CompletenessTab = "all" | "missing_1" | "missing_2" | "missing_3_plus" | "ready";

export type SpecificFilter =
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

  return {
    missing,
    missingCount: missing.length,
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

export function saveBackups(backups: Backup[]) {
  localStorage.setItem(BACKUP_KEY, JSON.stringify(backups));
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
