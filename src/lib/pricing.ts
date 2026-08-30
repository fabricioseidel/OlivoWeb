/**
 * Precios, costos e IVA. Fuente única.
 *
 * Antes de este módulo la fórmula del precio sugerido vivía copiada en dos
 * pantallas (`productos/[id]` y `productos/nuevo`) como `costo / 0.65`, y el
 * servidor no la calculaba nunca. Eso tenía dos consecuencias caras: no se
 * podía preguntar "qué productos están bajo margen", y el motor de reposición
 * sumaba costos NETOS presentándolos como el total a pagar — un 19% menos que
 * la factura real.
 *
 * Reglas que este módulo fija para todo el proyecto:
 *
 * 1. **El costo de proveedor se guarda NETO** (`product_suppliers.unit_cost`).
 *    El bruto se deriva; nunca se guardan los dos como campos editables.
 * 2. **El margen se calcula sobre el precio de venta**, no sobre el costo:
 *    `margen = (venta − costo_bruto) / venta`. Un 35% de margen es `/0.65`,
 *    no `×1.35` — son cosas distintas y confundirlas cuesta plata.
 * 3. **El redondeo comercial siempre sube.** Redondear hacia abajo se come
 *    margen en silencio, producto por producto, sin que nadie lo note.
 *
 * Todo acá es puro: sin acceso a base de datos, sin fechas, sin `Math.random`.
 * Es lo que permite que tenga tests de verdad.
 */

/** IVA chileno, en porcentaje. */
export const TASA_IVA = 19;

/** Margen bruto por defecto cuando la categoría no define el suyo. */
export const MARGEN_POR_DEFECTO = 0.35;

/**
 * Cuánto debe subir un costo para que el precio de venta vuelva a revisión.
 *
 * Por debajo de esto el ruido de redondeo del proveedor generaría alertas
 * constantes que nadie miraría, que es peor que no alertar.
 */
export const UMBRAL_REVISION_COSTO = 0.05;

export type ModoRedondeo = "ninguno" | "decena" | "terminacion90" | "centena";

export const MODOS_REDONDEO: { valor: ModoRedondeo; etiqueta: string; ejemplo: string }[] = [
  { valor: "ninguno", etiqueta: "Sin redondeo", ejemplo: "1.234 → 1.234" },
  { valor: "decena", etiqueta: "A la decena", ejemplo: "1.234 → 1.240" },
  { valor: "terminacion90", etiqueta: "Terminado en 90", ejemplo: "1.234 → 1.290" },
  { valor: "centena", etiqueta: "A la centena", ejemplo: "1.234 → 1.300" },
];

/**
 * Corrige el error de coma flotante antes de redondear hacia arriba.
 *
 * Sin esto `Math.ceil(1290.0000000001)` devuelve 1291 y el precio sugerido
 * queda un peso por encima del que se acaba de guardar, así que la pantalla
 * marca como "desactualizado" un precio recién revisado.
 */
function techo(valor: number): number {
  return Math.ceil(Number(valor.toFixed(6)));
}

/** ¿Es un número real y utilizable en un cálculo de dinero? */
function esFinito(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isFinite(valor);
}

/** Quita el IVA: de precio con IVA a precio neto. */
export function aNeto(bruto: number, tasa: number = TASA_IVA): number | null {
  if (!esFinito(bruto) || !esFinito(tasa) || tasa <= -100) return null;
  return bruto / (1 + tasa / 100);
}

/** Agrega el IVA: de precio neto a precio con IVA. */
export function aBruto(neto: number, tasa: number = TASA_IVA): number | null {
  if (!esFinito(neto) || !esFinito(tasa) || tasa <= -100) return null;
  return neto * (1 + tasa / 100);
}

/**
 * Precio de venta que deja el margen pedido sobre el costo con IVA.
 *
 * Devuelve `null` cuando el margen no admite solución: con margen 1 (100%) el
 * precio sería infinito. Es preferible a devolver `Infinity` y que termine
 * guardado en la base como precio de venta.
 */
