import { supabaseServer } from "@/lib/supabase-server";
import { aBruto, TASA_IVA } from "@/lib/pricing";
import {
  reglaRitmoReposicion,
  reglaFiabilidadProveedor,
  reglaDerivaCosto,
  reglaPlazoEntrega,
  reglaPlataDormida,
  reglaVelocidadCambiante,
  type Regla,
} from "@/lib/learning-rules";

/**
 * Alimenta las seis reglas de aprendizaje con el historial real.
 *
 * La división es a propósito: acá vive sólo la lectura de datos, y el cálculo
 * vive en `learning-rules.ts`, que es puro y se prueba sin base. Mezclarlos
 * dejaría las reglas —que son lo que hay que poder auditar— imposibles de
 * probar sin levantar media aplicación.
 */

export type FotoAprendizaje = {
  reglas: Regla[];
  /** Cuántas reglas ya tienen datos suficientes. */
  listas: number;
  generadoEn: string;
};

/** Ventana en días que se compara contra la anterior de igual duración. */
const VENTANA_DIAS = 30;

const haceDias = (n: number) =>
  new Date(Date.now() - n * 86_400_000).toISOString();

async function traerTodo<T>(
  tabla: string,
  columnas: string,
  ajustar?: (q: any) => any
): Promise<T[]> {
  const TAMANO = 1000;
  const filas: T[] = [];
  for (let desde = 0; ; desde += TAMANO) {
    let q = supabaseServer.from(tabla).select(columnas);
    if (ajustar) q = ajustar(q);
    const { data, error } = await q.range(desde, desde + TAMANO - 1);
    if (error) throw new Error(`No se pudo leer ${tabla}: ${error.message}`);
    const lote = (data ?? []) as T[];
    filas.push(...lote);
    if (lote.length < TAMANO) break;
  }
  return filas;
}

const nombreDe = (rel: any): string | null => {
  const x = Array.isArray(rel) ? rel[0] : rel;
  return x?.name ?? null;
};

