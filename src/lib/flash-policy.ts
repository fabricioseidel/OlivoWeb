/**
 * Reglas del envío flash (Uber Direct).
 *
 * Módulo puro y sin red: acá vive sólo la aritmética y las decisiones, para
 * que se puedan probar sin llamar a Uber. El cliente HTTP vive aparte, en
 * `src/server/uber-direct.service.ts`.
 *
 * Las cuatro reglas que sostiene, acordadas con el dueño:
 *
 *  1. Se cotiza dos veces —al ingresar la dirección y antes de cobrar—. Si la
 *     segunda subió poco se respeta lo que el cliente vio; si se disparó, se le
 *     avisa antes de cobrarle.
 *  2. Hay un tope sobre el cual el flash no se ofrece, para que un pico de
 *     lluvia o demanda no le muestre al cliente un envío absurdo ni deje un
 *     envío gratis en pérdida.
 *  3. No se llama a Uber con la tienda cerrada: no hay quien entregue el
 *     paquete al repartidor.
 *  4. La entrega se crea recién cuando el pago se confirma, nunca al apretar
 *     comprar — si no, un pago fallido deja un repartidor pagado al pedo.
 */

/**
 * El `fee` de Uber viene en la unidad mínima de la moneda con exponente 2 fijo,
 * aunque el peso chileno no tenga centavos.
 *
 * Medido el 2026-08-28 contra la API real: una entrega de 2 km devolvió
 * `fee: 338400` con `currency_type: "CLP"`, que son $3.384 y no $338.400. La
 * referencia de Uber describe el campo en cents, con el ejemplo `"fee": 558`
 * para USD.
 */
export const UBER_FEE_DIVISOR = 100;

/** Convierte el `fee` crudo de Uber a pesos chilenos. */
export function feeUberACLP(feeCrudo: number): number {
  return Math.round(feeCrudo / UBER_FEE_DIVISOR);
}

/**
 * Tope sobre el cual el flash no se ofrece, en CLP.
 *
 * Provisorio y deliberadamente conservador. Las cotizaciones que lo justifican
 * se tomaron un viernes a las 16:05 con buen tiempo: entre $2.953 y $4.726 en
 * Ñuñoa y Macul, con un máximo absoluto de $5.675 en San Joaquín. **Falta medir
 * en hora punta y con lluvia**, que es cuando Uber sube, así que este número
 * hay que revisarlo con datos y no dejarlo envejecer.
 *
 * Sostiene también el envío gratis: con el mínimo del flash en $40.000 y un
 * margen de catálogo de 27,5% menos la comisión de MercadoPago, un pedido
 * regalado aguanta hasta unos $9.300 de costo. Cortar en $6.500 deja el pedido
 * cómodamente en azul incluso en el peor caso admitido.
 */
export const TOPE_FLASH_CLP = 6500;

/**
 * Cuánto puede subir la segunda cotización sin volver a preguntarle al cliente.
 *
 * Por debajo de esto se le cobra lo que vio, y la diferencia la absorbe la
 * tienda: discutir $200 con alguien que ya decidió comprar cuesta más que los
 * $200. Por encima se le avisa antes de cobrar.
 */
export const MARGEN_REVALIDACION_FLASH = 0.1;

/**
 * Mínimo de envío gratis del flash, en CLP.
 *
 * Más alto que el del agendado ($30.000) porque el costo es muy distinto:
 * regalar el reparto propio cuesta bencina, regalar uno de Uber cuesta lo que
 * Uber cobre ese día. A $40.000, con margen de catálogo 27,5% menos la
 * comisión de MercadoPago, el pedido aguanta hasta unos $9.300 de envío antes
 * de perder plata — el doble del máximo medido.
 *
 * Es el valor de fábrica: si la configuración de la tienda trae uno propio,
 * manda ese.
 */
export const MINIMO_FLASH_CLP_DEFAULT = 40000;

export type FlashQuote = {
  /** Si es `false`, la opción no se muestra. `motivo` dice por qué. */
  disponible: boolean;
  /** Lo que paga el cliente, en CLP. */
  price: number;
  /** Lo que cuesta el envío antes del envío gratis. */
  rawPrice: number;
  freeApplied: boolean;
  motivo: "tienda-cerrada" | "sobre-el-tope" | "sin-cobertura" | null;
};

/**
 * Decide si el flash se ofrece y a qué precio.
 *
 * `costoUber` es lo que Uber cobra, ya convertido a pesos. `null` significa que
 * Uber no cubre esa dirección.
 */
export function quoteFlash(params: {
  costoUber: number | null;
  subtotal: number;
  /** Mínimo de envío gratis del flash. `null` desactiva la regla. */
  freeShippingMinimum: number | null;
  tiendaAbierta: boolean;
  /** Tope sobre el cual no se ofrece. Se inyecta para poder probarlo. */
  topeCLP?: number;
}): FlashQuote {
  const vacio = { price: 0, rawPrice: 0, freeApplied: false };

  // El orden importa: con la tienda cerrada no se llega ni a cotizar, así que
  // ese motivo manda por sobre los demás.
  if (!params.tiendaAbierta) {
    return { disponible: false, ...vacio, motivo: "tienda-cerrada" };
  }
  if (params.costoUber === null) {
    return { disponible: false, ...vacio, motivo: "sin-cobertura" };
  }

  const tope = typeof params.topeCLP === "number" ? params.topeCLP : TOPE_FLASH_CLP;
  if (params.costoUber > tope) {
    return { disponible: false, ...vacio, motivo: "sobre-el-tope" };
  }

  const gratis =
    params.freeShippingMinimum !== null && params.subtotal >= params.freeShippingMinimum;

  return {
    disponible: true,
    price: gratis ? 0 : params.costoUber,
    rawPrice: params.costoUber,
    freeApplied: gratis,
    motivo: null,
  };
}

export type Revalidacion = {
  /** `true` si se puede cobrar sin volver a preguntar. */
  aceptable: boolean;
  /** Lo que efectivamente se cobra. */
  precioACobrar: number;
  /** Cuánto pone la tienda de su bolsillo por respetar el precio mostrado. */
  diferenciaAbsorbida: number;
};

/**
 * Segunda cotización, justo antes de cobrar (regla 1).
 *
 * Si bajó o subió poco, se le cobra al cliente lo que vio y la tienda absorbe
 * la diferencia. Si se disparó, no se cobra: hay que avisarle.
 *
 * Que el precio mostrado mande —y no el nuevo— es a propósito: cambiarle el
 * total a alguien que ya apretó pagar es la clase de sorpresa que hace que no
 * vuelva.
 */
export function revalidarFlash(params: {
  precioMostrado: number;
  precioNuevo: number;
  margen?: number;
}): Revalidacion {
  const margen =
    typeof params.margen === "number" ? params.margen : MARGEN_REVALIDACION_FLASH;
  const techo = params.precioMostrado * (1 + margen);

  if (params.precioNuevo <= techo) {
    return {
      aceptable: true,
      precioACobrar: params.precioMostrado,
      diferenciaAbsorbida: Math.max(0, params.precioNuevo - params.precioMostrado),
    };
  }

  return {
    aceptable: false,
    precioACobrar: params.precioNuevo,
    diferenciaAbsorbida: 0,
  };
}
