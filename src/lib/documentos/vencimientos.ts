/**
 * Vencimientos tributarios y previsionales: cuándo hay que pagar qué.
 *
 * - F29 (IVA, PPM y retenciones): día 20 del mes siguiente, porque la
 *   empresa emite documentos electrónicos y declara y paga por internet. Quien
 *   declara en papel tiene hasta el 12 — no es este caso. Si el 20 cae sábado,
 *   domingo o feriado, se corre al siguiente día hábil.
 * - Previred (imposiciones): día 13 del mes siguiente pagando en línea, y
 *   este plazo NO se corre: vence el 13 "aun cuando fuere sábado, domingo o
 *   festivo" (DL 3.500, art. 19). El que se corre es el del día 10, que es el
 *   de quien paga presencial. Por eso, cuando el 13 no es hábil, se sugiere
 *   pagar el día hábil anterior: una transferencia de fin de semana puede no
 *   alcanzar a llegar.
 * - Patente municipal de Ñuñoa: dos cuotas, 31 de enero y 31 de julio.
 * - Operación Renta (F22): 30 de abril.
 *
 * Todo trabaja con fechas "YYYY-MM-DD" del calendario chileno, sin horas:
 * así el servidor (UTC) y el navegador (Chile) calculan el mismo día.
 */

import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

const ZONA_CHILE = "America/Santiago";

/** La fecha de hoy en Chile, "YYYY-MM-DD". En Vercel el reloj corre en UTC. */
export function hoyEnChile(ahora: Date = new Date()): string {
  return formatInTimeZone(ahora, ZONA_CHILE, "yyyy-MM-dd");
}

/**
 * Feriados nacionales con fecha ya trasladada según la ley.
 *
 * Es una lista y no un cálculo porque varios se mueven por reglas que cambian
 * con leyes nuevas (San Pedro y San Pablo, Encuentro de Dos Mundos, Iglesias
 * Evangélicas, interferiados) y otros se decretan (elecciones). 2026 está
 * verificado; 2027 es la proyección por las reglas de traslado vigentes.
 *
 * // TODO-HUMANO: cada diciembre, revisar los feriados del año siguiente en
 * feriados.cl o el Diario Oficial y agregarlos aquí (incluidos interferiados
 * y días de elecciones). Un feriado que falta hace que el sistema anuncie un
 * vencimiento un día antes de lo real — nunca después, que es el error que
 * saldría caro.
 */
export const FERIADOS: ReadonlySet<string> = new Set([
  // 2026
  "2026-01-01", "2026-04-03", "2026-04-04", "2026-05-01", "2026-05-21",
  "2026-06-21", "2026-06-29", "2026-07-16", "2026-08-15", "2026-09-18",
  "2026-09-19", "2026-10-12", "2026-10-31", "2026-11-01", "2026-12-08",
  "2026-12-25",
  // 2027 (proyección)
  "2027-01-01", "2027-03-26", "2027-03-27", "2027-05-01", "2027-05-21",
  "2027-06-21", "2027-06-28", "2027-07-16", "2027-08-15", "2027-09-18",
  "2027-09-19", "2027-10-11", "2027-10-31", "2027-11-01", "2027-12-08",
  "2027-12-25",
]);

