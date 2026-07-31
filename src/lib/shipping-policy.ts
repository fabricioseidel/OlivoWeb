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

/** Comunas aledañas: las que acceden al envío gratis por monto. */
export const COMUNAS_CON_DESPACHO: ComunaSlug[] = BUSINESS.comunas.map((c) => c.slug);

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
};

/**
 * Calcula el costo de despacho aplicando, en orden:
 *  1. Envío gratis si el subtotal alcanza el mínimo y la comuna tiene cobertura.
 *  2. Tope por comuna (Ñuñoa y Macul).
 *
 * Si no se puede determinar la comuna, se cobra la tarifa por distancia sin
 * tope: es el comportamiento conservador, nunca cobra de menos por error.
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
}): ShippingQuote {
  const { rawPrice, subtotal, ciudad, freeShippingMinimum } = params;
  const comuna = comunaToSlug(ciudad);
  const base = Math.max(0, Math.round(rawPrice));

  // 1. Envío gratis por monto, solo en comunas con cobertura
  const aplicaGratis =
    freeShippingMinimum !== null &&
    subtotal >= freeShippingMinimum &&
    comuna !== null &&
    COMUNAS_CON_DESPACHO.includes(comuna);

  if (aplicaGratis) {
    return { price: 0, rawPrice: base, freeApplied: true, capApplied: false, comuna };
  }

  // 2. Tope por comuna
  const tope = comuna ? TOPE_POR_COMUNA[comuna] : undefined;
  if (typeof tope === "number" && base > tope) {
    return { price: tope, rawPrice: base, freeApplied: false, capApplied: true, comuna };
  }

  return { price: base, rawPrice: base, freeApplied: false, capApplied: false, comuna };
}
