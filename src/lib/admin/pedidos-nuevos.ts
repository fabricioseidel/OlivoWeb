/**
 * Qué pedidos son nuevos y en qué columna del tablero va cada uno.
 *
 * Está separado del componente porque es la regla que decide si suena la
 * alerta, y equivocarse acá se paga con un pedido que nadie atiende. Es puro:
 * se prueba sin navegador, sin audio y sin red.
 */

export type PedidoRecepcion = {
  id: string;
  estado?: string;
  paymentStatus?: string;
  createdAt?: string;
};

/**
 * Las dos etapas del tablero, en el orden en que las recorre la tienda.
 *
 * Eran tres —nuevos, preparando, listos— con "nuevos" definida como
 * `status = pending`. Pero el checkout sólo cobra por MercadoPago, y su
 * webhook, al confirmar el pago, deja el pedido en `processing`: `pending`
 * significa entonces "no pagó", nunca "paga al recibir". Con eso la primera
 * pestaña —la que abre por defecto y lleva el contador en rojo— se llenaba de
 * pedidos que no hay que preparar, mientras el pedido real aparecía en la del
 * medio sin que nada lo destacara.
 */
export type Etapa = "preparar" | "listos";

/** Estados en los que el pedido ya terminó, en las dos escrituras de la base. */
const TERMINALES = new Set([
  "delivered",
  "entregado",
  "completado",
  "completed",
  "cancelled",
  "canceled",
  "cancelado",
  "rechazado",
  "refunded",
  "reembolsado",
]);

/** `true` si el pedido está pagado y por lo tanto es trabajo de verdad. */
export function estaPagado(pedido: PedidoRecepcion): boolean {
  return String(pedido.paymentStatus ?? "").toLowerCase().trim() === "paid";
}

/**
 * Normaliza el estado que llega de la base.
 *
 * Conviven las dos escrituras —inglés del código, español de cargas viejas—,
 * así que comparar contra un solo string dejaba pedidos fuera de todas las
 * columnas: existían en la base y no aparecían en ninguna parte.
 */
function etapaDelEstado(estado?: string): Etapa | null {
  const s = String(estado ?? "").toLowerCase().trim();
  // Terminados: el pedido ya se cerró y dejarlo en el tablero llenaría la
  // pantalla de trabajo hecho.
  if (TERMINALES.has(s)) return null;
  if (s === "shipped" || s === "enviado" || s === "en_camino") return "listos";
  // Cualquier otra cosa en un pedido pagado es trabajo por hacer.
  //
  // La regla está escrita al revés a propósito: sólo desaparece lo que se
  // reconoce como terminado. Enumerar los estados "de trabajo" hacía que un
  // pedido pagado con un estado inesperado —`pending` tras cambiar sólo el
  // pago desde el panel, o una escritura que nadie previó— no saliera en
  // ninguna pestaña **ni** en el conteo de los que esperan pago: se esfumaba
  // del tablero con el dinero ya cobrado. Ante la duda se muestra.
  return "preparar";
}

/** En qué columna va un pedido, o `null` si no va en ninguna. */
export function etapaDe(pedido: PedidoRecepcion): Etapa | null {
  if (!estaPagado(pedido)) return null;
  return etapaDelEstado(pedido.estado);
}

/** Reparte los pedidos en las columnas, del más viejo al más nuevo. */
export function agruparPorEtapa<T extends PedidoRecepcion>(pedidos: T[]): Record<Etapa, T[]> {
  const grupos: Record<Etapa, T[]> = { preparar: [], listos: [] };
  // El más viejo primero: es una cola, y el que lleva 40 minutos esperando
  // tiene que estar arriba, no enterrado bajo los recién llegados.
  const ordenados = [...pedidos].sort(
    (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
  );
  for (const p of ordenados) {
    const etapa = etapaDe(p);
    if (etapa) grupos[etapa].push(p);
  }
  return grupos;
}

/**
 * Los pedidos que quedaron esperando el pago.
 *
 * No son trabajo y por eso no ocupan una pestaña ni hacen sonar nada. Se
 * cuentan aparte porque sí dicen algo: un checkout abandonado es normal, pero
 * **muchos acumulándose es el síntoma de que las confirmaciones de pago no
 * están llegando**, que es exactamente lo que pasó la noche del 2026-09-05 —el
 * `notification_url` salía al dominio raíz, que redirige— y que desde el
 * tablero no se veía por ninguna parte.
 */
export function esperandoPago<T extends PedidoRecepcion>(pedidos: T[]): T[] {
  return pedidos.filter((p) => {
    if (estaPagado(p)) return false;
    const s = String(p.estado ?? "").toLowerCase().trim();
    // Un pedido cancelado o ya cerrado sin pagar no espera nada.
    return s === "pending" || s === "pendiente";
  });
}

/**
 * Los pedidos que hay que anunciar: los que no se habían visto antes y todavía
 * necesitan que alguien haga algo.
 *
 * Se compara por id y no por cantidad. Contar pendientes fallaba de dos formas:
 * un pedido pagado entra como `processing` —MercadoPago lo marca así— y no
 * subía el conteo de pendientes, así que **el pedido que sí importa era el
 * único que no sonaba**; y si entraba uno mientras se despachaba otro, el
 * total quedaba igual y tampoco sonaba.
 *
 * Sólo suenan los pagados: la campanilla que avisa de un checkout abandonado
 * enseña a ignorar la campanilla.
 */
export function detectarNuevos<T extends PedidoRecepcion>(
  vistos: ReadonlySet<string>,
  pedidos: T[]
): T[] {
  return pedidos.filter((p) => !vistos.has(p.id) && etapaDe(p) !== null);
}

/** Todos los ids de la lista, sin filtrar. */
export function idsDe(pedidos: PedidoRecepcion[]): Set<string> {
  return new Set(pedidos.map((p) => p.id));
}

/**
 * Los ids que hay que recordar para no volver a anunciarlos.
 *
 * Sólo los que ya son trabajo. Recordarlos todos rompía la alerta entera: el
 * pedido se crea **antes** de que el cliente pague, el panel recarga cada 30
 * segundos, así que el id quedaba memorizado mientras el pedido todavía no
 * estaba pagado —correctamente en silencio— y cuando el pago llegaba uno o dos
 * minutos después ya no era nuevo. La campanilla no sonaba en ninguna compra
 * real: sólo habría sonado con un pedido que naciera pagado, que no existe.
 */
export function idsParaRecordar(pedidos: PedidoRecepcion[]): Set<string> {
  return new Set(pedidos.filter((p) => etapaDe(p) !== null).map((p) => p.id));
}

/** Cuánto lleva esperando un pedido, en texto corto. */
export function esperaEnTexto(desde?: string): string {
  if (!desde) return "—";
  const minutos = Math.floor((Date.now() - new Date(desde).getTime()) / 60000);
  if (minutos < 1) return "Recién llegado";
  if (minutos < 60) return `${minutos} min`;
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** Minutos sobre los cuales un pedido sin preparar se marca en rojo. */
export const MINUTOS_URGENTE = 10;

/** `true` si el pedido lleva demasiado tiempo sin que nadie lo toque. */
export function estaAtrasado(desde?: string, ahora = Date.now()): boolean {
  if (!desde) return false;
  return (ahora - new Date(desde).getTime()) / 60000 >= MINUTOS_URGENTE;
}
