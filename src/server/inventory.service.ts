import { supabaseServer } from "@/lib/supabase-server";
import { logger } from "@/utils/logger";

/**
 * Puerta única para mover stock.
 *
 * El modelo de datos es: `branch_stock` es la fuente de verdad y
 * `products.stock` es un valor DERIVADO — la suma de las sucursales **activas**
 * del producto. Escribir `products.stock` directamente rompe las dos cosas a la
 * vez: no mueve el stock de la sucursal (que es de donde realmente sale la
 * mercadería) y el número que se escribió se pierde en el siguiente recálculo,
 * cuando cualquier otra operación vuelva a sumar las sucursales.
 *
 * Desde `20260828000000_products_stock_derivado_por_trigger.sql` eso lo hace
 * cumplir la base: un trigger recalcula `products.stock` en cada escritura, y
 * otro lo propaga cuando se mueve `branch_stock`. Escribirlo a mano ya no
 * "gana" — el valor se reemplaza por el derivado. Este módulo sigue siendo la
 * puerta por la que conviene pasar, porque además deja el rastro en
 * `inventory_movements`; lo que cambió es que saltárselo ya no corrompe el dato.
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

/**
 * La sucursal sobre la que se aplica un ajuste: la indicada, o la que está
 * marcada por defecto.
 *
 * Las RPC hacen este mismo `COALESCE` en SQL, pero acá hace falta resolverla
 * antes: para saber cuánto hay que mover hay que leer el stock de esa sucursal
 * concreta, no el total del producto.
 */
async function resolverSucursal(
  branchId?: string | null
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (branchId) return { ok: true, id: branchId };

  const { data, error } = await supabaseServer
    .from("branches")
    .select("id")
    .eq("is_default", true)
    .eq("is_active", true)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data?.id) {
    return { ok: false, error: "No hay una sucursal por defecto activa" };
  }
  return { ok: true, id: data.id };
}

/**
 * Cuánto hay de cada producto en una sucursal.
 *
 * Un producto sin fila en `branch_stock` cuenta 0, que es lo que hay: la fila
 * la crea la primera entrada de mercadería.
 */
