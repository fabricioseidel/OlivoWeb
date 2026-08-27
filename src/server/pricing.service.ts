import { supabaseServer } from "@/lib/supabase-server";
import {
  MARGEN_POR_DEFECTO,
  UMBRAL_REVISION_COSTO,
  TASA_IVA,
  diagnosticarPrecio,
  variacionCosto,
  type ModoRedondeo,
} from "@/lib/pricing";

/**
 * La foto de precios del catálogo, calculada en el servidor.
 *
 * Hasta la Fase 1 el margen sólo existía dentro de un formulario React, así que
 * la pregunta "qué productos están bajo margen" no se podía hacer: había que
 * abrir producto por producto. Este servicio la responde de una vez para todo
 * el catálogo.
 *
 * Va en el servidor a propósito. Traerse el catálogo entero al navegador para
 * calcularlo ahí obliga a mandar costos de proveedor a un cliente que sólo
 * necesita el resultado, y deja la lógica donde no se puede reutilizar desde
 * una API ni desde un cron.
 */

/** Clave de la fila de respaldo en `category_margins`. */
export const CATEGORIA_POR_DEFECTO = "__default__";

export type MotivoPrecio =
  | "sin-costo"
  | "bajo-costo"
  | "bajo-margen"
  | "costo-cambio"
  | "sin-revisar";

export type ProveedorDelProducto = {
  supplierId: string;
  supplierName: string | null;
  /** Costo sin IVA, tal como se guarda. */
  costoNeto: number | null;
  /** Costo con IVA: lo que realmente se paga por unidad. */
  costoBruto: number | null;
  tasa: number;
  prioridad: number | null;
  costoActualizadoEn: string | null;
  /** El que manda para calcular el margen: la prioridad más baja con costo. */
  preferido: boolean;
};

export type FilaPrecio = {
  barcode: string;
  nombre: string;
  categoria: string | null;

  precioVenta: number;
  /** Precio de oferta vigente, si lo hay. No entra en el cálculo de margen. */
  precioOferta: number | null;

  costoNeto: number | null;
  costoBruto: number | null;
  /** Margen objetivo aplicado: el del producto, el de su categoría o el general. */
  margenObjetivo: number;
  /** De dónde salió ese margen, para poder explicarlo en pantalla. */
  origenMargen: "producto" | "categoria" | "general";
  redondeo: ModoRedondeo;

  /** Lo que deja hoy el precio que tiene puesto. `null` si no se sabe el costo. */
  margenActual: number | null;
  sugerido: number | null;
  /** Cuánto habría que mover el precio para llegar al sugerido. */
  diferencia: number | null;

  revisadoEn: string | null;
  /** Variación del costo desde la última revisión del precio. */
  variacionCosto: number | null;
  costoAnterior: number | null;

  proveedores: ProveedorDelProducto[];
  /** Un proveedor no preferido sale más barato que el que se está usando. */
  hayProveedorMasBarato: boolean;

  motivos: MotivoPrecio[];
};

export type ResumenPrecios = {
  total: number;
  sinCosto: number;
  bajoCosto: number;
  bajoMargen: number;
  costoCambio: number;
  sinRevisar: number;
  /** Cuánto margen se está dejando sobre la mesa, sumando las diferencias. */
  margenPromedio: number | null;
};

export type ReglaCategoria = {
  categoria: string;
  /** Productos activos en la categoría. */
  productos: number;
  /** Margen que dejan hoy, en promedio. Es la evidencia para fijar la regla. */
  margenActual: number | null;
  /** Regla cargada en `category_margins`, si la hay. */
  margen: number | null;
  redondeo: ModoRedondeo | null;
  /** Cuántos de esos productos no llegan a la regla vigente. */
  bajoLaRegla: number;
};

