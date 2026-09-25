/**
 * Estimación de las imposiciones del mes (lo que se paga en Previred).
 *
 * Es una ESTIMACIÓN para saber de antemano cuánta plata separar: el monto
 * real es el que calcula la planilla de Previred, y ese es el que se anota al
 * pagar. Las tasas cambian (reforma previsional, comisiones de las AFP, SIS)
 * y por eso son configurables y no constantes: los valores por defecto son
 * los vigentes a septiembre de 2026 según fuentes públicas, y la pantalla
 * pide verificarlos contra la primera planilla real.
 *
 * Lo que paga Previred es la suma de dos cosas:
 * - lo que se le DESCUENTA al trabajador de su sueldo (AFP, salud, cesantía),
 *   que el empleador retiene y entera;
 * - lo que APORTA el empleador encima del sueldo (cesantía, mutual, aporte de
 *   la reforma previsional).
 */

export type TipoContrato = "indefinido" | "plazo_fijo";

export type TasasPrevisionales = {
  /** Cotización obligatoria a la AFP, % del imponible. */
  afp: number;
  /** Salud (Fonasa o Isapre), % del imponible. */
  salud: number;
  cesantiaTrabajadorIndefinido: number;
  cesantiaEmpleadorIndefinido: number;
  cesantiaEmpleadorPlazoFijo: number;
  /** Mutual de seguridad (Ley 16.744), tasa base + adicional por riesgo. */
  mutual: number;
  /** Aporte del empleador de la reforma previsional (Ley 21.735). */
  aporteEmpleador: number;
  /** Seguro de invalidez y sobrevivencia, si la planilla lo cobra aparte. */
  sis: number;
};

/**
 * Valores por defecto a septiembre de 2026.
 *
 * - `aporteEmpleador` 3,5%: desde las remuneraciones de agosto de 2026
 *   (0,1% cuenta individual + 0,9% rentabilidad protegida + 2,5% seguro
 *   social). Según las fuentes, el 2,5% ya incluye el SIS, por eso `sis`
 *   parte en 0. Si la planilla de Previred lo muestra aparte, se ajusta.
 * - `mutual` 0,93%: tasa base (0,90% + 0,03% Ley SANNA), sin adicional.
 */
export const TASAS_POR_DEFECTO: TasasPrevisionales = {
  afp: 10,
  salud: 7,
  cesantiaTrabajadorIndefinido: 0.6,
  cesantiaEmpleadorIndefinido: 2.4,
  cesantiaEmpleadorPlazoFijo: 3.0,
  mutual: 0.93,
  aporteEmpleador: 3.5,
  sis: 0,
};

/**
 * Comisión de cada AFP, % del imponible, que se suma al 10%.
 * // TODO-HUMANO: verificar contra la planilla Previred; cambian cada tanto.
 */
export const COMISIONES_AFP: Record<string, number> = {
  Capital: 1.44,
  Cuprum: 1.44,
  Habitat: 1.27,
  Modelo: 0.58,
  PlanVital: 1.16,
  Provida: 1.45,
  Uno: 0.46,
};

export type EmpleadoImponible = {
  id?: string;
  nombre: string;
  sueldoImponible: number;
  tipoContrato: TipoContrato;
  /** Comisión de su AFP en %. Si falta, se toma la de `COMISIONES_AFP[afp]`. */
  comisionAfp?: number | null;
  afp?: string | null;
  /** Diferencia del plan Isapre sobre el 7%, en pesos. 0 si es Fonasa. */
  adicionalSalud?: number | null;
};

export type DetalleImposiciones = {
  id?: string;
  nombre: string;
  imponible: number;
  trabajador: { afp: number; salud: number; cesantia: number; total: number };
  empleador: { cesantia: number; mutual: number; aporte: number; sis: number; total: number };
  totalPrevired: number;
  /** Lo que recibe el trabajador antes de impuesto: imponible − descuentos. */
  liquidoAproximado: number;
};

const pct = (base: number, tasa: number) => Math.round((base * tasa) / 100);

export function estimarEmpleado(e: EmpleadoImponible, tasas: TasasPrevisionales = TASAS_POR_DEFECTO): DetalleImposiciones {
  const base = Math.max(0, Math.round(e.sueldoImponible || 0));
  const comision = e.comisionAfp ?? (e.afp ? COMISIONES_AFP[e.afp] ?? 0 : 0);
  const indefinido = e.tipoContrato === "indefinido";

  const trabajador = {
    afp: pct(base, tasas.afp + comision),
    salud: pct(base, tasas.salud) + Math.max(0, Math.round(e.adicionalSalud ?? 0)),
    cesantia: indefinido ? pct(base, tasas.cesantiaTrabajadorIndefinido) : 0,
    total: 0,
  };
  trabajador.total = trabajador.afp + trabajador.salud + trabajador.cesantia;

  const empleador = {
    cesantia: pct(base, indefinido ? tasas.cesantiaEmpleadorIndefinido : tasas.cesantiaEmpleadorPlazoFijo),
    mutual: pct(base, tasas.mutual),
    aporte: pct(base, tasas.aporteEmpleador),
    sis: pct(base, tasas.sis),
    total: 0,
  };
  empleador.total = empleador.cesantia + empleador.mutual + empleador.aporte + empleador.sis;

  return {
    id: e.id,
    nombre: e.nombre,
    imponible: base,
    trabajador,
    empleador,
    totalPrevired: trabajador.total + empleador.total,
    liquidoAproximado: base - trabajador.total,
  };
}

export function estimarImposiciones(empleados: EmpleadoImponible[], tasas: TasasPrevisionales = TASAS_POR_DEFECTO) {
  const detalle = empleados.map((e) => estimarEmpleado(e, tasas));
  const suma = (f: (d: DetalleImposiciones) => number) => detalle.reduce((s, d) => s + f(d), 0);
  return {
    detalle,
    imponible: suma((d) => d.imponible),
    trabajador: suma((d) => d.trabajador.total),
    empleador: suma((d) => d.empleador.total),
    totalPrevired: suma((d) => d.totalPrevired),
    /** Lo que le cuesta a la empresa el mes: sueldos + aportes del empleador. */
    costoEmpresa: suma((d) => d.imponible + d.empleador.total),
  };
}

/** Mezcla tasas guardadas (posiblemente incompletas) con las por defecto. */
export function tasasConDefecto(guardadas: Partial<TasasPrevisionales> | null | undefined): TasasPrevisionales {
  const tasas = { ...TASAS_POR_DEFECTO };
  for (const k of Object.keys(TASAS_POR_DEFECTO) as (keyof TasasPrevisionales)[]) {
    const v = guardadas?.[k];
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) tasas[k] = v;
  }
  return tasas;
}

/** Retención de boletas de honorarios por año (Ley 21.133). */
export const RETENCION_HONORARIOS: Record<number, number> = {
  2025: 14.5,
  2026: 15.25,
  2027: 16,
  2028: 17,
};

export function tasaRetencionHonorarios(anio: number): number {
  if (RETENCION_HONORARIOS[anio] != null) return RETENCION_HONORARIOS[anio];
  return anio > 2028 ? 17 : 14.5;
}