export function precioSugerido(
  costoBruto: number,
  margen: number = MARGEN_POR_DEFECTO
): number | null {
  if (!esFinito(costoBruto) || !esFinito(margen)) return null;
  if (costoBruto < 0) return null;
  if (margen < 0 || margen >= 1) return null;
  return costoBruto / (1 - margen);
}

/**
 * Margen real que deja hoy un producto al precio que tiene puesto.
 *
 * Esta es la pregunta que el proyecto no podía responder: no "a cuánto debería
 * venderlo" sino "cuánto me está dejando el precio que ya tiene". Puede ser
 * negativo — vender bajo el costo — y ese caso es exactamente el que hay que
 * poder ver.
 */
export function margenReal(precioVenta: number, costoBruto: number): number | null {
  if (!esFinito(precioVenta) || !esFinito(costoBruto)) return null;
  if (precioVenta <= 0) return null;
  return (precioVenta - costoBruto) / precioVenta;
}

/**
 * Redondeo comercial, siempre hacia arriba.
 *
 * `terminacion90` busca el siguiente valor terminado en 90 (990, 1.090, 1.190…),
 * que es como se rotula en el local.
 */
export function redondear(valor: number, modo: ModoRedondeo = "decena"): number | null {
  if (!esFinito(valor)) return null;
  if (valor <= 0) return 0;

  switch (modo) {
    case "ninguno":
      return techo(valor);
    case "decena":
      return techo(valor / 10) * 10;
    case "centena":
      return techo(valor / 100) * 100;
    case "terminacion90":
      return techo((valor - 90) / 100) * 100 + 90;
    default:
      return techo(valor);
  }
}

/** Variación relativa de un costo respecto del anterior. `0.12` = subió 12%. */
export function variacionCosto(costoAnterior: number, costoNuevo: number): number | null {
  if (!esFinito(costoAnterior) || !esFinito(costoNuevo)) return null;
  if (costoAnterior <= 0) return null;
  return (costoNuevo - costoAnterior) / costoAnterior;
}

/** ¿La variación de costo es suficiente para mandar el precio a revisión? */
export function requiereRevision(
  costoAnterior: number,
  costoNuevo: number,
  umbral: number = UMBRAL_REVISION_COSTO
): boolean {
  const variacion = variacionCosto(costoAnterior, costoNuevo);
  if (variacion === null) return false;
  return Math.abs(variacion) >= umbral;
}

export type EntradaPrecio = {
  /** Costo del proveedor SIN IVA, tal como se guarda en la base. */
  costoNeto: number;
  tasa?: number;
  margen?: number;
  redondeo?: ModoRedondeo;
};

export type PrecioCalculado = {
  costoNeto: number;
  costoBruto: number | null;
  margen: number;
  /** Precio que deja el margen pedido, sin redondear. */
  sugeridoExacto: number | null;
  /** El que se propone en pantalla: redondeado hacia arriba. */
  sugerido: number | null;
};

/**
 * Del costo del proveedor al precio propuesto, en un solo paso.
 *
 * Existe para que ninguna pantalla vuelva a encadenar las fórmulas por su
 * cuenta: pide esto y muestra lo que devuelve.
 */
export function calcularPrecio(entrada: EntradaPrecio): PrecioCalculado {
  const tasa = entrada.tasa ?? TASA_IVA;
  const margen = entrada.margen ?? MARGEN_POR_DEFECTO;
  const costoBruto = aBruto(entrada.costoNeto, tasa);
  const sugeridoExacto = costoBruto === null ? null : precioSugerido(costoBruto, margen);

  return {
    costoNeto: entrada.costoNeto,
    costoBruto,
    margen,
    sugeridoExacto,
    sugerido:
      sugeridoExacto === null ? null : redondear(sugeridoExacto, entrada.redondeo ?? "decena"),
  };
}

export type DiagnosticoPrecio = PrecioCalculado & {
  precioVenta: number;
  margenActual: number | null;
  /** Se vende por debajo de lo que cuesta comprarlo. */
  bajoCosto: boolean;
  /** Deja menos de lo que pide la regla de su categoría. */
  bajoMargen: boolean;
  /** Diferencia entre el precio propuesto y el que tiene puesto. */
  diferencia: number | null;
};