export type FotoPrecios = {
  filas: FilaPrecio[];
  resumen: ResumenPrecios;
  /** Reglas cargadas, incluida `__default__`. */
  margenes: { categoria: string; margen: number; redondeo: ModoRedondeo }[];
  /**
   * Una entrada por categoría real del catálogo, con y sin regla propia.
   *
   * Fijar un margen a ciegas es cómo se llegó al problema que arregla esta
   * fase: el 35% se eligió una vez y nunca se contrastó. Acá se ve, por
   * categoría, cuánto se está dejando de verdad antes de decidir la regla.
   */
  categorias: ReglaCategoria[];
  umbral: number;
  generadoEn: string;
};

/** Trae una tabla completa en páginas: Supabase corta en 1.000 filas por consulta. */
async function traerTodo<T>(
  tabla: string,
  columnas: string,
  ajustar?: (q: any) => any
): Promise<T[]> {
  const TAMANO = 1000;
  const filas: T[] = [];

  for (let desde = 0; ; desde += TAMANO) {
    let consulta = supabaseServer.from(tabla).select(columnas);
    if (ajustar) consulta = ajustar(consulta);
    const { data, error } = await consulta.range(desde, desde + TAMANO - 1);

    if (error) throw new Error(`No se pudo leer ${tabla}: ${error.message}`);
    const lote = (data ?? []) as T[];
    filas.push(...lote);
    if (lote.length < TAMANO) break;
  }

  return filas;
}

const numero = (valor: unknown): number | null => {
  if (valor === null || valor === undefined || valor === "") return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
};

const ES_MODO: ModoRedondeo[] = ["ninguno", "decena", "terminacion90", "centena"];
const comoRedondeo = (valor: unknown): ModoRedondeo =>
  ES_MODO.includes(valor as ModoRedondeo) ? (valor as ModoRedondeo) : "decena";

type FilaProducto = {
  barcode: string;
  name: string;
  category: string | null;
  sale_price: number | null;
  offer_price: number | null;
  is_active: boolean | null;
  price_reviewed_at: string | null;
  margin_override: number | null;
};

type FilaProveedor = {
  product_id: string;
  supplier_id: string;
  unit_cost: number | null;
  tax_rate: number | null;
  unit_cost_gross: number | null;
  priority: number | null;
  cost_updated_at: string | null;
};

type FilaHistorial = {
  product_barcode: string;
  supplier_id: string;
  unit_cost: number | null;
  previous_unit_cost: number | null;
  recorded_at: string;
};

/**
 * Elige el proveedor que manda para el margen.
 *
 * Es el de prioridad más baja **que tenga costo**: un proveedor marcado como
 * principal pero sin precio cargado no puede decidir a cuánto se vende.
 */
function elegirPreferido(proveedores: FilaProveedor[]): FilaProveedor | null {
  const conCosto = proveedores.filter((p) => numero(p.unit_cost) !== null);
  if (conCosto.length === 0) return null;

  return conCosto.reduce((mejor, actual) =>
    (actual.priority ?? 999) < (mejor.priority ?? 999) ? actual : mejor
  );
}

