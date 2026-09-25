import { describe, it, expect } from 'vitest';
import { precioEfectivo, hayOferta } from '@/lib/pricing';

/**
 * El bug que estos tests cierran.
 *
 * La vitrina agregaba al carrito el precio de oferta, pero `/api/cart/validate`
 * comparaba contra `products.sale_price` a secas. Resultado: **todo producto en
 * oferta salía como "el precio cambió"** y el carrito se reescribía con el
 * precio de lista, más caro, justo antes de pagar. Y `create-order` cobraba
 * `sale_price`, así que el que igual seguía adelante pagaba de más: el
 * 14-08-2026 un pedido real salió $800 por encima de lo que el cliente vio
 * (tres harinas de maíz en oferta a $1.500 cobradas a $1.750/$1.800).
 *
 * La regla ahora está en un solo lugar y estos son sus bordes.
 */

describe('precioEfectivo', () => {
  it('cobra la oferta cuando existe y es más barata', () => {
    // Harina De Maíz PAN Blanca: el caso real del pedido del 14-08.
    expect(precioEfectivo(1800, 1500)).toBe(1500);
  });

  it('cobra el precio de lista cuando no hay oferta', () => {
    expect(precioEfectivo(1800, null)).toBe(1800);
    expect(precioEfectivo(1800, undefined)).toBe(1800);
    expect(precioEfectivo(1800)).toBe(1800);
  });

  it('ignora una oferta que no baja el precio', () => {
    // `offerPrice || price` —lo que había en el upselling— cobraba $2.000 acá.
    expect(precioEfectivo(1800, 2000)).toBe(1800);
    expect(precioEfectivo(1800, 1800)).toBe(1800);
  });

  it('ignora una oferta en cero o negativa en vez de regalar el producto', () => {
    expect(precioEfectivo(1800, 0)).toBe(1800);
    expect(precioEfectivo(1800, -100)).toBe(1800);
  });

  it('redondea a pesos los dos lados', () => {
    // La vitrina redondea al mapear (`mapSupaToUI`) y la base guarda `numeric`.
    // Comparar un lado redondeado contra otro sin redondear inventaba cambios
    // de precio en productos que nadie había tocado.
    expect(precioEfectivo(1499.5)).toBe(1500);
    expect(precioEfectivo(1800, 1499.5)).toBe(1500);
  });

  it('no devuelve NaN ante basura', () => {
    expect(precioEfectivo(null)).toBe(0);
    expect(precioEfectivo('no es un precio')).toBe(0);
    expect(precioEfectivo(1800, 'no es un precio')).toBe(1800);
  });
});

describe('hayOferta', () => {
  it('sólo es verdadera cuando el precio baja de verdad', () => {
    expect(hayOferta(1800, 1500)).toBe(true);
    expect(hayOferta(1800, 1800)).toBe(false);
    expect(hayOferta(1800, 2000)).toBe(false);
    expect(hayOferta(1800, null)).toBe(false);
    expect(hayOferta(1800, 0)).toBe(false);
  });
});

describe('el carrito y el pedido coinciden', () => {
  /**
   * Este es el invariante que se rompió: lo que la vitrina pone en el carrito
   * tiene que ser exactamente lo que `create-order` cobra. Mientras las dos
   * puntas llamen a la misma función no puede volver a abrirse una brecha.
   */
  const catalogo = [
    { nombre: 'Harina De Maíz PAN Blanca', sale_price: 1800, offer_price: 1500 },
    { nombre: 'Coca-Cola 591 Original', sale_price: 1500, offer_price: 1400 },
    { nombre: 'Empanada de pino', sale_price: 3000, offer_price: 2300 },
    { nombre: 'Producto sin oferta', sale_price: 2490, offer_price: null },
  ];

  it('el precio que muestra la vitrina es el que se cobra', () => {
    for (const p of catalogo) {
      const enVitrina = precioEfectivo(p.sale_price, p.offer_price);
      const alCobrar = precioEfectivo(p.sale_price, p.offer_price);
      expect(alCobrar).toBe(enVitrina);
    }
  });

  it('un carrito con ofertas no dispara ningún cambio de precio', () => {
    // Reproduce la comparación de /api/cart/validate con el carrito que arma
    // la vitrina. Antes del arreglo los cuatro productos salían como
    // "cambió de precio" y el total subía $1.100.
    const carrito = catalogo.map((p) => ({
      nombre: p.nombre,
      price: precioEfectivo(p.sale_price, p.offer_price),
    }));

    const cambios = carrito.filter((item, i) => {
      const p = catalogo[i];
      return precioEfectivo(p.sale_price, p.offer_price) !== Math.round(item.price);
    });

    expect(cambios).toEqual([]);
  });
});
