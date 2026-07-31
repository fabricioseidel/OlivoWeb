/**
 * Bloques horarios del despacho propio.
 *
 * Fuente única para el checkout, la API de slots, la validación del pedido y
 * el texto que publican las landings. Antes había tres versiones distintas del
 * mismo dato: `ENTREGA.ventana` decía "08:00 a 14:00", la API ofrecía cuatro
 * bloques de 09:00 a 21:00, y ninguno de los dos miraba el horario real del
 * local — que cierra 20:30 entre semana y 18:00 los fines de semana.
 *
 * Los bloques se recortan al horario de atención del día: no se puede entregar
 * con el local cerrado, porque no hay quien despache.
 */

import { BUSINESS } from "@/lib/seo/business";

/** Grilla base, en minutos desde medianoche. Se recorta según el día. */
const BASE_SLOTS: { startMin: number; endMin: number }[] = [
  { startMin: 9 * 60, endMin: 12 * 60 },
  { startMin: 12 * 60, endMin: 15 * 60 },
  { startMin: 15 * 60, endMin: 18 * 60 },
  { startMin: 18 * 60, endMin: 21 * 60 },
];

/** Un bloque recortado más corto que esto no se ofrece: no alcanza a repartirse. */
const MIN_SLOT_MINUTES = 60;

/** Hora límite para pedir despacho el mismo día. */
export const SAME_DAY_CUTOFF_HOUR = 13;

/** Máximo de pedidos por bloque. */
export const MAX_ORDERS_PER_SLOT = 5;

const SCHEMA_WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export type DeliverySlot = {
  /** "HH:MM-HH:MM" — lo que se guarda en la orden. */
  id: string;
  label: string;
  startMin: number;
  endMin: number;
};

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function toHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Día de la semana de una fecha "YYYY-MM-DD".
 *
 * Se construye en UTC a propósito: para una fecha sin hora, el día del
 * calendario no depende de la zona horaria, y parsear con `new Date(str)` en
 * un servidor en UTC corre la fecha un día hacia atrás en Chile.
 */
function weekdayOf(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return SCHEMA_WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

/** Horario de atención del local para una fecha dada. `null` si está cerrado. */
export function openingHoursFor(dateStr: string): { opens: string; closes: string } | null {
  const weekday = weekdayOf(dateStr);
  const tramo = BUSINESS.openingHours.find((h) => h.dayOfWeek.includes(weekday));
  return tramo ? { opens: tramo.opens, closes: tramo.closes } : null;
}

/**
 * Bloques de entrega de una fecha, recortados al horario de atención.
 *
 * Entre semana (07:45–20:30) el último bloque queda 18:00–20:30 en vez de
 * 18:00–21:00. Los fines de semana (10:00–18:00) el primero queda 10:00–12:00
 * y el de la tarde desaparece.
 */
export function slotsForDate(dateStr: string): DeliverySlot[] {
  const horario = openingHoursFor(dateStr);
  if (!horario) return [];

  const abre = toMinutes(horario.opens);
  const cierra = toMinutes(horario.closes);

  return BASE_SLOTS.flatMap((slot) => {
    const startMin = Math.max(slot.startMin, abre);
    const endMin = Math.min(slot.endMin, cierra);
    if (endMin - startMin < MIN_SLOT_MINUTES) return [];

    const id = `${toHHMM(startMin)}-${toHHMM(endMin)}`;
    return [{ id, label: `${toHHMM(startMin)} - ${toHHMM(endMin)} hrs`, startMin, endMin }];
  });
}

/**
 * ¿Este bloque corresponde al horario guardado en una orden?
 *
 * Compara también por hora de inicio porque el recorte al horario de atención
 * cambió el final de algunos bloques ("18:00-21:00" pasó a "18:00-20:30"), y
 * los pedidos ya agendados siguen guardando el identificador viejo. Sin esto
 * esos pedidos dejarían de contar para la capacidad del bloque y se podría
 * sobrevender.
 */
export function slotMatches(slot: DeliverySlot, storedId: string | null | undefined): boolean {
  if (!storedId) return false;
  return storedId === slot.id || storedId.startsWith(`${toHHMM(slot.startMin)}-`);
}

/**
 * Regla del mismo día: después de la hora de corte no queda nada, y antes solo
 * se ofrece el último bloque de la jornada.
 */
export function sameDaySlotIsAllowed(
  slot: DeliverySlot,
  slotsDelDia: DeliverySlot[],
  currentHour: number
): boolean {
  if (currentHour >= SAME_DAY_CUTOFF_HOUR) return false;
  const ultimo = slotsDelDia[slotsDelDia.length - 1];
  return Boolean(ultimo) && slot.id === ultimo.id;
}

/**
 * Primera fecha que el checkout debe preseleccionar.
 *
 * Si hoy ya no admite despacho —pasó la hora de corte, o el local no abre—
 * devuelve el próximo día hábil. Antes el formulario preseleccionaba hoy
 * siempre, así que después de la 1 PM el cliente elegía despacho a domicilio y
 * lo primero que veía era "no hay horarios disponibles".
 */
export function firstSelectableDate(todayStr: string, currentHour: number, maxDias = 14): string {
  const slotsHoy = slotsForDate(todayStr);
  const hayHoy = slotsHoy.some((s) => sameDaySlotIsAllowed(s, slotsHoy, currentHour));
  if (hayHoy) return todayStr;

  const [y, m, d] = todayStr.split("-").map(Number);
  for (let i = 1; i <= maxDias; i++) {
    const next = new Date(Date.UTC(y, m - 1, d + i));
    const nextStr = next.toISOString().slice(0, 10);
    if (slotsForDate(nextStr).length > 0) return nextStr;
  }
  return todayStr;
}

/**
 * Margen antes del cierre en que ya no se acepta envío inmediato: el repartidor
 * tiene que alcanzar a llegar al local mientras siga habiendo alguien adentro.
 */
export const CIERRE_EXPRESS_MINUTOS_ANTES = 30;

/**
 * ¿Se puede despachar un envío inmediato en este momento?
 *
 * Sirve tanto entre semana (07:45–20:30) como los fines de semana
 * (10:00–18:00): el horario sale de `BUSINESS.openingHours`, no de una
 * constante aparte.
 */
export function admiteEnvioInmediato(dateStr: string, minutosDelDia: number): boolean {
  const horario = openingHoursFor(dateStr);
  if (!horario) return false;

  const abre = toMinutes(horario.opens);
  const cierra = toMinutes(horario.closes) - CIERRE_EXPRESS_MINUTOS_ANTES;
  return minutosDelDia >= abre && minutosDelDia <= cierra;
}

/** Rango de entrega publicable, derivado de los bloques reales. */
export function ventanaPublicable(): { semana: string; finDeSemana: string } {
  const format = (slots: DeliverySlot[]) =>
    slots.length === 0
      ? "sin despacho"
      : `${toHHMM(slots[0].startMin)} a ${toHHMM(slots[slots.length - 1].endMin)}`;

  // 2024-01-01 fue lunes y 2024-01-06 sábado: solo se usan para leer el
  // horario de cada tipo de día, no como fechas reales.
  return {
    semana: format(slotsForDate("2024-01-01")),
    finDeSemana: format(slotsForDate("2024-01-06")),
  };
}
