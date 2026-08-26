/**
 * Forma común de los diagnósticos del panel.
 *
 * La usan el diagnóstico de MercadoPago y el estado de apertura. Estaba
 * declarada dos veces —una en la ruta y otra en el componente que la pinta—,
 * así que cambiarle un campo obligaba a acordarse del otro archivo.
 */

export type CheckStatus = "ok" | "warn" | "error";

export type Check = {
  id: string;
  label: string;
  status: CheckStatus;
  /** Qué se encontró. Nunca debe contener secretos: ni tokens ni claves. */
  detail: string;
  /** Qué hacer si no está bien. */
  hint?: string;
};

/** Diagnósticos agrupados por área, para no mostrar una lista plana de veinte. */
export type CheckGroup = {
  titulo: string;
  descripcion?: string;
  checks: Check[];
};

/**
 * El peor estado de un conjunto: un solo error manda sobre cualquier cantidad
 * de aciertos. Es lo que decide el semáforo del encabezado.
 */
export function peorEstado(checks: Check[]): CheckStatus {
  if (checks.some((c) => c.status === "error")) return "error";
  if (checks.some((c) => c.status === "warn")) return "warn";
  return "ok";
}

/** Muestra los primeros `max` elementos y resume el resto, sin cortar a la mitad. */
export function resumirLista(items: string[], max = 5): string {
  if (items.length === 0) return "";
  if (items.length <= max) return items.join(", ");
  const restantes = items.length - max;
  return `${items.slice(0, max).join(", ")} y ${restantes} más`;
}
