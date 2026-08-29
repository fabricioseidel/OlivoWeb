/**
 * Reglas de despacho propio del minimarket.
 *
 * Fuente única para el checkout (lo que el cliente paga) y para las landings de
 * comuna (lo que publicamos). Si estas dos cosas divergen, publicamos un precio
 * que el checkout no respeta — que es peor que no publicar nada.
 *
 * Las tarifas base (tarifa fija + valor por km + monto de envío gratis) siguen
 * viviendo en la configuración de la tienda (`settings`), editable desde el
 * admin. Acá vive solo lo que la configuración no sabe expresar: el tope por
 * comuna y qué comunas cuentan como "aledañas".
 */

import { BUSINESS, type ComunaSlug } from "@/lib/seo/business";
import { SAME_DAY_CUTOFF_HOUR, ventanaPublicable } from "@/lib/delivery-slots";

/** Tope de despacho para las comunas más cercanas al local. */
export const TOPE_POR_COMUNA: Partial<Record<ComunaSlug, number>> = {
  nunoa: 1500,
  macul: 1500,
};

/** Comunas aledañas: las que publicamos como zona de reparto. */
export const COMUNAS_CON_DESPACHO: ComunaSlug[] = BUSINESS.comunas.map((c) => c.slug);

/**
 * Radio de reparto por defecto, en kilómetros.
 *
 * Es el respaldo cuando la configuración de la tienda no trae un radio propio
 * (`settings.shipping_max_distance_km`, editable desde el admin). 8 km cubre
 * las cinco comunas que publicamos midiendo desde el local, con la distancia
 * ya ajustada por el factor de calles (×1.3) del cálculo Haversine.
 */
export const RADIO_DESPACHO_KM_DEFAULT = 8;

/**
 * Ventana de entrega del despacho propio.
 *
 * Se deriva de los bloques reales del checkout (`delivery-slots`), no se
 * escribe a mano: lo que publican las landings tiene que ser exactamente lo
 * que el cliente después puede elegir al pagar.
 */
const VENTANA = ventanaPublicable();

export const ENTREGA = {
  ventana: `${VENTANA.semana} de lunes a viernes, ${VENTANA.finDeSemana} sábados y domingos`,
  /** Pedidos ingresados antes de esta hora alcanzan a salir el mismo día. */
  corteMismoDia: `${SAME_DAY_CUTOFF_HOUR}:00`,
  resumen:
    `Los pedidos ingresados antes de las ${SAME_DAY_CUTOFF_HOUR}:00 se pueden entregar el mismo día en el último bloque de la jornada. Los que entran después se agendan para el día siguiente, en el bloque de tu preferencia.`,
  retiroEnTienda:
    "El retiro en tienda se confirma por correo: te llega un aviso de «pedido listo», normalmente en menos de una hora.",
};

/** Normaliza el nombre de una comuna a su slug (sin tildes, sin ñ, en minúsculas). */
export function comunaToSlug(nombre: string | null | undefined): ComunaSlug | null {
  if (!nombre) return null;
  const norm = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita tildes (marcas diacríticas)
    .replace(/ñ/gi, "n")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");

  const match = BUSINESS.comunas.find((c) => {
    const slugNorm = c.slug;
    return norm === slugNorm || norm.includes(slugNorm) || slugNorm.includes(norm);
  });
  return match ? match.slug : null;
}

/** Radio de reparto efectivo: el que configuró el admin, o el de por defecto. */
export function radioEfectivo(maxDistanceKm?: number | null): number {
  return typeof maxDistanceKm === "number" &&
    Number.isFinite(maxDistanceKm) &&
    maxDistanceKm > 0
    ? maxDistanceKm
    : RADIO_DESPACHO_KM_DEFAULT;
}

/**
 * ¿La dirección cae dentro de la zona en la que repartimos nosotros?
 *
 * Con distancia conocida manda ella; sin ella se cae al nombre de la comuna.
 * Vive suelta —y no dentro de `quoteShipping`— porque el envío económico
 * necesita la misma respuesta: si la dirección queda fuera de la zona, no hay
 * quien la reparta y la modalidad entera no se puede ofrecer.
 */
