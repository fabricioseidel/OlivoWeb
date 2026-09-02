/**
 * Qué opciones de envío se le ofrecen al cliente, y en qué orden.
 *
 * Vive suelto y no dentro del checkout porque decide lo que el cliente ve —y
 * por lo tanto lo que puede comprar— y eso merece test propio. La primera
 * versión estaba embebida en el `useMemo` de la página con un `return`
 * temprano que ataba el flash a que el agendado estuviera disponible: una
 * dirección fuera del radio de reparto propio pero dentro de la cobertura de
 * Uber no veía ninguna opción de envío, que es precisamente el caso para el
 * que el flash existe.
 */

export type OpcionEnvio = {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  days: string;
};

export type DisponibilidadEnvio = {
  /** Reparto propio agendado, o `null` si no se pudo cotizar. */
  agendado: { disponible: boolean; price: number; rawPrice: number; freeApplied: boolean } | null;
  /** Flash por Uber, o `null` si no se pudo cotizar. */
  flash: { disponible: boolean; price: number; rawPrice: number; freeApplied: boolean } | null;
  /** Minutos estimados que informó Uber, si los informó. */
  etaFlashMin?: number | null;
  /** Texto de las ventanas del reparto propio, ya derivado de la fuente única. */
  ventanaAgendado: { semana: string; finDeSemana: string };
};

/**
 * Arma la lista, de la más rápida a la más lenta, con el retiro al final.
 *
 * Cada modalidad se evalúa por su cuenta: son independientes de verdad, y una
 * dirección puede tener flash sin agendado (más lejos que la ronda propia pero
 * dentro de Uber) o agendado sin flash (Uber caro, sin cobertura, o la tienda
 * cerrada).
 */
export function armarOpcionesDeEnvio(
  d: DisponibilidadEnvio,
  base: OpcionEnvio[]
): OpcionEnvio[] {
  const opciones: OpcionEnvio[] = [];

  if (d.flash?.disponible) {
    opciones.push({
      id: "flash",
      name: "Envío flash",
      price: d.flash.price,
      originalPrice: d.flash.freeApplied ? d.flash.rawPrice : undefined,
      days: d.etaFlashMin
        ? `Lo lleva un repartidor de Uber, llega en unos ${d.etaFlashMin} minutos.`
        : "Lo lleva un repartidor de Uber, llega en menos de una hora.",
    });
  }

  if (d.agendado?.disponible) {
    opciones.push({
      id: "agendado",
      name: "Envío a domicilio (agendado)",
      price: d.agendado.price,
      originalPrice: d.agendado.freeApplied ? d.agendado.rawPrice : undefined,
      days: `Lo llevamos nosotros: lunes a viernes de ${d.ventanaAgendado.semana}, sábados y domingos de ${d.ventanaAgendado.finDeSemana}. Se agenda desde el día siguiente.`,
    });
  }

  return [...opciones, ...base];
}
