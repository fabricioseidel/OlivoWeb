/**
 * Estados de una entrega de Uber Direct, traducidos a lo que la tienda necesita.
 *
 * Módulo puro a propósito: las reglas de "qué significa cada estado" se prueban
 * sin red ni base de datos, igual que `flash-policy`. Lo que habla con Uber vive
 * en `src/server/uber-direct.service.ts` y lo que recibe los avisos, en
 * `src/app/api/webhooks/uber/route.ts`.
 *
 * Los valores vienen del campo `status` de la entrega. Uber también manda
 * `courier_imminent` como booleano aparte —el repartidor está por llegar—, que
 * no es un estado y por eso no aparece acá.
 */

/** Estados que informa Uber. `unknown` cubre cualquiera que agreguen después. */
export type EstadoUber =
  | "pending"
  | "pickup"
  | "pickup_complete"
  | "dropoff"
  | "delivered"
  | "canceled"
  | "returned"
  | "unknown";

export type LecturaEstado = {
  /** El estado normalizado, en minúsculas. */
  estado: EstadoUber;
  /** Lo que se le muestra a la tienda y al cliente. */
  etiqueta: string;
  /**
   * A qué estado del pedido corresponde, o `null` si no lo mueve.
   *
   * Sólo se avanza el pedido cuando el repartidor efectivamente hizo algo:
   * "buscando repartidor" no es despachar, y el pedido sigue en preparación.
   */
  estadoPedido: "shipped" | "delivered" | null;
  /** `true` cuando ya no va a haber más avisos de esta entrega. */
  terminal: boolean;
  /** `true` cuando el pedido quedó pagado y sin entrega: lo resuelve la tienda. */
  necesitaAtencion: boolean;
};

const TABLA: Record<Exclude<EstadoUber, "unknown">, Omit<LecturaEstado, "estado">> = {
  pending: {
    etiqueta: "Buscando repartidor",
    estadoPedido: null,
    terminal: false,
    necesitaAtencion: false,
  },
  pickup: {
    etiqueta: "Repartidor en camino al local",
    estadoPedido: null,
    terminal: false,
    necesitaAtencion: false,
  },
  pickup_complete: {
    etiqueta: "Pedido retirado del local",
    estadoPedido: "shipped",
    terminal: false,
    necesitaAtencion: false,
  },
  dropoff: {
    etiqueta: "En camino al cliente",
    estadoPedido: "shipped",
    terminal: false,
    necesitaAtencion: false,
  },
  delivered: {
    etiqueta: "Entregado",
    estadoPedido: "delivered",
    terminal: true,
    necesitaAtencion: false,
  },
  canceled: {
    // El pedido está pagado y nadie lo va a llevar: hay que despacharlo a mano.
    etiqueta: "Entrega cancelada por Uber",
    estadoPedido: null,
    terminal: true,
    necesitaAtencion: true,
  },
  returned: {
    etiqueta: "Devuelto al local",
    estadoPedido: null,
    terminal: true,
    necesitaAtencion: true,
  },
};

/** Traduce el `status` crudo de Uber. Nunca lanza: un estado nuevo cae en `unknown`. */
export function leerEstadoUber(crudo: unknown): LecturaEstado {
  const estado = String(crudo ?? "").toLowerCase().trim();
  const fila = (TABLA as Record<string, Omit<LecturaEstado, "estado">>)[estado];
  if (!fila) {
    return {
      estado: "unknown",
      // Se muestra el crudo: es más útil que "desconocido" cuando Uber agrega
      // un estado y hay que entender qué pasó sin leer código.
      etiqueta: estado ? `Uber: ${estado}` : "Sin información de Uber",
      estadoPedido: null,
      terminal: false,
      necesitaAtencion: false,
    };
  }
  return { estado: estado as EstadoUber, ...fila };
}

/**
 * `true` si el estado nuevo es un avance sobre el que ya está guardado.
 *
 * Los avisos de Uber pueden llegar desordenados o repetidos, y sin esto un
 * `pickup` rezagado podría "desentregar" un pedido ya entregado.
 */
export function esAvance(estadoActual: unknown, estadoNuevo: unknown): boolean {
  const orden: EstadoUber[] = [
    "pending",
    "pickup",
    "pickup_complete",
    "dropoff",
    "delivered",
  ];
  const nuevo = leerEstadoUber(estadoNuevo);
  // Cancelado y devuelto pisan cualquier cosa: son el final, venga cuando venga.
  if (nuevo.estado === "canceled" || nuevo.estado === "returned") return true;
  const actual = leerEstadoUber(estadoActual);
  // Sobre un final no se vuelve atrás.
  if (actual.terminal) return false;
  const iActual = orden.indexOf(actual.estado);
  const iNuevo = orden.indexOf(nuevo.estado);
  if (iNuevo === -1) return false;
  return iNuevo > iActual;
}