export function dentroDeZonaDeReparto(params: {
  distanceKm?: number | null;
  comuna: ComunaSlug | null;
  maxDistanceKm?: number | null;
}): boolean {
  const distanceKm =
    typeof params.distanceKm === "number" && Number.isFinite(params.distanceKm)
      ? params.distanceKm
      : null;

  return distanceKm !== null
    ? distanceKm <= radioEfectivo(params.maxDistanceKm)
    : params.comuna !== null && COMUNAS_CON_DESPACHO.includes(params.comuna);
}

export type ShippingQuote = {
  /** Precio final a cobrar, en CLP. */
  price: number;
  /** Precio antes de aplicar tope o envío gratis (para mostrar el ahorro). */
  rawPrice: number;
  /** El pedido superó el mínimo de envío gratis. */
  freeApplied: boolean;
  /** Se aplicó el tope de la comuna. */
  capApplied: boolean;
  /** Comuna detectada, si se pudo determinar. */
  comuna: ComunaSlug | null;
  /**
   * Por qué NO se aplicó el envío gratis pese a alcanzar el monto.
   *
   * `fuera-de-rango` es el único motivo real: la dirección quedó más lejos que
   * el radio de reparto. Los dos motivos de comuna solo aparecen cuando no hay
   * distancia calculada, que es el caso degradado.
   */
  freeBlockedReason:
    | "fuera-de-rango"
    | "comuna-desconocida"
    | "comuna-sin-cobertura"
    | null;
  /** Distancia usada para decidir, si se conocía. */
  distanceKm: number | null;
};

/**
 * Calcula el costo de despacho aplicando, en orden:
 *  1. Envío gratis si el subtotal alcanza el mínimo y la dirección está dentro
 *     del radio de reparto.
 *  2. Tope por comuna (Ñuñoa y Macul).
 *
 * El criterio del envío gratis es la DISTANCIA, no el nombre de la comuna.
 * Antes exigía que el buscador de direcciones devolviera exactamente "Ñuñoa",
 * "Macul", etc.; cuando devolvía "Santiago" o "Región Metropolitana" —cosa
 * frecuente— el cliente alcanzaba el mínimo y de todas formas se le cobraba el
 * despacho. La distancia ya la calculamos nosotros con Haversine, sin depender
 * de ningún servicio externo ni de cómo venga escrito el texto de la dirección.
 *
 * El nombre de la comuna sigue usándose para el tope por comuna y como
 * respaldo cuando no hay coordenadas.
 */
export function quoteShipping(params: {
  /** Costo calculado por distancia: tarifa base + km × valor por km. */
  rawPrice: number;
  /** Subtotal del carrito, para evaluar el envío gratis. */
  subtotal: number;
  /** Comuna de la dirección de destino (texto libre; se normaliza acá). */
  ciudad?: string | null;
  /** Monto mínimo de compra para envío gratis. `null` desactiva la regla. */
  freeShippingMinimum: number | null;
  /**
   * Distancia al destino en km. Cuando viene, manda ella. Si no viene, se cae
   * al criterio antiguo por nombre de comuna.
   */
  distanceKm?: number | null;
  /** Radio de reparto configurado por el admin. */
  maxDistanceKm?: number | null;
}): ShippingQuote {
  const { rawPrice, subtotal, ciudad, freeShippingMinimum } = params;
  const comuna = comunaToSlug(ciudad);
  const base = Math.max(0, Math.round(rawPrice));

  const distanceKm =
    typeof params.distanceKm === "number" && Number.isFinite(params.distanceKm)
      ? params.distanceKm
      : null;
  const alcanzoElMonto = freeShippingMinimum !== null && subtotal >= freeShippingMinimum;

  const dentroDeZona = dentroDeZonaDeReparto({
    distanceKm,
    comuna,
    maxDistanceKm: params.maxDistanceKm,
  });

  // 1. Envío gratis por monto, dentro de la zona de reparto
  if (alcanzoElMonto && dentroDeZona) {
    return {
      price: 0, rawPrice: base, freeApplied: true, capApplied: false,
      comuna, freeBlockedReason: null, distanceKm,
    };
  }

  // Si alcanzó el monto pero no se aplicó, se registra el motivo para poder
  // explicárselo al cliente en vez de cobrarle sin más.
  const freeBlockedReason = !alcanzoElMonto
    ? null
    : distanceKm !== null
      ? ("fuera-de-rango" as const)
      : comuna === null
        ? ("comuna-desconocida" as const)
        : ("comuna-sin-cobertura" as const);

  // 2. Tope por comuna
  const tope = comuna ? TOPE_POR_COMUNA[comuna] : undefined;
  if (typeof tope === "number" && base > tope) {
    return {
      price: tope, rawPrice: base, freeApplied: false, capApplied: true,
      comuna, freeBlockedReason, distanceKm,
    };
  }

  return {
    price: base, rawPrice: base, freeApplied: false, capApplied: false,
    comuna, freeBlockedReason, distanceKm,
  };
}


