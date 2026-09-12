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

export type CompletenessTab = "all" | "missing_1" | "missing_2" | "missing_3_plus" | "ready";

export type SpecificFilter =
  | "all"
  | "with_stock"      // Stock real > 0: lo que hay de verdad en la tienda
  | "counted"         // Escaneado en un conteo físico (tenga o no stock)
  | "counted_today"   // Escaneado en el conteo más reciente (ayer / hoy)
  | "uncounted"       // Nunca pasó por un conteo: su stock no está confirmado
  | "duplicates"      // Posibles duplicados: el mismo producto en dos filas
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

  for (const grupo of porNombre.values()) {
    if (grupo.length < 2) continue;
    const ids = grupo.map((p) => String(p.id));
    marcar(ids, "nombre");
    for (let i = 1; i < ids.length; i++) union(ids[0], ids[i]);
  }
  for (const grupo of porCodigo.values()) {
    if (grupo.length < 2) continue;
    const ids = grupo.map((p) => String(p.id));
    marcar(ids, "codigo");
    for (let i = 1; i < ids.length; i++) union(ids[0], ids[i]);
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