/**
 * Qué deja realmente un producto al precio que tiene, y qué habría que hacer.
 *
 * Es la fila de la pantalla de precios: los cinco filtros previstos (bajo
 * margen, sin costo, vendiendo bajo el costo, sin revisar, costo cambió) se
 * responden con estos campos.
 */
export function diagnosticarPrecio(
  entrada: EntradaPrecio & { precioVenta: number }
): DiagnosticoPrecio {
  const calculado = calcularPrecio(entrada);
  const margenActual =
    calculado.costoBruto === null
      ? null
      : margenReal(entrada.precioVenta, calculado.costoBruto);

  return {
    ...calculado,
    precioVenta: entrada.precioVenta,
    margenActual,
    bajoCosto: calculado.costoBruto !== null && entrada.precioVenta < calculado.costoBruto,
    bajoMargen: margenActual !== null && margenActual < calculado.margen,
    diferencia: calculado.sugerido === null ? null : calculado.sugerido - entrada.precioVenta,
  };
}

export type AvisoCosto = {
  /** `bajo-costo` pierde plata en cada venta; `bajo-margen` sólo deja poco. */
  nivel: "bajo-costo" | "bajo-margen";
  mensaje: string;
  costoBruto: number;
  margenActual: number | null;
  sugerido: number | null;
};

/**
 * El aviso que hay que dar en el momento de cargar un costo.
 *
 * La pantalla de Precios ya sabe listar lo que se vende bajo costo, pero es un
 * informe: hay que acordarse de abrirlo. Los seis productos que se estaban
 * vendiendo a pérdida en agosto de 2026 llevaban meses así, y ninguno se
 * detectó desde el panel — aparecieron midiendo el catálogo para otra cosa.
 * Este aviso pone el hallazgo donde se origina el problema: la casilla donde
 * alguien acaba de escribir el costo.
 *
 * Devuelve `null` cuando no hay nada que decir. **No bloquea**: un precio bajo
 * el costo puede ser deliberado —una liquidación, un producto gancho— y quien
 * carga el costo no siempre es quien decide el precio. Avisar y dejar pasar es
 * lo correcto; impedirlo obligaría a inventar un rodeo.
 *
 * Es la misma cuenta que hace la pantalla de Precios, por `diagnosticarPrecio`,
 * para que las dos no puedan discrepar.
 */
export function avisoPorCosto(entrada: {
  precioVenta: number;
  costoNeto: number;
  tasa?: number;
  margen?: number;
  redondeo?: ModoRedondeo;
}): AvisoCosto | null {
  // Sin precio de venta no hay margen que juzgar: el producto todavía no se
  // vende, y decir "está bajo costo" sería inventar un problema.
  if (!esFinito(entrada.precioVenta) || entrada.precioVenta <= 0) return null;
  if (!esFinito(entrada.costoNeto) || entrada.costoNeto <= 0) return null;

  const d = diagnosticarPrecio(entrada);
  if (d.costoBruto === null) return null;

  const base = {
    costoBruto: d.costoBruto,
    margenActual: d.margenActual,
    sugerido: d.sugerido,
  };

  if (d.bajoCosto) {
    return {
      ...base,
      nivel: "bajo-costo",
      mensaje:
        `Se vende a ${pesos(entrada.precioVenta)} y cuesta ${pesos(d.costoBruto)} con IVA: ` +
        `se pierde ${pesos(d.costoBruto - entrada.precioVenta)} en cada unidad.` +
        (d.sugerido !== null ? ` Para el margen de la categoría habría que cobrar ${pesos(d.sugerido)}.` : ""),
    };
  }

  if (d.bajoMargen) {
    return {
      ...base,
      nivel: "bajo-margen",
      mensaje:
        `Con este costo deja ${formatearMargen(d.margenActual)}, por debajo del ` +
        `${formatearMargen(d.margen)} de su categoría.` +
        (d.sugerido !== null ? ` El precio para ese margen sería ${pesos(d.sugerido)}.` : ""),
    };
  }

  return null;
}

