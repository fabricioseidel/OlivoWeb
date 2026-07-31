/**
 * Quién paga el envío inmediato de Uber Direct.
 *
 * Regla del dueño: en pedidos desde $35.000 cuya tarifa de Uber sea inferior a
 * $5.000, el envío lo paga la tienda. En cualquier otro caso lo paga el
 * cliente, a tarifa completa.
 *
 * Vive separado del cliente HTTP para poder probarlo sin tocar la red: es la
 * regla que decide cuánto se le cobra a alguien, así que conviene que sea
 * aburrida y verificable.
 */

/** Subtotal mínimo para que se ofrezca el envío inmediato. */
export const EXPRESS_MIN_SUBTOTAL = 9990;

/** Desde este subtotal la tienda puede absorber la tarifa. */
export const EXPRESS_SUBSIDY_MIN_SUBTOTAL = 35000;

/** Tarifa máxima que la tienda absorbe. Por encima, la paga el cliente. */
export const EXPRESS_SUBSIDY_MAX_FEE = 5000;

export type ExpressPricing = {
  /** Lo que se le cobra al cliente, en CLP. */
  price: number;
  /** Lo que cobra Uber por el envío, en CLP. */
  uberFee: number;
  /** La tienda absorbe la tarifa. */
  paidByStore: boolean;
};

/**
 * Aplica la regla de subsidio.
 *
 * Los límites son inclusivo por abajo ("desde $35.000") y estricto por arriba
 * ("inferior a $5.000"), igual que como se enunció: una tarifa de exactamente
 * $5.000 la paga el cliente.
 */
export function quoteExpress(params: { uberFee: number; subtotal: number }): ExpressPricing {
  const uberFee = Math.max(0, Math.round(params.uberFee));

  const laPagaLaTienda =
    params.subtotal >= EXPRESS_SUBSIDY_MIN_SUBTOTAL && uberFee < EXPRESS_SUBSIDY_MAX_FEE;

  return {
    price: laPagaLaTienda ? 0 : uberFee,
    uberFee,
    paidByStore: laPagaLaTienda,
  };
}

/** ¿El carrito alcanza el mínimo para que se ofrezca envío inmediato? */
export function alcanzaMinimoExpress(subtotal: number): boolean {
  return subtotal >= EXPRESS_MIN_SUBTOTAL;
}
