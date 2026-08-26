import { supabaseServer } from "@/lib/supabase-server";
import { logger } from "@/utils/logger";

/**
 * Puerta única para mover stock.
 *
 * El modelo de datos es: `branch_stock` es la fuente de verdad y
 * `products.stock` es un valor DERIVADO — cada RPC lo recalcula como
 * `SUM(branch_stock)` del producto. Escribir `products.stock` directamente
 * rompe las dos cosas a la vez: no mueve el stock de la sucursal (que es de
 * donde realmente sale la mercadería) y el número que se escribió se pierde
 * en el siguiente recálculo, cuando cualquier otra operación vuelva a sumar
 * las sucursales.
 *
 * Ese era el choque que producía datos erróneos: la recepción entraba por RPC
 * (correcto) mientras que guardar un producto desde el admin reescribía
 * `products.stock` con el valor que el navegador tenía cacheado (incorrecto).
 * Bastaba con editarle el precio a un producto para revertir la recepción que
 * otra persona acababa de registrar, y como `branch_stock` no se enteraba, el
 * número volvía a cambiar solo en la siguiente operación.
 *
 * Por eso todo movimiento pasa por acá y nadie más escribe la columna.
 */

export interface StockItem {
  barcode: string;
  qty: number;
  name?: string | null;
}

export interface StockMutationOptions {
  /** Sucursal afectada. Por defecto, la marcada `is_default`. */
  branchId?: string | null;
  /** Id del pedido/venta que origina el movimiento, para poder rastrearlo. */
  reference?: string | null;
  /** Queda en `inventory_movements.reason`. */
  reason?: string | null;
}

export type StockResult =
  | { ok: true; count: number }
  | { ok: false; error: string };

/** Motivos que quedan registrados en `inventory_movements`. */
export const STOCK_REASON = {
  RECEPTION: "RECEPTION",
  MANUAL_ADJUSTMENT: "MANUAL_ADJUSTMENT",
  RECEPTION_REVERSE: "RECEPTION_REVERSE",
  POS_SALE: "POS_SALE",
  WEB_SALE: "WEB_SALE",
  WEB_SALE_ROLLBACK: "WEB_SALE_ROLLBACK",
} as const;

/** Descarta ítems sin código o con cantidad no positiva. */
function toPayload(items: StockItem[]): Array<{ barcode: string; qty: number; name: string | null }> {
  return (items ?? [])
    .filter((i) => i?.barcode && Number(i.qty) > 0)
    .map((i) => ({
      barcode: String(i.barcode),
      qty: Number(i.qty),
      name: i.name ?? null,
    }));
}

async function callBatchRpc(
  rpc: "apply_reception" | "apply_reception_reverse",
  items: StockItem[],
  { branchId, reference, reason }: StockMutationOptions
): Promise<StockResult> {
  const payload = toPayload(items);
  if (payload.length === 0) return { ok: false, error: "Ningún ítem válido" };

  const { data, error } = await supabaseServer.rpc(rpc, {
    p_items: payload,
    p_branch_id: branchId ?? null,
    p_reference: reference ?? null,
    p_notes: reason ?? null,
  });

  if (error) {
    logger.error(`[inventory] ${rpc} falló:`, error);
    return { ok: false, error: error.message };
  }

  return { ok: true, count: (data as number) ?? 0 };
}

/**
 * Entrada de mercadería (+). Incrementa `branch_stock`, recalcula
 * `products.stock` y registra un movimiento IN por ítem.
 */
export async function applyReception(
  items: StockItem[],
  options: StockMutationOptions = {}
): Promise<StockResult> {
  return callBatchRpc("apply_reception", items, {
    ...options,
    reason: options.reason ?? STOCK_REASON.RECEPTION,
  });
}

/**
 * Salida de mercadería (−), con piso en 0. Registra un movimiento OUT.
 *
 * Se apoya en `apply_reception_reverse`, que es exactamente esta operación:
 * descuenta `branch_stock` sin bajar de cero, recalcula `products.stock` y
 * deja el movimiento. El nombre de la RPC quedó atado a su primer uso
 * (revertir una recepción); el `reason` es lo que distingue una reversión de
 * una venta de mostrador en `inventory_movements`.
 */
async function applyStockOut(
  items: StockItem[],
  options: StockMutationOptions
): Promise<StockResult> {
  return callBatchRpc("apply_reception_reverse", items, options);
}

/** Revierte una recepción ya aplicada (pedido de proveedor cancelado). */
export async function reverseReception(
  items: StockItem[],
  options: StockMutationOptions = {}
): Promise<StockResult> {
  return applyStockOut(items, {
    ...options,
    reason: options.reason ?? STOCK_REASON.RECEPTION_REVERSE,
  });
}

/**
 * Descuento por venta de mostrador (POS).
 *
 * A diferencia de la venta web, acá la mercadería YA salió del local: si el
 * registro dice menos de lo que se vendió igual hay que descontar lo que se
 * pueda y dejar el stock en cero, nunca rechazar la venta.
 */
export async function applyPosSale(
  items: StockItem[],
  options: StockMutationOptions = {}
): Promise<StockResult> {
  return applyStockOut(items, {
    ...options,
    reason: options.reason ?? STOCK_REASON.POS_SALE,
  });
}

/**
 * Reserva stock para una venta web. Devuelve `false` sin tocar nada si no
 * alcanza: la venta web se rechaza antes de cobrar, al revés que el mostrador.
 */
