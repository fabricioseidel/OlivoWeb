/**
 * Qué pedidos son nuevos y en qué columna va cada uno.
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

/** Las tres etapas del tablero, en el orden en que las recorre la tienda. */
export type Etapa = "nuevos" | "preparando" | "listos";

/**
 * Normaliza el estado que llega de la base.
 *
 * Conviven las dos escrituras —inglés del código, español de cargas viejas—,
 * así que comparar contra un solo string dejaba pedidos fuera de todas las
 * columnas: existían en la base y no aparecían en ninguna parte.
 */
export function etapaDe(estado?: string): Etapa | null {
  const s = String(estado ?? "").toLowerCase().trim();
  if (s === "pending" || s === "pendiente") return "nuevos";
  if (s === "processing" || s === "procesando" || s === "preparando" || s === "en proceso")
    return "preparando";
  if (s === "shipped" || s === "enviado" || s === "en_camino") return "listos";
  // Entregado y cancelado no son etapas del tablero: el pedido ya terminó y
  // dejarlos ahí llenaría la pantalla de trabajo hecho.
  return null;
}

/** Reparte los pedidos en las tres columnas, del más viejo al más nuevo. */
export function agruparPorEtapa<T extends PedidoRecepcion>(pedidos: T[]): Record<Etapa, T[]> {
  const grupos: Record<Etapa, T[]> = { nuevos: [], preparando: [], listos: [] };
  // El más viejo primero: es una cola, y el que lleva 40 minutos esperando
  // tiene que estar arriba, no enterrado bajo los recién llegados.
  const ordenados = [...pedidos].sort(
    (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
  );
  for (const p of ordenados) {
    const etapa = etapaDe(p.estado);
    if (etapa) grupos[etapa].push(p);
  }
  return grupos;
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
 */
export function detectarNuevos<T extends PedidoRecepcion>(
  vistos: ReadonlySet<string>,
  pedidos: T[]
): T[] {
  return pedidos.filter((p) => !vistos.has(p.id) && etapaDe(p.estado) !== null);
}

/** Todos los ids que ya se conocen, para la próxima comparación. */
export function idsDe(pedidos: PedidoRecepcion[]): Set<string> {
  return new Set(pedidos.map((p) => p.id));
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

/** Minutos sobre los cuales un pedido nuevo se marca en rojo. */
export const MINUTOS_URGENTE = 10;

/** `true` si el pedido lleva demasiado tiempo sin que nadie lo toque. */
export function estaAtrasado(desde?: string, ahora = Date.now()): boolean {
  if (!desde) return false;
  return (ahora - new Date(desde).getTime()) / 60000 >= MINUTOS_URGENTE;
}
