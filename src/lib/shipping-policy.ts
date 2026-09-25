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

/** Comunas aledañas: las que publicamos como zona de reparto. */
export const COMUNAS_CON_DESPACHO: ComunaSlug[] = BUSINESS.comunas.map((c) => c.slug);

/**
 * Radio de reparto por defecto, en kilómetros.
 *
 * Es el respaldo cuando la configuración de la tienda no trae un radio propio
 * (`settings.shipping_max_distance_km`, editable desde el admin). La distancia
 * con la que se compara ya viene ajustada por el factor de calles (×1.3) del
 * cálculo Haversine, así que 6 km de recorrido son unos 4,6 en línea recta.
 *
 * Bajó de 8 a 6 el 2026-08-28: 8 km era el alcance que se publicaba, pero el
 * reparto lo hace una persona en una ronda con horario de salida fijo, y a esa
 * distancia una sola entrega se come la ronda entera.
 */
export const RADIO_DESPACHO_KM_DEFAULT = 6;

/**
 * Cuánto más largo es el recorrido real que la línea recta.
 *
 * Las distancias del despacho se calculan con Haversine —que da la línea
 * recta— y se multiplican por este factor para acercarse a lo que realmente
 * se maneja por calle. Todos los radios de esta sección están expresados en
 * esa distancia ajustada, así que 6 km de radio son unos 4,6 en línea recta.
 *
 * Vive acá porque estaba copiado en dos rutas de API y en ninguna de las dos
 * se veía que el número tenía que ser el mismo: si una se corrige y la otra
 * no, el checkout cobra por una distancia y valida contra otra.
 */
export const FACTOR_CALLES = 1.3;

/**
 * Radio dentro del cual el despacho propio cuesta la tarifa plana.
 *
 * Es el corazón de la opción agendada: cerca del local la ronda no se alarga
 * de forma apreciable, así que cobrar por kilómetro no recauda más y sólo
 * complica el precio. Pasado este radio la ronda sí se estira, y ahí vuelve a
 * mandar el cálculo por distancia.
 */
export const RADIO_ZONA_PLANA_KM = 2;

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

// ── Envío agendado: el reparto que hace el dueño ─────────────────────────────

/**
 * Tarifa plana del despacho propio dentro de la zona cercana, en CLP.
 *
 * Es plana a propósito y no sale de la fórmula por distancia: dentro de los
 * primeros kilómetros el reparto va en una ronda única, así que el costo
 * marginal de una dirección más es casi cero.
 */
export const TARIFA_ZONA_PLANA_CLP = 1500;

export type AgendadoQuote = {
  /** Si es `false`, la modalidad no se ofrece: queda fuera del alcance. */
  disponible: boolean;
  /** Precio final a cobrar, en CLP. */
  price: number;
  /** Tarifa antes del envío gratis, para poder tacharla en la tarjeta. */
  rawPrice: number;
  freeApplied: boolean;
  /** `true` si se aplicó la tarifa plana en vez del cálculo por distancia. */
  tarifaPlana: boolean;
  comuna: ComunaSlug | null;
  distanceKm: number | null;
};

/**
 * Cotiza el despacho propio agendado, en sus dos regímenes.
 *
 * Cerca del local (`RADIO_ZONA_PLANA_KM`) cuesta la tarifa plana; más lejos
 * vuelve el cálculo por distancia, hasta el radio máximo. Pasado ese radio la
 * modalidad no existe: no hay ronda que llegue.
 *
 * El envío gratis vive acá y **no** en la cotización de Uber a propósito. Este
 * reparto lo hace el dueño, así que regalarlo cuesta bencina; regalar uno de
 * Uber cuesta lo que Uber cobre ese día, y por eso el flash tiene su propio
 * mínimo, más alto.
 *
 * Sin distancia conocida —el buscador de direcciones no siempre devuelve
 * coordenadas— se cae al nombre de la comuna para decidir si hay cobertura, y
 * se cobra la tarifa plana: es el caso degradado, y equivocarse a favor del
 * cliente es preferible a cobrarle de más por un dato que no tenemos.
 */
export function quoteAgendado(params: {
  /** Costo por distancia ya calculado: tarifa base + km × valor por km. */
  rawPrice: number;
  /** Subtotal del carrito, para evaluar el envío gratis. */
  subtotal: number;
  /** Comuna de destino (texto libre; se normaliza acá). */
  ciudad?: string | null;
  /** Monto mínimo para envío gratis en esta modalidad. `null` la desactiva. */
  freeShippingMinimum: number | null;
  /** Distancia al destino en km, ya ajustada por el factor de calles. */
  distanceKm?: number | null;
  /** Radio máximo de reparto configurado por el admin. */
  maxDistanceKm?: number | null;
  /** Radio de la tarifa plana. Se deja inyectar para poder probarlo. */
  radioZonaPlanaKm?: number;
}): AgendadoQuote {
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
      rawPrice: 0,
      freeApplied: false,
      tarifaPlana: false,
      comuna,
      distanceKm,
    };
  }

  const radioPlano =
    typeof params.radioZonaPlanaKm === "number" && params.radioZonaPlanaKm > 0
      ? params.radioZonaPlanaKm
      : RADIO_ZONA_PLANA_KM;

  // Sin distancia no se puede saber si cae en la zona plana; se asume que sí,
  // que es el lado seguro para el cliente.
  const tarifaPlana = distanceKm === null || distanceKm <= radioPlano;
  const base = tarifaPlana
    ? TARIFA_ZONA_PLANA_CLP
    : Math.max(0, Math.round(params.rawPrice));

  const gratis =
    params.freeShippingMinimum !== null && params.subtotal >= params.freeShippingMinimum;

  return {
    disponible: true,
    price: gratis ? 0 : base,
    rawPrice: base,
    freeApplied: gratis,
    tarifaPlana,
    comuna,
    distanceKm,
  };
}

/**
 * Radio en metros que hay que dibujar en un mapa para un radio de reparto dado.
 *
 * Los radios del despacho están expresados en distancia **de recorrido**: la
 * línea recta multiplicada por `FACTOR_CALLES`. Un círculo en un mapa es línea
 * recta, así que para dibujarlos hay que deshacer ese factor. Dibujar 6 km
 * redondos prometería cobertura a casi 8 km de calle, que es exactamente lo
 * que el checkout después rechaza — y un mapa que promete lo que el checkout
 * niega es peor que no publicar mapa.
 */
export function radioDibujableMetros(radioRecorridoKm: number): number {
  return (radioRecorridoKm / FACTOR_CALLES) * 1000;
}
