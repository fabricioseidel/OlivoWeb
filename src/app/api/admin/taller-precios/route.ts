/**
 * El taller de precios y costos: leer las filas pendientes y guardarlas en lote.
 *
 * Existe porque el cuello de botella del catálogo no es técnico sino de
 * digitación: al 2026-08-30 hay 458 productos activos sin proveedor y 64 con
 * stock y precio $0. Cargarlos de a uno por la ficha del producto son cientos
 * de navegaciones; esta ruta alimenta una grilla donde se escriben todos
 * seguidos y se guardan juntos.
 *
 * No decide precios: la aritmética vive en `pricing.ts` y acá sólo se aplica.
 */

import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/api-auth";
import { supabaseServer } from "@/lib/supabase-server";
import {
  calcularFilaCosto,
  MARGEN_POR_DEFECTO,
  TASA_IVA,
  type ModoRedondeo,
} from "@/lib/pricing";
import { CATEGORIA_POR_DEFECTO } from "@/server/pricing.service";

/** Qué le falta a una fila. Es el filtro de la pantalla. */
export type Pendiente =
  | "sin-precio"
  | "sin-proveedor"
  | "sin-costo"
  | "a-perdida"
  | "todos";

const PENDIENTES: Pendiente[] = [
  "sin-precio",
  "sin-proveedor",
  "sin-costo",
  "a-perdida",
  "todos",
];

/** Margen objetivo y redondeo por categoría, con la regla general de respaldo. */
async function reglasDeMargen() {
  const { data } = await supabaseServer
    .from("category_margins")
    .select("category, margin, rounding");

  const porCategoria = new Map<string, { margen: number; redondeo: ModoRedondeo }>();
  let general = { margen: MARGEN_POR_DEFECTO, redondeo: "decena" as ModoRedondeo };

  for (const r of data ?? []) {
    const entrada = {
      margen: Number(r.margin),
      redondeo: (r.rounding as ModoRedondeo) ?? "decena",
    };
    if (r.category === CATEGORIA_POR_DEFECTO) general = entrada;
    else porCategoria.set(r.category, entrada);
  }

  return (categoria: string | null, override: number | null) => {
    const base = (categoria && porCategoria.get(categoria)) || general;
    return { margen: override ?? base.margen, redondeo: base.redondeo };
  };
}

export async function GET(req: Request) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const pendienteParam = searchParams.get("pendiente") ?? "sin-precio";
  const pendiente: Pendiente = PENDIENTES.includes(pendienteParam as Pendiente)
    ? (pendienteParam as Pendiente)
    : "sin-precio";
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const soloConStock = searchParams.get("conStock") === "1";

  try {
    const [{ data: productos, error: errP }, { data: vinculos }, { data: proveedores }] =
      await Promise.all([
        supabaseServer
          .from("products")
          .select("barcode, name, category, stock, sale_price, price_reviewed_at, margin_override, image_url")
          .neq("is_active", false)
          .order("name"),
        supabaseServer
          .from("product_suppliers")
          .select("product_id, supplier_id, unit_cost, pack_size, tax_rate, priority"),
        supabaseServer.from("suppliers").select("id, name").order("name"),
      ]);

    if (errP) {
      console.error("[TALLER-PRECIOS][GET]", errP);
      return NextResponse.json({ error: "No se pudo leer el catálogo" }, { status: 500 });
    }

    // El vínculo que manda es el de menor prioridad, igual que en el resto del
    // panel: un producto puede tener varios proveedores y sólo uno es el que
    // define el costo con el que se calcula el margen.
    const preferido = new Map<string, any>();
    for (const v of vinculos ?? []) {
      const actual = preferido.get(v.product_id);
      if (!actual || (v.priority ?? 99) < (actual.priority ?? 99)) {
        preferido.set(v.product_id, v);
      }
    }

    const nombreProveedor = new Map((proveedores ?? []).map((s: any) => [s.id, s.name]));
    const reglaDe = await reglasDeMargen();

    const filas = (productos ?? []).map((p: any) => {
      const v = preferido.get(p.barcode);
      const { margen, redondeo } = reglaDe(p.category, p.margin_override);

      const calc = calcularFilaCosto({
        costoBulto: v?.unit_cost != null ? Number(v.unit_cost) : null,
        // El costo guardado ya es unitario; el bulto sólo se usa al cargar uno
        // nuevo desde la factura.
        unidadesPorBulto: 1,
        precioVenta: p.sale_price != null ? Number(p.sale_price) : null,
        tasa: v?.tax_rate != null ? Number(v.tax_rate) : TASA_IVA,
        margen,
        redondeo,
      });

      return {
        barcode: p.barcode,
        nombre: p.name,
        categoria: p.category,
        stock: Number(p.stock ?? 0),
        imagen: p.image_url,
        precioVenta: p.sale_price != null ? Number(p.sale_price) : null,
        precioRevisado: Boolean(p.price_reviewed_at),
        proveedorId: v?.supplier_id ?? null,
        proveedorNombre: v?.supplier_id ? nombreProveedor.get(v.supplier_id) ?? null : null,
        costoNeto: v?.unit_cost != null ? Number(v.unit_cost) : null,
        packSize: v?.pack_size ?? null,
        tasa: v?.tax_rate != null ? Number(v.tax_rate) : TASA_IVA,
        margenObjetivo: margen,
        ...calc,
      };
    });

    const coincide = (f: (typeof filas)[number]) => {
      if (soloConStock && f.stock <= 0) return false;
      if (q && !(`${f.nombre ?? ""} ${f.barcode}`.toLowerCase().includes(q))) return false;
      switch (pendiente) {
        case "sin-precio":
          return (f.precioVenta ?? 0) <= 0;
        case "sin-proveedor":
          return f.proveedorId === null;
        case "sin-costo":
          return f.proveedorId !== null && (f.costoNeto ?? 0) <= 0;
        case "a-perdida":
          return f.aPerdida;
        default:
          return true;
      }
    };

    const seleccionadas = filas.filter(coincide);

    return NextResponse.json({
      filas: seleccionadas,
      proveedores: proveedores ?? [],
      // Los totales se calculan sobre TODO el catálogo, no sobre lo filtrado:
      // son el tablero de cuánto falta, y tienen que quedarse quietos cuando
      // se cambia de pestaña.
      totales: {
        activos: filas.length,
        sinPrecio: filas.filter((f) => (f.precioVenta ?? 0) <= 0).length,
        sinPrecioConStock: filas.filter((f) => (f.precioVenta ?? 0) <= 0 && f.stock > 0).length,
        sinProveedor: filas.filter((f) => f.proveedorId === null).length,
        sinCosto: filas.filter((f) => f.proveedorId !== null && (f.costoNeto ?? 0) <= 0).length,
        aPerdida: filas.filter((f) => f.aPerdida).length,
      },
    });
  } catch (e) {
    console.error("[TALLER-PRECIOS][GET]", e);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}