export async function obtenerFotoPrecios(): Promise<FotoPrecios> {
  const [productos, proveedoresDeProducto, proveedores, margenes, historial] =
    await Promise.all([
      traerTodo<FilaProducto>(
        "products",
        "barcode, name, category, sale_price, offer_price, is_active, price_reviewed_at, margin_override"
      ),
      traerTodo<FilaProveedor>(
        "product_suppliers",
        "product_id, supplier_id, unit_cost, tax_rate, unit_cost_gross, priority, cost_updated_at"
      ),
      traerTodo<{ id: string; name: string | null }>("suppliers", "id, name"),
      traerTodo<{ category: string; margin: number; rounding: string }>(
        "category_margins",
        "category, margin, rounding"
      ),
      traerTodo<FilaHistorial>(
        "supplier_cost_history",
        "product_barcode, supplier_id, unit_cost, previous_unit_cost, recorded_at",
        (q) => q.not("previous_unit_cost", "is", null).order("recorded_at", { ascending: false })
      ),
    ]);

  const nombreProveedor = new Map(proveedores.map((s) => [s.id, s.name]));

  const reglas = new Map<string, { margen: number; redondeo: ModoRedondeo }>();
  for (const m of margenes) {
    const margen = numero(m.margin);
    if (margen === null) continue;
    reglas.set(m.category, { margen, redondeo: comoRedondeo(m.rounding) });
  }
  const general = reglas.get(CATEGORIA_POR_DEFECTO) ?? {
    margen: MARGEN_POR_DEFECTO,
    redondeo: "decena" as ModoRedondeo,
  };

  const porProducto = new Map<string, FilaProveedor[]>();
  for (const ps of proveedoresDeProducto) {
    const lista = porProducto.get(ps.product_id);
    if (lista) lista.push(ps);
    else porProducto.set(ps.product_id, [ps]);
  }

  // El historial viene ordenado de más nuevo a más viejo: el primero de cada
  // par producto+proveedor es el último cambio de costo.
  const ultimoCambio = new Map<string, FilaHistorial>();
  for (const h of historial) {
    const clave = `${h.product_barcode}|${h.supplier_id}`;
    if (!ultimoCambio.has(clave)) ultimoCambio.set(clave, h);
  }

  const filas: FilaPrecio[] = [];

  for (const p of productos) {
    if (p.is_active === false) continue; // no está a la venta a propósito

    const lista = porProducto.get(p.barcode) ?? [];
    const preferido = elegirPreferido(lista);

    const margenProducto = numero(p.margin_override);
    const reglaCategoria = p.category ? reglas.get(p.category) : undefined;
    const margenObjetivo = margenProducto ?? reglaCategoria?.margen ?? general.margen;
    const origenMargen: FilaPrecio["origenMargen"] =
      margenProducto !== null ? "producto" : reglaCategoria ? "categoria" : "general";
    const redondeo = reglaCategoria?.redondeo ?? general.redondeo;

    const precioVenta = numero(p.sale_price) ?? 0;
    const costoNeto = preferido ? numero(preferido.unit_cost) : null;
    const tasaPreferida = preferido ? (numero(preferido.tax_rate) ?? TASA_IVA) : TASA_IVA;

    const diagnostico =
      costoNeto === null
        ? null
        : diagnosticarPrecio({
            costoNeto,
            tasa: tasaPreferida,
            margen: margenObjetivo,
            redondeo,
            precioVenta,
          });

    // ¿Cambió el costo desde que se revisó el precio? Es el disparador del
    // circuito completo: el costo se mueve, el precio vuelve a revisión.
    const cambio = preferido
      ? ultimoCambio.get(`${p.barcode}|${preferido.supplier_id}`)
      : undefined;
    const posteriorALaRevision =
      cambio !== undefined &&
      (p.price_reviewed_at === null ||
        new Date(cambio.recorded_at) > new Date(p.price_reviewed_at));
    const variacion =
      cambio && posteriorALaRevision
        ? variacionCosto(Number(cambio.previous_unit_cost), Number(cambio.unit_cost))
        : null;

    const listaProveedores: ProveedorDelProducto[] = lista
      .map((ps) => ({
        supplierId: ps.supplier_id,
        supplierName: nombreProveedor.get(ps.supplier_id) ?? null,
        costoNeto: numero(ps.unit_cost),
        costoBruto: numero(ps.unit_cost_gross),
        tasa: numero(ps.tax_rate) ?? TASA_IVA,
        prioridad: ps.priority,
        costoActualizadoEn: ps.cost_updated_at,
        preferido: preferido !== null && ps.supplier_id === preferido.supplier_id,
      }))
      .sort((a, b) => (a.prioridad ?? 999) - (b.prioridad ?? 999));

    const hayProveedorMasBarato =
      costoNeto !== null &&
      listaProveedores.some((s) => !s.preferido && s.costoNeto !== null && s.costoNeto < costoNeto);

    const motivos: MotivoPrecio[] = [];
    if (costoNeto === null) motivos.push("sin-costo");
    if (diagnostico?.bajoCosto) motivos.push("bajo-costo");
    // Vender bajo el costo ya implica estar bajo margen; listar las dos cosas
    // haría que el mismo producto apareciera dos veces diciendo lo mismo.
    if (diagnostico?.bajoMargen && !diagnostico.bajoCosto) motivos.push("bajo-margen");
    if (variacion !== null && Math.abs(variacion) >= UMBRAL_REVISION_COSTO) {
      motivos.push("costo-cambio");
    }
    if (p.price_reviewed_at === null) motivos.push("sin-revisar");

    filas.push({
      barcode: p.barcode,
      nombre: p.name,
      categoria: p.category,
      precioVenta,
      precioOferta: numero(p.offer_price),
      costoNeto,
      costoBruto: diagnostico?.costoBruto ?? null,
      margenObjetivo,
      origenMargen,
      redondeo,
      margenActual: diagnostico?.margenActual ?? null,
      sugerido: diagnostico?.sugerido ?? null,
      diferencia: diagnostico?.diferencia ?? null,
      revisadoEn: p.price_reviewed_at,
      variacionCosto: variacion,
      costoAnterior: cambio && posteriorALaRevision ? numero(cambio.previous_unit_cost) : null,
      proveedores: listaProveedores,
      hayProveedorMasBarato,
      motivos,
    });
  }

  // Primero lo que pierde plata, después lo que deja poco.
  const peso: Record<MotivoPrecio, number> = {
    "bajo-costo": 0,
    "bajo-margen": 1,
    "costo-cambio": 2,
    "sin-costo": 3,
    "sin-revisar": 4,
  };
  filas.sort((a, b) => {
    const pa = a.motivos.length ? Math.min(...a.motivos.map((m) => peso[m])) : 99;
    const pb = b.motivos.length ? Math.min(...b.motivos.map((m) => peso[m])) : 99;
    if (pa !== pb) return pa - pb;
    return a.nombre.localeCompare(b.nombre, "es");
  });

  const conMargen = filas.map((f) => f.margenActual).filter((m): m is number => m !== null);

  const porCategoria = new Map<string, FilaPrecio[]>();
  for (const f of filas) {
    const clave = f.categoria ?? "";
    const lista = porCategoria.get(clave);
    if (lista) lista.push(f);
    else porCategoria.set(clave, [f]);
  }

  const categorias: ReglaCategoria[] = [...porCategoria.entries()]
    .map(([categoria, delGrupo]) => {
      const margenes = delGrupo
        .map((f) => f.margenActual)
        .filter((m): m is number => m !== null);
      const regla = categoria ? reglas.get(categoria) : undefined;

      return {
        categoria,
        productos: delGrupo.length,
        margenActual: margenes.length
          ? margenes.reduce((s, m) => s + m, 0) / margenes.length
          : null,
        margen: regla?.margen ?? null,
        redondeo: regla?.redondeo ?? null,
        bajoLaRegla: delGrupo.filter(
          (f) => f.margenActual !== null && f.margenActual < f.margenObjetivo
        ).length,
      };
    })
    .sort((a, b) => b.bajoLaRegla - a.bajoLaRegla || a.categoria.localeCompare(b.categoria, "es"));

  return {
    filas,
    resumen: {
      total: filas.length,
      sinCosto: filas.filter((f) => f.motivos.includes("sin-costo")).length,
      bajoCosto: filas.filter((f) => f.motivos.includes("bajo-costo")).length,
      bajoMargen: filas.filter((f) => f.motivos.includes("bajo-margen")).length,
      costoCambio: filas.filter((f) => f.motivos.includes("costo-cambio")).length,
      sinRevisar: filas.filter((f) => f.motivos.includes("sin-revisar")).length,
      margenPromedio: conMargen.length
        ? conMargen.reduce((s, m) => s + m, 0) / conMargen.length
        : null,
    },
    margenes: [...reglas.entries()].map(([categoria, r]) => ({
      categoria,
      margen: r.margen,
      redondeo: r.redondeo,
    })),
    categorias,
    umbral: UMBRAL_REVISION_COSTO,
    generadoEn: new Date().toISOString(),
  };
}