export async function reserveStockForWebSale(
  barcode: string,
  qty: number,
  { branchId, reference, reason }: StockMutationOptions = {}
): Promise<boolean> {
  if (!barcode || !(qty > 0)) return false;

  const { data, error } = await supabaseServer.rpc("decrement_stock_atomic", {
    p_barcode: barcode,
    p_quantity: qty,
    p_branch_id: branchId ?? null,
    p_reference: reference ?? null,
    p_reason: reason ?? STOCK_REASON.WEB_SALE,
  });

  if (error) {
    logger.error("[inventory] decrement_stock_atomic falló:", error);
    return false;
  }

  return data === true;
}

/**
 * Devuelve stock reservado (pago rechazado, orden que no se completó).
 */
export async function releaseStock(
  barcode: string,
  qty: number,
  { branchId, reference, reason }: StockMutationOptions = {}
): Promise<void> {
  if (!barcode || !(qty > 0)) return;

  const { error } = await supabaseServer.rpc("increment_product_stock", {
    p_barcode: barcode,
    p_quantity: qty,
    p_branch_id: branchId ?? null,
    p_reference: reference ?? null,
    p_reason: reason ?? STOCK_REASON.WEB_SALE_ROLLBACK,
  });

  if (error) {
    logger.error("[inventory] increment_product_stock falló:", error);
  }
}

/**
 * Deja el stock de un producto en un valor exacto.
 *
 * Es lo que hace el editor de productos cuando alguien escribe una cantidad a
 * mano. No se escribe la columna: se calcula la diferencia contra el stock
 * actual y se aplica como entrada o salida, para que `branch_stock` —que es de
 * donde se vende— quede coherente y el ajuste deje rastro en
 * `inventory_movements`.
 *
 * El delta se aplica sobre una sola sucursal (la indicada o la principal),
 * porque `products.stock` es la suma de todas: ajustar ahí el total dejaría el
 * global correcto y el detalle por sucursal inventado.
 */
export async function setStockLevel(
  barcode: string,
  target: number,
  options: StockMutationOptions = {}
): Promise<StockResult> {
  if (!barcode) return { ok: false, error: "Falta el código de barras" };
  if (!Number.isFinite(target) || target < 0) {
    return { ok: false, error: "Cantidad de stock inválida" };
  }

  const { data: product, error } = await supabaseServer
    .from("products")
    .select("stock")
    .eq("barcode", barcode)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!product) return { ok: false, error: `Producto ${barcode} no encontrado` };

  const delta = Math.round(target) - Number(product.stock ?? 0);
  if (delta === 0) return { ok: true, count: 0 };

  const opts: StockMutationOptions = {
    ...options,
    reason: options.reason ?? STOCK_REASON.MANUAL_ADJUSTMENT,
  };

  return delta > 0
    ? callBatchRpc("apply_reception", [{ barcode, qty: delta }], opts)
    : applyStockOut([{ barcode, qty: -delta }], opts);
}

/**
 * Igual que `setStockLevel` pero para varios productos a la vez.
 *
 * Una importación masiva puede traer cientos de productos. Uno por uno serían
 * dos viajes a la base por producto y la petición se cae por tiempo antes de
 * terminar. Acá se leen todos los stocks de una vez y se agrupan las
 * diferencias en dos llamadas: una de entrada y otra de salida.
 */
export async function setStockLevels(
  targets: Array<{ barcode: string; target: number }>,
  options: StockMutationOptions = {}
): Promise<{ ok: true; count: number } | { ok: false; error: string; count: number }> {
  const wanted = targets.filter(
    (t) => t.barcode && Number.isFinite(t.target) && t.target >= 0
  );
  if (wanted.length === 0) return { ok: true, count: 0 };

  const { data: rows, error } = await supabaseServer
    .from("products")
    .select("barcode, stock")
    .in("barcode", wanted.map((t) => t.barcode));

  if (error) return { ok: false, error: error.message, count: 0 };

  const current = new Map(
    (rows ?? []).map((r) => [String(r.barcode), Number(r.stock ?? 0)])
  );

  const entradas: StockItem[] = [];
  const salidas: StockItem[] = [];
  const faltantes: string[] = [];

  for (const { barcode, target } of wanted) {
    if (!current.has(barcode)) {
      faltantes.push(barcode);
      continue;
    }
    const delta = Math.round(target) - current.get(barcode)!;
    if (delta > 0) entradas.push({ barcode, qty: delta });
    else if (delta < 0) salidas.push({ barcode, qty: -delta });
  }

  const opts: StockMutationOptions = {
    ...options,
    reason: options.reason ?? STOCK_REASON.MANUAL_ADJUSTMENT,
  };

  let count = 0;
  const errores: string[] = [];

  if (entradas.length > 0) {
    const r = await callBatchRpc("apply_reception", entradas, opts);
    if (r.ok) count += r.count;
    else errores.push(r.error);
  }
  if (salidas.length > 0) {
    const r = await applyStockOut(salidas, opts);
    if (r.ok) count += r.count;
    else errores.push(r.error);
  }
  if (faltantes.length > 0) {
    errores.push(`sin producto: ${faltantes.join(", ")}`);
  }

  return errores.length > 0
    ? { ok: false, error: errores.join(" | "), count }
    : { ok: true, count };
}