/** "YYYY-MM-DD" → Date a mediodía UTC, para que ningún huso cambie el día. */
function aFecha(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

function aIso(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}

export function sumarDias(iso: string, dias: number): string {
  const f = aFecha(iso);
  f.setUTCDate(f.getUTCDate() + dias);
  return aIso(f);
}

export function esDiaHabil(iso: string, feriados: ReadonlySet<string> = FERIADOS): boolean {
  const dia = aFecha(iso).getUTCDay();
  return dia !== 0 && dia !== 6 && !feriados.has(iso);
}

/** El mismo día si es hábil; si no, el siguiente que lo sea. */
export function siguienteDiaHabil(iso: string, feriados: ReadonlySet<string> = FERIADOS): string {
  let actual = iso;
  // Tope defensivo: no existen 15 días seguidos inhábiles en Chile.
  for (let i = 0; i < 15 && !esDiaHabil(actual, feriados); i++) {
    actual = sumarDias(actual, 1);
  }
  return actual;
}

/** Período tributario "YYYY-MM". */
export type Periodo = string;

export function periodoDeFecha(iso: string): Periodo {
  return iso.slice(0, 7);
}

export function periodoSiguiente(periodo: Periodo, meses = 1): Periodo {
  const [a, m] = periodo.split("-").map(Number);
  const total = a * 12 + (m - 1) + meses;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/**
 * Instantes UTC donde empieza y termina un mes chileno: `[desde, hasta)`.
 * Para filtrar ventas por `ts` sin perder las de la última noche del mes.
 */
export function limitesPeriodo(periodo: Periodo): { desde: string; hasta: string } {
  return {
    desde: fromZonedTime(`${periodo}-01T00:00:00`, ZONA_CHILE).toISOString(),
    hasta: fromZonedTime(`${periodoSiguiente(periodo)}-01T00:00:00`, ZONA_CHILE).toISOString(),
  };
}

export function esPeriodo(valor: unknown): valor is Periodo {
  return typeof valor === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(valor);
}

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** "2026-09" → "septiembre 2026". */
export function nombrePeriodo(periodo: Periodo): string {
  const [a, m] = periodo.split("-").map(Number);
  return `${MESES[m - 1]} ${a}`;
}

/** Día de vencimiento de un mes, ya corrido al día hábil. */
function venceEl(periodoPago: Periodo, dia: number, feriados: ReadonlySet<string>): string {
  return siguienteDiaHabil(`${periodoPago}-${String(dia).padStart(2, "0")}`, feriados);
}

/** El F29 del período se paga el 20 del mes siguiente (o el hábil que siga). */
export function vencimientoF29(periodo: Periodo, feriados: ReadonlySet<string> = FERIADOS): string {
  return venceEl(periodoSiguiente(periodo), 20, feriados);
}

/** Las imposiciones del período vencen el 13 del mes siguiente, sea o no hábil. */
export function vencimientoPrevired(periodo: Periodo): string {
  return `${periodoSiguiente(periodo)}-13`;
}

/** El mismo día si es hábil; si no, el hábil anterior. */
export function diaHabilAnterior(iso: string, feriados: ReadonlySet<string> = FERIADOS): string {
  let actual = iso;
  for (let i = 0; i < 15 && !esDiaHabil(actual, feriados); i++) {
    actual = sumarDias(actual, -1);
  }
  return actual;
}

export type TipoObligacion = "F29" | "PREVIRED" | "PATENTE" | "F22";

export type Obligacion = {
  tipo: TipoObligacion;
  /** Período que se declara o paga. Para patente y renta, el del vencimiento. */
  periodo: Periodo;
  vence: string;
  titulo: string;
  detalle: string;
  /** Si el vencimiento no es día hábil y no se corre, cuándo conviene pagar. */
  pagarAntesDel?: string;
};

export const TITULOS_OBLIGACION: Record<TipoObligacion, string> = {
  F29: "IVA y PPM (F29)",
  PREVIRED: "Imposiciones (Previred)",
  PATENTE: "Patente municipal",
  F22: "Operación Renta (F22)",
};

/**
 * Obligaciones cuyo vencimiento cae entre `desde` y `hasta` (ambos inclusive),
 * ordenadas por fecha.
 */
export function obligacionesEntre(
  desde: string,
  hasta: string,
  feriados: ReadonlySet<string> = FERIADOS,
): Obligacion[] {
  const lista: Obligacion[] = [];
  // Se recorren los períodos cuyo pago puede caer en el rango: el mes anterior
  // a `desde` hasta el mes de `hasta`.
  let periodo = periodoSiguiente(periodoDeFecha(desde), -1);
  const ultimo = periodoDeFecha(hasta);
  while (periodo <= ultimo) {
    lista.push({
      tipo: "F29",
      periodo,
      vence: vencimientoF29(periodo, feriados),
      titulo: TITULOS_OBLIGACION.F29,
      detalle: `IVA, PPM y retenciones de ${nombrePeriodo(periodo)}. Se declara aunque no haya movimiento.`,
    });
    const previred = vencimientoPrevired(periodo);
    lista.push({
      tipo: "PREVIRED",
      periodo,
      vence: previred,
      titulo: TITULOS_OBLIGACION.PREVIRED,
      detalle: `Cotizaciones de las remuneraciones de ${nombrePeriodo(periodo)}.`,
      ...(esDiaHabil(previred, feriados) ? {} : { pagarAntesDel: diaHabilAnterior(previred, feriados) }),
    });

    const [anio, mes] = periodo.split("-").map(Number);
    if (mes === 1 || mes === 7) {
      lista.push({
        tipo: "PATENTE",
        periodo,
        vence: siguienteDiaHabil(`${periodo}-31`, feriados),
        titulo: TITULOS_OBLIGACION.PATENTE,
        detalle: `${mes === 1 ? "Primera" : "Segunda"} cuota de la patente comercial, Municipalidad de Ñuñoa.`,
      });
    }
    if (mes === 4) {
      lista.push({
        tipo: "F22",
        periodo,
        vence: siguienteDiaHabil(`${anio}-04-30`, feriados),
        titulo: TITULOS_OBLIGACION.F22,
        detalle: `Declaración anual de impuesto a la renta del año comercial ${anio - 1}.`,
      });
    }
    periodo = periodoSiguiente(periodo);
  }
  return lista
    .filter((o) => o.vence >= desde && o.vence <= hasta)
    .sort((a, b) => a.vence.localeCompare(b.vence) || a.tipo.localeCompare(b.tipo));
}

/** Días corridos entre dos fechas "YYYY-MM-DD" (negativo si `hasta` ya pasó). */
export function diasEntre(desde: string, hasta: string): number {
  return Math.round((aFecha(hasta).getTime() - aFecha(desde).getTime()) / 86_400_000);
}

export type Urgencia = "vencido" | "urgente" | "proximo" | "tranquilo";

/** Semáforo: vencido, 3 días o menos, 7 días o menos, o con tiempo. */
export function urgencia(hoy: string, vence: string): Urgencia {
  const dias = diasEntre(hoy, vence);
  if (dias < 0) return "vencido";
  if (dias <= 3) return "urgente";
  if (dias <= 7) return "proximo";
  return "tranquilo";
}

/** "vence hoy", "vence mañana", "vence en 5 días", "venció hace 2 días". */
export function textoPlazo(hoy: string, vence: string): string {
  const dias = diasEntre(hoy, vence);
  if (dias === 0) return "vence hoy";
  if (dias === 1) return "vence mañana";
  if (dias > 1) return `vence en ${dias} días`;
  if (dias === -1) return "venció ayer";
  return `venció hace ${-dias} días`;
}

/** "2026-10-20" → "20-10-2026", el formato en que se leen las fechas en Chile. */
export function fechaCorta(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}-${m}-${a}`;
}
