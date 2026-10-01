/**
 * Precios de una venta del POS, recalculados en el servidor.
 *
 * La pantalla de caja manda el precio de cada producto, pero ese dato viene del
 * navegador: un catálogo cargado hace horas o una petición armada a mano
 * podrían registrar una venta a cualquier precio. El servidor toma el precio
 * vigente de la base (oferta si hay, si no el normal), y si el total que cobró
 * la pantalla no coincide, rechaza la venta para que se recargue la caja.
 *
 * El único descuento que existe en el POS es la compra de personal, con la tasa
 * fija del servidor: la que mande la pantalla no se usa.
 */

import { STAFF_DISCOUNT_RATE } from "./payments";

export type PrecioBase = { sale_price: number | null; offer_price: number | null };

export type ItemPedido = { barcode: string; qty: number; name?: string };

export type ItemCalculado = ItemPedido & { unit_price: number; subtotal: number };

export type ResultadoPrecios =
  | { ok: true; items: ItemCalculado[]; subtotal: number; descuento: number; total: number }
  | { ok: false; mensaje: string };

/** Diferencia aceptada por redondeos (productos por peso, por ejemplo). */
export const TOLERANCIA_PESOS = 1;

export function precioVigente(p: PrecioBase): number {
  const oferta = Number(p.offer_price ?? 0);
  return Math.round(oferta > 0 ? oferta : Number(p.sale_price ?? 0));
}

export function calcularPreciosVenta(
  items: ItemPedido[],
  precios: Map<string, PrecioBase>,
  opciones: { compraPersonal: boolean; totalCobrado: number },
): ResultadoPrecios {
  const calculados: ItemCalculado[] = [];
  for (const it of items) {
    const base = precios.get(it.barcode);
    if (!base) {
      return { ok: false, mensaje: `El producto ${it.name || it.barcode} ya no existe. Recarga la caja.` };
    }
    if (!(it.qty > 0)) {
      return { ok: false, mensaje: `Cantidad inválida para ${it.name || it.barcode}.` };
    }
    const unit = precioVigente(base);
    calculados.push({ ...it, unit_price: unit, subtotal: unit * it.qty });
  }

  const subtotal = calculados.reduce((s, i) => s + i.subtotal, 0);
  const descuento = opciones.compraPersonal ? Math.round(subtotal * STAFF_DISCOUNT_RATE) : 0;
  const total = Math.max(0, subtotal - descuento);

  if (Math.abs(total - opciones.totalCobrado) > TOLERANCIA_PESOS) {
    return {
      ok: false,
      mensaje: "Los precios cambiaron desde que se abrió la caja. Recarga la página y vuelve a cobrar.",
    };
  }
  return { ok: true, items: calculados, subtotal, descuento, total };
}