/**
 * Normaliza el autor de un cambio.
 *
 * `requireApiAdmin` devuelve `session.user.id ?? ""`, así que una sesión sin id
 * entrega cadena vacía. Escribirla en una columna `uuid` no guarda "sin autor":
 * la base rechaza la fila entera y el precio no se guarda. Vacío es NULL.
 */
const autor = (userId?: string | null): string | null => {
  const limpio = (userId ?? "").trim();
  return limpio === "" ? null : limpio;
};

/**
 * Deja un precio de venta revisado.
 *
 * Escribe el precio y la marca de revisión juntos: un precio nuevo sin marca
 * seguiría apareciendo como "sin revisar", y una marca sin precio diría que se
 * revisó algo que no se tocó.
 */
export async function aplicarPrecio(
  barcode: string,
  precio: number,
  userId?: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!Number.isFinite(precio) || precio <= 0) {
    return { ok: false, error: "El precio tiene que ser mayor que cero" };
  }

  const { error } = await supabaseServer
    .from("products")
    .update({
      sale_price: Math.round(precio),
      price_reviewed_at: new Date().toISOString(),
      price_reviewed_by: autor(userId),
    })
    .eq("barcode", barcode);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Marca un precio como revisado sin cambiarlo.
 *
 * Hace falta para poder decir "lo miré y está bien así". Sin esto, un producto
 * cuyo precio es correcto a propósito quedaría marcado como pendiente para
 * siempre y el filtro dejaría de ser útil.
 */