async function stockEnSucursal(
  barcodes: string[],
  branchId: string
): Promise<{ ok: true; stock: Map<string, number> } | { ok: false; error: string }> {
  const stock = new Map<string, number>();
  const TAMANO = 1000;

  for (let desde = 0; desde < barcodes.length; desde += TAMANO) {
    const lote = barcodes.slice(desde, desde + TAMANO);
    const { data, error } = await supabaseServer
      .from("branch_stock")
      .select("product_barcode, stock")
      .eq("branch_id", branchId)
      .in("product_barcode", lote);

    if (error) return { ok: false, error: error.message };
    for (const fila of data ?? []) {
      stock.set(String((fila as any).product_barcode), Number((fila as any).stock ?? 0));
    }
  }

  return { ok: true, stock };
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
 *
 * Devuelve si el movimiento se aplicó. Ignorar el resultado sigue siendo
 * válido, pero quien necesite informar "se devolvió el stock" tiene con qué
 * saber si es cierto.
 */
export async function releaseStock(
  barcode: string,
  qty: number,
  { branchId, reference, reason }: StockMutationOptions = {}
): Promise<boolean> {
  if (!barcode || !(qty > 0)) return false;

  const { error } = await supabaseServer.rpc("increment_product_stock", {
    p_barcode: barcode,
    p_quantity: qty,
    p_branch_id: branchId ?? null,
    p_reference: reference ?? null,
    p_reason: reason ?? STOCK_REASON.WEB_SALE_ROLLBACK,
  });

  if (error) {
    logger.error("[inventory] increment_product_stock falló:", error);
    return false;
  }

  return true;
}

export type RestoreResult =
  | { ok: true; devueltos: number; fallidos: number; sinResolver: string[] }
  | { ok: false; error: string };

/**
 * Devuelve al inventario todo lo reservado por una orden web.
 *
 * Existe porque las claves NO son las mismas a los dos lados de la orden. El
 * checkout busca el producto por código de barras y reserva el stock con ese
 * código —correcto—, pero después guarda `order_items.product_id` con
 * `products.id`, que es la clave numérica. Devolver el stock exige, entonces,
 * traducir de vuelta.
 *
 * El intento anterior lo resolvía pidiéndole a PostgREST un embed
 * `order_items → products(barcode)`. Ese embed no puede existir: PostgREST
 * arma sus relaciones desde las claves foráneas, y `order_items` sólo tiene
 * una, hacia `orders` (verificado en `pg_constraint`: las cinco FK que apuntan
 * a `products` vienen de otras tablas). La consulta devolvía error, el código
 * lo descartaba con un `if (!error && data)` y la devolución de stock se
 * saltaba entera — en silencio, mientras el log seguía diciendo "stock
 * restaurado". El resultado era mercadería reservada por un pago rechazado que
 * no volvía nunca al inventario.
 *
 * Por eso acá no hay embed: se lee `order_items` sin adornos y la traducción
 * se hace explícita. Y por eso devuelve un resultado en vez de tragarse los
 * errores: una orden que no pudo devolver su stock deja el inventario
 * descuadrado, y eso hay que poder decirlo.
 */
export async function restoreOrderStock(
  orderId: string,
  { branchId, reason }: StockMutationOptions = {}
): Promise<RestoreResult> {
  if (!orderId) return { ok: false, error: "Falta el id de la orden" };

  const { data: lineas, error: errLineas } = await supabaseServer
    .from("order_items")
    .select("product_id, quantity")
    .eq("order_id", orderId);

  if (errLineas) {
    logger.error("[inventory] no se pudieron leer los items de la orden:", errLineas);
    return { ok: false, error: errLineas.message };
  }

  const items = (lineas ?? []) as Array<{ product_id: unknown; quantity: unknown }>;
  if (items.length === 0) return { ok: true, devueltos: 0, fallidos: 0, sinResolver: [] };

  const claves = [...new Set(items.map((i) => String(i.product_id ?? "")).filter(Boolean))];

  // Traducción de `products.id` a código de barras. Se consulta por id, que es
  // lo que el checkout guarda hoy.
  const barcodePorClave = new Map<string, string>();
  const numericas = claves.filter((c) => /^\d+$/.test(c));

  if (numericas.length > 0) {
    const { data, error } = await supabaseServer
      .from("products")
      .select("id, barcode")
      .in("id", numericas);

    if (error) {
      logger.error("[inventory] no se pudo traducir product_id a barcode:", error);
      return { ok: false, error: error.message };
    }
    for (const p of (data ?? []) as Array<{ id: unknown; barcode: unknown }>) {
      if (p?.id !== null && p?.id !== undefined && p?.barcode) {
        barcodePorClave.set(String(p.id), String(p.barcode));
      }
    }
  }

  // Lo que no calzó por id se prueba como código de barras: órdenes viejas
  // pueden haberse guardado con la otra clave, y perder ese stock en silencio
  // es justamente el error que esta función viene a cerrar.
  const pendientes = claves.filter((c) => !barcodePorClave.has(c));
  if (pendientes.length > 0) {
    const { data, error } = await supabaseServer
      .from("products")
      .select("barcode")
      .in("barcode", pendientes);

    if (error) {
      logger.error("[inventory] no se pudo verificar barcodes de la orden:", error);
      return { ok: false, error: error.message };
    }
    for (const p of (data ?? []) as Array<{ barcode: unknown }>) {
      if (p?.barcode) barcodePorClave.set(String(p.barcode), String(p.barcode));
    }
  }

  let devueltos = 0;
  let fallidos = 0;
  const sinResolver: string[] = [];

  for (const item of items) {
    const clave = String(item.product_id ?? "");
    const cantidad = Number(item.quantity) || 0;
    const barcode = barcodePorClave.get(clave);

    if (!barcode) {
      sinResolver.push(clave);
      logger.error(
        `[inventory] la orden ${orderId} referencia el producto ${clave}, que no existe: su stock no se devolvió`
      );
      continue;
    }

    const ok = await releaseStock(barcode, cantidad, {
      branchId,
      reference: String(orderId),
      reason: reason ?? STOCK_REASON.WEB_SALE_ROLLBACK,
    });
    if (ok) devueltos += 1;
    else fallidos += 1;
  }

  return { ok: true, devueltos, fallidos, sinResolver };
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
 * El delta se aplica sobre una sola sucursal (la indicada o la principal), y
 * por eso se mide **contra el stock de esa sucursal**, no contra
 * `products.stock`. Medirlo contra el total es lo que hacía antes y da un
 * ajuste equivocado apenas hay más de una sucursal con existencias: con 42 en
 * Principal, 42 en otra y un total de 84, pedir "dejá 50" restaba 34 y
 * Principal terminaba en 8. El total quedaba plausible y el detalle, inventado.
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
    .select("barcode")
    .eq("barcode", barcode)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!product) return { ok: false, error: `Producto ${barcode} no encontrado` };

  const sucursal = await resolverSucursal(options.branchId);
  if (!sucursal.ok) return { ok: false, error: sucursal.error };

  const actual = await stockEnSucursal([barcode], sucursal.id);
  if (!actual.ok) return { ok: false, error: actual.error };

  const delta = Math.round(target) - (actual.stock.get(barcode) ?? 0);
  if (delta === 0) return { ok: true, count: 0 };

  const opts: StockMutationOptions = {
    ...options,
    branchId: sucursal.id,
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
 *
 * Igual que `setStockLevel`, el stock actual se lee de la sucursal donde se va
 * a aplicar el ajuste, no de `products.stock`.
 */
export async function setStockLevels(
  targets: Array<{ barcode: string; target: number }>,
  options: StockMutationOptions = {}
): Promise<{ ok: true; count: number } | { ok: false; error: string; count: number }> {
  const wanted = targets.filter(
    (t) => t.barcode && Number.isFinite(t.target) && t.target >= 0
  );
  if (wanted.length === 0) return { ok: true, count: 0 };

  const sucursal = await resolverSucursal(options.branchId);
  if (!sucursal.ok) return { ok: false, error: sucursal.error, count: 0 };

  const barcodes = wanted.map((t) => t.barcode);

  // Dos lecturas distintas a propósito: `products` dice qué códigos existen
  // —para poder nombrar los que no— y `branch_stock` dice cuánto hay donde se
  // va a aplicar el ajuste. Un producto que existe pero nunca tuvo movimiento
  // no tiene fila en `branch_stock`: no está faltante, está en cero.
  const [{ data: rows, error }, actual] = await Promise.all([
    supabaseServer.from("products").select("barcode").in("barcode", barcodes),
    stockEnSucursal(barcodes, sucursal.id),
  ]);

  if (error) return { ok: false, error: error.message, count: 0 };
  if (!actual.ok) return { ok: false, error: actual.error, count: 0 };

  const existentes = new Set((rows ?? []).map((r) => String(r.barcode)));

  const entradas: StockItem[] = [];
  const salidas: StockItem[] = [];
  const faltantes: string[] = [];

  for (const { barcode, target } of wanted) {
    if (!existentes.has(barcode)) {
      faltantes.push(barcode);
      continue;
    }
    const delta = Math.round(target) - (actual.stock.get(barcode) ?? 0);
    if (delta > 0) entradas.push({ barcode, qty: delta });
    else if (delta < 0) salidas.push({ barcode, qty: -delta });
  }

  const opts: StockMutationOptions = {
    ...options,
    branchId: sucursal.id,
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