export async function obtenerAprendizaje(): Promise<FotoAprendizaje> {
  const [pedidos, lineas, cambios, productos, ventasPos, ventasWeb, asignaciones, claves] =
    await Promise.all([
      traerTodo<any>(
        "supplier_orders",
        "id, supplier_id, status, sent_at, order_date, delivered_date, suppliers(name, lead_time_days)"
      ),
      traerTodo<any>(
        "supplier_order_items",
        "order_id, product_id, quantity, qty_received, received_at, products(barcode, name)"
      ),
      traerTodo<any>(
        "supplier_cost_history",
        "supplier_id, unit_cost, previous_unit_cost, recorded_at, suppliers(name)",
        (q) => q.not("previous_unit_cost", "is", null)
      ),
      traerTodo<any>(
        "products",
        "barcode, name, stock, is_active, created_at",
        (q) => q.eq("is_active", true)
      ),
      traerTodo<any>(
        "sale_items",
        "product_barcode, quantity, sales!inner(ts, voided)",
        (q) => q.gte("sales.ts", haceDias(VENTANA_DIAS * 2)).eq("sales.voided", false)
      ),
      traerTodo<any>(
        "order_items",
        "product_id, quantity, orders!inner(created_at, status)",
        (q) => q.gte("orders.created_at", haceDias(VENTANA_DIAS * 2))
      ),
      traerTodo<any>(
        "product_suppliers",
        "product_id, unit_cost, tax_rate, priority"
      ),
      // Sin filtrar por is_active: sirve sólo para traducir la clave de una
      // venta, y una venta de un producto ya dado de baja igual ocurrió.
      traerTodo<any>("products", "id, barcode"),
    ]);

  const pedidoPorId = new Map(pedidos.map((p) => [p.id, p]));

  // Las ventas no hablan todas el mismo idioma: el POS anota `product_barcode`
  // (el código de barras) y la web anota `order_items.product_id`, que es la
  // clave numérica `products.id`. Son dos columnas distintas de la misma
  // tabla, y ninguna de las dos calza con la otra: verificado contra la base,
  // 0 de 19 líneas web coinciden con un barcode y 19 de 19 con un id.
  //
  // Sumarlas sin traducir no falla ni avisa: cada venta web se acumularía bajo
  // una clave que ningún producto tiene, y las reglas de rotación dirían que
  // todo lo vendido por la web nunca se vendió.
  const barcodePorId = new Map<string, string>();
  for (const p of claves) {
    if (p.id !== null && p.id !== undefined && p.barcode) {
      barcodePorId.set(String(p.id), String(p.barcode));
    }
  }

  // ── 1. Ritmo de reposición ──
  const fechasPorProducto = new Map<string, { nombre: string; fechas: string[] }>();
  for (const l of lineas) {
    const prod = Array.isArray(l.products) ? l.products[0] : l.products;
    const fecha = l.received_at ?? pedidoPorId.get(l.order_id)?.delivered_date;
    if (!prod?.barcode || !fecha) continue;
    const acc = fechasPorProducto.get(prod.barcode) ?? {
      nombre: (prod.name ?? prod.barcode) as string,
      fechas: [] as string[],
    };
    acc.fechas.push(fecha);
    fechasPorProducto.set(prod.barcode, acc);
  }
  const ritmo = reglaRitmoReposicion(
    [...fechasPorProducto.entries()].map(([barcode, v]) => ({ barcode, ...v }))
  );

  // ── 2. Fiabilidad del proveedor ──
  const fiabilidad = reglaFiabilidadProveedor(
    lineas
      .filter((l) => l.qty_received !== null && l.qty_received !== undefined)
      .map((l) => ({
        proveedor: nombreDe(pedidoPorId.get(l.order_id)?.suppliers) ?? "Sin proveedor",
        pedido: Number(l.quantity) || 0,
        recibido: Number(l.qty_received) || 0,
      }))
  );

  // ── 3. Deriva de costo ──
  const deriva = reglaDerivaCosto(
    cambios.map((c) => ({
      proveedor: nombreDe(c.suppliers) ?? "Sin proveedor",
      anterior: Number(c.previous_unit_cost) || 0,
      nuevo: Number(c.unit_cost) || 0,
      fecha: c.recorded_at,
    }))
  );

  // ── 4. Plazo de entrega ──
  const plazo = reglaPlazoEntrega(
    pedidos
      .filter((p) => p.delivered_date && (p.sent_at || p.order_date))
      .map((p) => {
        const prov = Array.isArray(p.suppliers) ? p.suppliers[0] : p.suppliers;
        return {
          proveedor: prov?.name ?? "Sin proveedor",
          plazoDeclarado:
            prov?.lead_time_days === null || prov?.lead_time_days === undefined
              ? null
              : Number(prov.lead_time_days),
          enviado: p.sent_at ?? p.order_date,
          recibido: p.delivered_date,
        };
      })
  );

  // ── 5 y 6: ventas por producto, en dos ventanas ──
  const corte = haceDias(VENTANA_DIAS);
  const reciente = new Map<string, number>();
  const anterior = new Map<string, number>();

  const acumular = (barcode: string, cantidad: number, fecha: string) => {
    const destino = fecha >= corte ? reciente : anterior;
    destino.set(barcode, (destino.get(barcode) ?? 0) + cantidad);
  };

  for (const v of ventasPos) {
    const s = Array.isArray(v.sales) ? v.sales[0] : v.sales;
    if (!v.product_barcode || !s?.ts) continue;
    acumular(String(v.product_barcode), Number(v.quantity) || 0, s.ts);
  }
  for (const v of ventasWeb) {
    const o = Array.isArray(v.orders) ? v.orders[0] : v.orders;
    const estado = String(o?.status ?? "").toLowerCase();
    if (!v.product_id || !o?.created_at) continue;
    if (["cancelled", "cancelado", "refunded", "reembolsado"].includes(estado)) continue;
    const barcode = barcodePorId.get(String(v.product_id));
    if (!barcode) continue; // producto borrado: no hay a qué imputarle la venta
    acumular(barcode, Number(v.quantity) || 0, o.created_at);
  }

  // Compras acumuladas por producto, para la rotación.
  const compradas = new Map<string, number>();
  for (const l of lineas) {
    const prod = Array.isArray(l.products) ? l.products[0] : l.products;
    if (!prod?.barcode) continue;
    const n = l.qty_received ?? l.quantity;
    compradas.set(prod.barcode, (compradas.get(prod.barcode) ?? 0) + (Number(n) || 0));
  }

  // Costo del proveedor principal, para valorizar el stock parado.
  const costoPorProducto = new Map<string, number>();
  for (const a of [...asignaciones].sort(
    (x, y) => (x.priority ?? 999) - (y.priority ?? 999)
  )) {
    const barcode = String(a.product_id);
    if (costoPorProducto.has(barcode) || a.unit_cost === null) continue;
    const bruto = aBruto(Number(a.unit_cost), Number(a.tax_rate) || TASA_IVA);
    if (bruto !== null) costoPorProducto.set(barcode, bruto);
  }

  const ahora = Date.now();
  const plata = reglaPlataDormida(
    productos
      .filter((p) => compradas.has(p.barcode))
      .map((p) => ({
        barcode: p.barcode,
        nombre: p.name,
        compradas: compradas.get(p.barcode) ?? 0,
        vendidas: (reciente.get(p.barcode) ?? 0) + (anterior.get(p.barcode) ?? 0),
        stock: Number(p.stock) || 0,
        costoBruto: costoPorProducto.get(p.barcode) ?? null,
        diasEnCatalogo: p.created_at
          ? Math.floor((ahora - new Date(p.created_at).getTime()) / 86_400_000)
          : 0,
      }))
  );

  const velocidad = reglaVelocidadCambiante(
    productos.map((p) => ({
      barcode: p.barcode,
      nombre: p.name,
      reciente: reciente.get(p.barcode) ?? 0,
      anterior: anterior.get(p.barcode) ?? 0,
    }))
  );

  const reglas = [ritmo, fiabilidad, deriva, plazo, plata, velocidad];

  return {
    reglas,
    listas: reglas.filter((r) => r.estado === "listo").length,
    generadoEn: new Date().toISOString(),
  };
}