export async function marcarRevisado(
  barcode: string,
  userId?: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error } = await supabaseServer
    .from("products")
    .update({
      price_reviewed_at: new Date().toISOString(),
      price_reviewed_by: autor(userId),
    })
    .eq("barcode", barcode);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Fija el margen de una categoría.
 *
 * `categoria` puede ser `__default__`: esa fila es el respaldo para todo lo que
 * no tiene regla propia, y es la que reemplazó al 35% que estaba escrito a mano
 * dentro de dos componentes React.
 */
export async function guardarMargenCategoria(
  categoria: string,
  margen: number,
  redondeo: ModoRedondeo,
  userId?: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const nombre = categoria.trim();
  if (!nombre) return { ok: false, error: "Falta la categoría" };

  // El margen es sobre el precio de venta: con 1 (100%) el precio sería
  // infinito, así que la base lo rechazaría igual — mejor decirlo acá.
  if (!Number.isFinite(margen) || margen < 0 || margen >= 1) {
    return { ok: false, error: "El margen tiene que estar entre 0% y 99%" };
  }

  const { error } = await supabaseServer.from("category_margins").upsert(
    {
      category: nombre,
      margin: Number(margen.toFixed(3)),
      rounding: redondeo,
      updated_by: autor(userId),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "category" }
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Quita la regla propia de una categoría: vuelve a regirse por `__default__`.
 *
 * La fila de respaldo no se puede borrar — sin ella no habría margen objetivo
 * para las categorías sin regla y toda la pantalla se quedaría sin referencia.
 */
export async function borrarMargenCategoria(
  categoria: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (categoria === CATEGORIA_POR_DEFECTO) {
    return { ok: false, error: "El margen general no se puede borrar, sólo cambiar" };
  }

  const { error } = await supabaseServer
    .from("category_margins")
    .delete()
    .eq("category", categoria);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
