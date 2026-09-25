import { describe, it, expect } from 'vitest';
import { baseDescontable, precioEfectivo } from '@/lib/pricing';

/**
 * Los cupones no se acumulan con las ofertas.
 *
 * La regla la pidió el dueño con este ejemplo: una Coca-Cola lata de $1.200 con
 * oferta a $1.000 no debe llevarse además el 20% del cupón. Un producto que
 * está a precio de lista sí.
 *
 * El motivo es de margen y está medido: el catálogo deja 36,8% promedio, así
 * que un 20% sobre el precio de lista todavía deja aire. Pero una oferta ya se
 * comió parte de ese margen —hay ofertas del 23%— y apilarle el cupón encima
 * manda el producto por debajo del costo.
 */

const CATALOGO = {
  cocaLata: { precioVenta: 1200, precioOferta: 1000 },
  empanada: { precioVenta: 3000, precioOferta: 2300 },
  aceite: { precioVenta: 2490, precioOferta: null },
  arroz: { precioVenta: 1800, precioOferta: null },
};

const DESCUENTO = 0.2;

describe('base descontable', () => {
  it('deja fuera el producto en oferta y deja dentro el de precio lista', () => {
    const base = baseDescontable([
      { ...CATALOGO.cocaLata, cantidad: 1 },
      { ...CATALOGO.aceite, cantidad: 1 },
    ]);

    // Sólo el aceite entra: la Coca ya está rebajada.
    expect(base).toBe(2490);
    expect(base * DESCUENTO).toBe(498);
  });

  it('el carrito todo en oferta no descuenta nada', () => {
    const base = baseDescontable([
      { ...CATALOGO.cocaLata, cantidad: 6 },
      { ...CATALOGO.empanada, cantidad: 2 },
    ]);

    expect(base).toBe(0);
  });

  it('multiplica por la cantidad', () => {
    expect(baseDescontable([{ ...CATALOGO.aceite, cantidad: 3 }])).toBe(7470);
  });

  it('cuenta el precio de lista, no el de oferta, de lo que sí entra', () => {
    // Un producto sin oferta: lista y efectivo son el mismo número, pero que
    // coincidan no debe ser por casualidad.
    const base = baseDescontable([{ ...CATALOGO.arroz, cantidad: 2 }]);
    expect(base).toBe(3600);
    expect(base).toBe(precioEfectivo(CATALOGO.arroz.precioVenta) * 2);
  });
});

describe('el caso del dueño, número por número', () => {
  it('la Coca en oferta no se lleva el 20% encima', () => {
    const conCupon = baseDescontable([{ ...CATALOGO.cocaLata, cantidad: 1 }]) * DESCUENTO;

    expect(conCupon).toBe(0);
    // El cliente paga la oferta, ni $800 (apilado) ni $960 (20% sobre lista).
    expect(precioEfectivo(CATALOGO.cocaLata.precioVenta, CATALOGO.cocaLata.precioOferta)).toBe(1000);
  });

  it('una oferta más profunda que el cupón no se encarece', () => {
    // La empanada está 23% abajo. Calcular el 20% sobre la lista daría $2.400,
    // o sea que el cupón la dejaría MÁS CARA que los $2.300 de la oferta.
    const veinteSobreLista = CATALOGO.empanada.precioVenta * (1 - DESCUENTO);
    expect(veinteSobreLista).toBeGreaterThan(CATALOGO.empanada.precioOferta);

    // Con la regla, el cupón simplemente no la toca.
    expect(baseDescontable([{ ...CATALOGO.empanada, cantidad: 1 }])).toBe(0);
  });

  it('un carrito mezclado descuenta sólo la parte no rebajada', () => {
    const carrito = [
      { ...CATALOGO.cocaLata, cantidad: 6 }, // $6.000 en oferta
      { ...CATALOGO.aceite, cantidad: 2 },   // $4.980 a precio lista
      { ...CATALOGO.arroz, cantidad: 1 },    // $1.800 a precio lista
    ];

    const subtotal = carrito.reduce(
      (s, l) => s + precioEfectivo(l.precioVenta, l.precioOferta) * l.cantidad,
      0
    );
    const base = baseDescontable(carrito);

    expect(subtotal).toBe(12780);
    expect(base).toBe(6780);
    expect(Math.round(base * DESCUENTO)).toBe(1356);
    // Apilado sobre todo el carrito habría descontado $2.556: $1.200 de más,
    // y esos $1.200 salen del margen ya rebajado de las Coca-Colas.
    expect(Math.round(subtotal * DESCUENTO) - Math.round(base * DESCUENTO)).toBe(1200);
  });
});

describe('bordes', () => {
  it('ignora cantidades imposibles en vez de restar del total', () => {
    expect(baseDescontable([{ ...CATALOGO.aceite, cantidad: -3 }])).toBe(0);
    expect(baseDescontable([{ ...CATALOGO.aceite, cantidad: 0 }])).toBe(0);
    expect(baseDescontable([{ ...CATALOGO.aceite, cantidad: NaN }])).toBe(0);
  });

  it('trunca las cantidades fraccionarias hacia abajo', () => {
    expect(baseDescontable([{ ...CATALOGO.aceite, cantidad: 2.9 }])).toBe(4980);
  });

  it('un producto que no existe no aporta base', () => {
    // Es lo que pasa cuando el carrito trae un código que ya no está en el
    // catálogo: `precioVenta` llega `undefined`.
    expect(baseDescontable([{ precioVenta: undefined, cantidad: 2 }])).toBe(0);
  });

  it('una "oferta" más cara que la lista no protege nada', () => {
    // No es una oferta, así que el producto sí entra en la base.
    expect(baseDescontable([{ precioVenta: 1000, precioOferta: 1200, cantidad: 1 }])).toBe(1000);
  });

  it('el carrito vacío da cero, no NaN', () => {
    expect(baseDescontable([])).toBe(0);
  });
});