type FilaGuardar = {
  barcode: string;
  /** Precio de venta nuevo, con IVA. */
  precioVenta?: number | null;
  /** Costo tal como viene de la factura: del bulto si se declara uno. */
  costoBulto?: number | null;
  unidadesPorBulto?: number | null;
  proveedorId?: string | null;
  /** Marca el precio como revisado por una persona. */
  marcarRevisado?: boolean;
};

export async function POST(req: Request) {
  const auth = await requireApiAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const filas: FilaGuardar[] = Array.isArray(body?.filas) ? body.filas : [];
    if (filas.length === 0) {
      return NextResponse.json({ error: "No hay filas para guardar" }, { status: 400 });
    }
    // Un lote gigante multiplicaría el tiempo de respuesta y dejaría a medias
    // un guardado que el navegador ya dio por perdido.
    if (filas.length > 200) {
      return NextResponse.json(
        { error: "Demasiadas filas en un solo guardado (máximo 200)" },
        { status: 400 }
      );
    }

    const usuarioId = auth.userId || null;
    const resultados: { barcode: string; ok: boolean; error?: string }[] = [];

    for (const fila of filas) {
      const barcode = String(fila.barcode ?? "").trim();
      if (!barcode) continue;

      try {
        // 1. Precio de venta. `null` significa "no lo toques", no "ponelo en 0".
        if (fila.precioVenta != null && Number.isFinite(fila.precioVenta)) {
          const precio = Math.max(0, Math.round(fila.precioVenta));
          const parche: Record<string, unknown> = {
            sale_price: precio,
            updated_at: new Date().toISOString(),
          };
          // Ponerle precio a un producto es justamente el acto de revisarlo,
          // así que la marca la pone el mismo guardado en vez de exigir un
          // segundo clic que nadie iba a dar.
          if (fila.marcarRevisado !== false && precio > 0) {
            parche.price_reviewed_at = new Date().toISOString();
            parche.price_reviewed_by = usuarioId;
          }

          const { error } = await supabaseServer
            .from("products")
            .update(parche)
            .eq("barcode", barcode);
          if (error) throw new Error(error.message);
        }

        // 2. Costo y proveedor.
        const hayCosto = fila.costoBulto != null && Number.isFinite(fila.costoBulto);
        if (hayCosto || fila.proveedorId) {
          if (!fila.proveedorId) {
            throw new Error("Falta el proveedor para guardar el costo");
          }

          // El costo se guarda por UNIDAD: es lo que la base espera y lo que el
          // margen usa. Dividir acá y no en la pantalla evita que el día que
          // alguien cargue desde otro lado se vuelva a guardar el bulto entero.
          const unitario = hayCosto
            ? (() => {
                const r = calcularFilaCosto({
                  costoBulto: fila.costoBulto as number,
                  unidadesPorBulto: fila.unidadesPorBulto ?? 1,
                  precioVenta: null,
                });
                if (r.costoUnitarioNeto === null) {
                  throw new Error("El costo o las unidades por bulto no son válidos");
                }
                return r.costoUnitarioNeto;
              })()
            : null;

          const payload: Record<string, unknown> = {
            product_id: barcode,
            supplier_id: fila.proveedorId,
            priority: 1,
          };
          if (unitario !== null) {
            payload.unit_cost = unitario;
            payload.cost_updated_at = new Date().toISOString();
            payload.cost_source = "taller";
            // Se guarda el bulto declarado para que la próxima vez se vea de
            // dónde salió el número.
            payload.pack_size =
              fila.unidadesPorBulto && fila.unidadesPorBulto > 1
                ? Math.round(fila.unidadesPorBulto)
                : null;
          }

          const { error } = await supabaseServer
            .from("product_suppliers")
            .upsert(payload, { onConflict: "product_id,supplier_id" });
          if (error) throw new Error(error.message);
        }

        resultados.push({ barcode, ok: true });
      } catch (e) {
        // Una fila mala no puede tumbar el lote entero: quien cargó treinta
        // productos no debería perder los veintinueve buenos.
        resultados.push({
          barcode,
          ok: false,
          error: e instanceof Error ? e.message : "No se pudo guardar",
        });
      }
    }

    const guardadas = resultados.filter((r) => r.ok).length;
    return NextResponse.json({
      guardadas,
      fallidas: resultados.filter((r) => !r.ok),
      resultados,
    });
  } catch (e) {
    console.error("[TALLER-PRECIOS][POST]", e);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}
