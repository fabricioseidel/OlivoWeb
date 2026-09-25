/**
 * Plazos de vida de un pedido impago. Viven juntos porque uno depende del
 * otro: el cron de abandonados sólo es seguro si el link ya venció.
 */

/**
 * Cuánto dura un link de pago de MercadoPago desde que se emite.
 *
 * Existe para que el cron de pedidos abandonados pueda cancelar sin carrera:
 * si un link siguiera vivo, el cliente podría pagar un pedido cuyo stock y
 * cupón ya se devolvieron.
 */
export const VIGENCIA_LINK_PAGO_MS = 60 * 60 * 1000;

/**
 * Tiempo sin actividad tras el cual un pedido impago se da por abandonado.
 *
 * Tiene que ser mayor que `VIGENCIA_LINK_PAGO_MS`: emitir un link toca
 * `updated_at`, así que pasado este plazo no queda ningún link con el que
 * pagar.
 */
export const PLAZO_PEDIDO_ABANDONADO_MS = 2 * 60 * 60 * 1000;
