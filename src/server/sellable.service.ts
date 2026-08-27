import { supabaseServer } from "@/lib/supabase-server";
import { logger } from "@/utils/logger";

/**
 * La regla de venta web: sólo se vende lo que tiene precio pensado.
 *
 * Un producto es vendible por la web cuando cumple las dos condiciones:
 *
 * 1. Tiene **costo de proveedor cargado**. Sin costo no se sabe si la venta
 *    deja algo o cuesta plata.
 * 2. Tiene el **precio de venta revisado** contra ese costo, al menos una vez.
 *
 * La regla nace apagada y se enciende cuando el catálogo esté depurado. Ese
 * orden no es prudencia de más: `price_reviewed_at` arranca en NULL para todo
 * el catálogo, así que encenderla de golpe sacaría del aire casi todo.
 *
 * El bloqueo va en el servidor, no en la pantalla. Esconder un producto del
 * catálogo no impide que alguien llame la ruta con su código; el pedido se
 * crearía igual y habría que salir a explicarle al cliente por qué no llega.
 */

/** Por qué un producto no se puede vender. */
export type MotivoNoVendible = "sin-costo" | "sin-revisar";

export type ProductoNoVendible = {
  barcode: string;
  nombre: string;
  categoria: string | null;
  motivos: MotivoNoVendible[];
};

export type ImpactoRegla = {
  /** Si la regla está encendida ahora mismo. */
  activa: boolean;
  /** Productos activos del catálogo. */
  total: number;
  /** Los que quedarían fuera si se encendiera. */
  bloqueados: ProductoNoVendible[];
  sinCosto: number;
  sinRevisar: number;
};

const CACHE_TTL_MS = 15_000;
let cached: { value: boolean; at: number } | null = null;

/** Vacía la caché. La usa el guardado de configuración para que el cambio se vea al instante. */
export function invalidateSellableRuleCache(): void {
  cached = null;
}

/**
 * ¿Está encendida la regla?
 *
 * Ante cualquier duda devuelve `false`, es decir: no bloquea. Es lo contrario
 * del modo vitrina, que ante la duda cierra, y la diferencia es deliberada.
 * Vitrina protege de cobrar por un pedido que nadie va a preparar; esta regla
 * sólo protege el margen. Si la base falla, rechazar todas las ventas porque
 * no se pudo leer un interruptor causa más daño que dejar pasar unas cuantas
 * con el margen sin revisar.
 */
export async function reglaActiva(): Promise<boolean> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

  const { data, error } = await supabaseServer
    .from("settings")
    .select("require_reviewed_price")
    .eq("id", true)
    .maybeSingle();

  if (error) {
    // PGRST116 = todavía no hay fila de configuración.
    if (error.code !== "PGRST116") {
      logger.error("[sellable] no se pudo leer settings:", error);
    }
    return false;
  }

  const value = data?.require_reviewed_price === true;
  cached = { value, at: Date.now() };
  return value;
}

type FilaProducto = {
  barcode: string;
  name: string;
  category: string | null;
  price_reviewed_at: string | null;
};

/**
 * Reparte un conjunto de productos entre los que cumplen la regla y los que no.
 *
 * Es puro sobre los datos que recibe: así el bloqueo del checkout y el informe
 * del panel deciden con exactamente el mismo criterio. Si cada uno tuviera el
 * suyo, el panel diría "quedan 3 fuera" y el checkout rechazaría otros.
 */
export function evaluarVendibles(
  productos: FilaProducto[],
  barcodesConCosto: Set<string>
): ProductoNoVendible[] {
  const fuera: ProductoNoVendible[] = [];

  for (const p of productos) {
    const motivos: MotivoNoVendible[] = [];
    if (!barcodesConCosto.has(p.barcode)) motivos.push("sin-costo");
    if (p.price_reviewed_at === null) motivos.push("sin-revisar");
    if (motivos.length > 0) {
      fuera.push({
        barcode: p.barcode,
        nombre: p.name,
        categoria: p.category,
        motivos,
      });
    }
  }

  return fuera;
}