/** Pesos chilenos con separador de miles, sin decimales: `1234` → `"$1.234"`. */
function pesos(valor: number): string {
  return `$${Math.round(valor).toLocaleString("es-CL")}`;
}

/** Formatea un margen como porcentaje legible: `0.352` → `"35,2%"`. */
export function formatearMargen(margen: number | null): string {
  if (margen === null || !esFinito(margen)) return "—";
  return `${(margen * 100).toFixed(1).replace(".", ",")}%`;
}

export type CampoCosto = "conIva" | "sinIva";

export type CostoProveedorDerivado = {
  /** Lo que se escribe en el campo "con IVA", con dos decimales. */
  conIva: string;
  /** Lo que se escribe en el campo "sin IVA": es el valor que se guarda. */
  sinIva: string;
  /** Precio de venta propuesto, en pesos enteros. Vacío si no se puede calcular. */
  sugerido: string;
};

/**
 * Los dos campos de costo del formulario de producto, sincronizados.
 *
 * Las pantallas de producto tienen dos casillas —costo con IVA y sin IVA— y el
 * usuario teclea en cualquiera de las dos. Este cálculo estaba copiado literal
 * en `productos/nuevo` y `productos/[id]`, con los factores `1.19` y `0.65`
 * escritos a mano en cuatro sitios: cambiar el margen obligaba a acordarse de
 * los cuatro.
 *
 * El redondeo por defecto es `"ninguno"` (sube al peso entero). Cuando la
 * pantalla de precios pase a leer el modo de `category_margins`, basta con
 * pasarlo por parámetro.
 */
export function derivarCostoProveedor(
  campo: CampoCosto,
  valor: string,
  opciones: { tasa?: number; margen?: number; redondeo?: ModoRedondeo } = {}
): CostoProveedorDerivado | null {
  const numero = parseFloat(valor);
  if (!Number.isFinite(numero)) return null;

  const tasa = opciones.tasa ?? TASA_IVA;
  const conIva = campo === "conIva" ? numero : aBruto(numero, tasa);
  const sinIva = campo === "conIva" ? aNeto(numero, tasa) : numero;
  if (conIva === null || sinIva === null) return null;

  const sugerido = precioSugerido(conIva, opciones.margen ?? MARGEN_POR_DEFECTO);
  const redondeado = sugerido === null ? null : redondear(sugerido, opciones.redondeo ?? "ninguno");

  return {
    // El campo que el usuario está escribiendo se devuelve tal cual: reformatearlo
    // mientras teclea le borraría los decimales a medio escribir.
    conIva: campo === "conIva" ? valor : conIva.toFixed(2),
    sinIva: campo === "sinIva" ? valor : sinIva.toFixed(2),
    sugerido: redondeado === null ? "" : String(redondeado),
  };
}

/**
 * De dónde salió el costo unitario que muestra una pantalla.
 *
 * `/api/admin/suppliers/[id]/products` devuelve un solo campo de costo, pero
 * ese campo tiene dos orígenes posibles: el costo que ESE proveedor tiene
 * cargado, o —cuando no tiene— el de la ficha del producto, que es heredado y
 * puede venir de otro proveedor o de nadie. La API distingue los dos casos en
 * `cost_source`.
 */
export type OrigenCosto = "supplier" | "product";

/**
 * ¿El costo que se está mostrando NO es el de este proveedor?
 *
 * Cotizar un pedido con el costo de otro proveedor como si fuera el de éste
 * produce un pedido que la factura no va a respetar — y, peor, un documento de
 * control que ya no controla nada, porque la diferencia parece un error del
 * proveedor en vez de un dato propio equivocado.
 *
 * Cuando el origen no viene informado se responde `false` a propósito: sin
 * saberlo no se puede afirmar que el costo esté heredado, y marcar de más
 * enseña a ignorar la marca.
 */
export function esCostoHeredado(dato: {
  cost_source?: OrigenCosto | string | null;
  purchase_price?: number | null;
}): boolean {
  if (dato?.cost_source !== "product") return false;
  return Number(dato?.purchase_price) > 0;
}