// ── Envío económico ──────────────────────────────────────────────────────────

/**
 * Tarifa plana del envío económico, en CLP.
 *
 * Es plana a propósito y no sale de la fórmula por distancia: el reparto lo
 * hace el dueño en una ronda única, así que el costo marginal de una dirección
 * más dentro de la zona es casi cero. Cobrar por kilómetro un reparto que ya
 * va a salir igual sólo complica el precio sin recaudar más.
 *
 * Coincide con el viejo `TOPE_POR_COMUNA` de Ñuñoa y Macul, que era lo que en
 * la práctica ya se cobraba en esas dos comunas.
 */
export const TARIFA_ECONOMICO_CLP = 1500;

export type EconomicoQuote = {
  /** Si es `false`, la modalidad no se ofrece: no hay quien reparta ahí. */
  disponible: boolean;
  /** Precio final a cobrar, en CLP. */
  price: number;
  /** Tarifa antes del envío gratis, para poder tacharla en la tarjeta. */
  rawPrice: number;
  freeApplied: boolean;
  comuna: ComunaSlug | null;
  distanceKm: number | null;
};

/**
 * Cotiza el envío económico: tarifa plana, gratis sobre el mínimo.
 *
 * El envío gratis vive acá y **no** en la cotización de Uber a propósito. El
 * económico lo reparte el dueño, así que regalarlo cuesta bencina; regalar un
 * envío de Uber cuesta lo que Uber cobre ese día, que en un pico de demanda
 * puede superar el margen entero del pedido. Que el mínimo libere sólo esta
 * modalidad también empuja al cliente hacia la que a la tienda casi no le
 * cuesta.
 */
export function quoteEconomico(params: {
  /** Subtotal del carrito, para evaluar el envío gratis. */
  subtotal: number;
  /** Comuna de destino (texto libre; se normaliza acá). */
  ciudad?: string | null;
  /** Monto mínimo para envío gratis. `null` desactiva la regla. */
  freeShippingMinimum: number | null;
  /** Distancia al destino en km. Cuando viene, manda ella. */
  distanceKm?: number | null;
  /** Radio de reparto configurado por el admin. */
  maxDistanceKm?: number | null;
}): EconomicoQuote {
  const comuna = comunaToSlug(params.ciudad);
  const distanceKm =
    typeof params.distanceKm === "number" && Number.isFinite(params.distanceKm)
      ? params.distanceKm
      : null;

  const disponible = dentroDeZonaDeReparto({
    distanceKm,
    comuna,
    maxDistanceKm: params.maxDistanceKm,
  });

  if (!disponible) {
    return {
      disponible: false,
      price: 0,
      rawPrice: TARIFA_ECONOMICO_CLP,
      freeApplied: false,
      comuna,
      distanceKm,
    };
  }

  const gratis =
    params.freeShippingMinimum !== null && params.subtotal >= params.freeShippingMinimum;

  return {
    disponible: true,
    price: gratis ? 0 : TARIFA_ECONOMICO_CLP,
    rawPrice: TARIFA_ECONOMICO_CLP,
    freeApplied: gratis,
    comuna,
    distanceKm,
  };
}
