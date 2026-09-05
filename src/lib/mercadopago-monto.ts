/**
 * Lo que MercadoPago le cobró al cliente, envío incluido.
 *
 * `transaction_amount` es **sólo la suma de los ítems**. El despacho viaja
 * aparte, en `shipping_amount`, porque la preferencia lo manda en
 * `shipments.cost` y no como una línea más.
 *
 * Comparar el total de la orden contra `transaction_amount` a secas hacía que
 * **ningún pedido con costo de envío pudiera acreditarse jamás**: el pago se
 * aprobaba, al cliente se le cobraba bien, y acá se descartaba por un
 * desajuste que no existía. En toda la historia de la tienda el único pedido
 * que llegó a marcarse pagado fue uno de retiro en tienda, con envío $0 — el
 * único caso en que las dos cifras coinciden.
 *
 * No se usa `transaction_details.total_paid_amount`, que sería lo más directo,
 * porque incluye los intereses cuando el cliente paga en cuotas: con eso la
 * comparación fallaría en el sentido contrario.
 */
export function montoCobrado(pago: {
  transaction_amount?: number | null;
  shipping_amount?: number | null;
}): number {
  return (Number(pago.transaction_amount) || 0) + (Number(pago.shipping_amount) || 0);
}
