import { hasRealImage } from "@/services/products";

export type ProductChanges = { price?: number; offerPrice?: number | null; stock?: number; minStock?: number; optimumStock?: number; name?: string; categories?: string[]; description?: string };

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
}

export interface Backup {
  id: string;
  timestamp: string;
  label: string;
  products: ProductSnapshot[];
}

export const BACKUP_KEY = "olivo-bulk-editor-backups";
export const VIEW_KEY = "olivo-bulk-editor-view";
export const MAX_BACKUPS = 10;
// Renderizar cientos de filas con inputs congela la página; se pagina de a 60.
export const PAGE_SIZE = 60;

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
    })),
  };
}

export function addBackup(existing: Backup[], newBackup: Backup): Backup[] {
  const updated = [newBackup, ...existing];
  return updated.slice(0, MAX_BACKUPS);
}

// Un producto está "listo para mostrar" si tiene imagen, precio, stock, SKU y categoría
export function isProductReady(p: any, changes?: ProductChanges): boolean {
  const price = changes?.price ?? p.price;
  const stock = changes?.stock ?? p.stock;
  const categories = changes?.categories ?? p.categories ?? [];
  return (
    hasRealImage(p) &&
    Number(price) > 0 &&
    Number(stock) > 0 &&
    Boolean(p.barcode) &&
    categories.length > 0
  );
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
};