/**
 * Códigos de barra que tienen algún proveedor con costo cargado.
 *
 * Va paginado: Supabase corta en 1.000 filas por consulta, y sin paginar los
 * productos que quedaran fuera de esa primera página se leerían como "sin
 * costo". Con la regla encendida eso los sacaría de la venta teniendo costo
 * cargado — un fallo silencioso que sólo se nota cuando un cliente no puede
 * comprar algo que sí está.
 */
async function conCosto(barcodes?: string[]): Promise<Set<string>> {
  const TAMANO = 1000;
  const encontrados = new Set<string>();

  for (let desde = 0; ; desde += TAMANO) {
    let consulta = supabaseServer
      .from("product_suppliers")
      .select("product_id")
      .not("unit_cost", "is", null);

    if (barcodes && barcodes.length > 0) {
      consulta = consulta.in("product_id", barcodes);
    }

    const { data, error } = await consulta.range(desde, desde + TAMANO - 1);

    if (error) {
      logger.error("[sellable] no se pudieron leer los costos:", error);
      // Devolver lo leído hasta acá marcaría como "sin costo" todo lo que
      // faltaba. Un conjunto vacío al menos falla de forma reconocible.
      return new Set();
    }

    const lote = data ?? [];
    for (const fila of lote) encontrados.add(String((fila as any).product_id));
    if (lote.length < TAMANO) break;
  }

  return encontrados;
}

/**
 * Comprueba una compra concreta contra la regla.
 *
 * Devuelve la lista vacía cuando la regla está apagada, sin consultar nada:
 * mientras no se encienda, esto no debe costar ni un viaje a la base en cada
 * checkout.
 */
export async function bloqueadosParaVenta(
  barcodes: string[]
): Promise<ProductoNoVendible[]> {
  if (barcodes.length === 0) return [];
  if (!(await reglaActiva())) return [];

  const [{ data: productos, error }, costos] = await Promise.all([
    supabaseServer
      .from("products")
      .select("barcode, name, category, price_reviewed_at")
      .in("barcode", barcodes),
    conCosto(barcodes),
  ]);

  if (error) {
    logger.error("[sellable] no se pudieron leer los productos:", error);
    // Igual que arriba: ante un fallo de lectura no se bloquea la venta.
    return [];
  }

  return evaluarVendibles((productos ?? []) as FilaProducto[], costos);
}

/**
 * Qué pasaría si se encendiera la regla.
 *
 * Es la salvaguarda del plan: se mira la lista, se depura, y recién entonces
 * se enciende. Sin esto, encender el interruptor es a ciegas.
 */
export async function impactoDeLaRegla(): Promise<ImpactoRegla> {
  const TAMANO = 1000;
  const productos: FilaProducto[] = [];

  for (let desde = 0; ; desde += TAMANO) {
    const { data, error } = await supabaseServer
      .from("products")
      .select("barcode, name, category, price_reviewed_at")
      .eq("is_active", true)
      .range(desde, desde + TAMANO - 1);

    if (error) throw new Error(`No se pudo leer el catálogo: ${error.message}`);
    const lote = (data ?? []) as FilaProducto[];
    productos.push(...lote);
    if (lote.length < TAMANO) break;
  }

  const costos = await conCosto();
  const bloqueados = evaluarVendibles(productos, costos);

  return {
    activa: await reglaActiva(),
    total: productos.length,
    bloqueados,
    sinCosto: bloqueados.filter((b) => b.motivos.includes("sin-costo")).length,
    sinRevisar: bloqueados.filter((b) => b.motivos.includes("sin-revisar")).length,
  };
}

/** Texto para el cliente cuando su carrito tiene algo que no se puede vender. */
export function mensajeBloqueo(bloqueados: ProductoNoVendible[]): string {
  const nombres = bloqueados.map((b) => b.nombre);
  const lista =
    nombres.length <= 3
      ? nombres.join(", ")
      : `${nombres.slice(0, 3).join(", ")} y ${nombres.length - 3} más`;

  // Al cliente no le sirve saber que falta el costo de proveedor: es un
  // problema nuestro. Se le dice lo único accionable, que es sacarlos.
  return nombres.length === 1
    ? `${lista} no está disponible por ahora. Quitalo del carrito para continuar.`
    : `Estos productos no están disponibles por ahora: ${lista}. Quitalos del carrito para continuar.`;
}
