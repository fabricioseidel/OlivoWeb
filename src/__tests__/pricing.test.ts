import { describe, it, expect } from 'vitest';
import {
  TASA_IVA,
  MARGEN_POR_DEFECTO,
  aNeto,
  aBruto,
  precioSugerido,
  margenReal,
  redondear,
  variacionCosto,
  requiereRevision,
  calcularPrecio,
  diagnosticarPrecio,
  formatearMargen,
  derivarCostoProveedor,
  esCostoHeredado,
} from '@/lib/pricing';

/**
 * Estas fórmulas deciden a cuánto se vende cada producto del local. Un error
 * acá no rompe nada visiblemente: simplemente se vende más barato de lo que
 * cuesta, durante meses, sin que nadie se entere. Por eso los bordes —costo
 * cero, margen 100%, nulos, coma flotante— pesan tanto como el caso feliz.
 */

describe('IVA', () => {
  it('quita y pone el 19% sin perder el valor original', () => {
    const bruto = 11900;
    expect(aNeto(bruto)).toBeCloseTo(10000, 6);
    expect(aBruto(10000)).toBeCloseTo(11900, 6);
    expect(aBruto(aNeto(bruto)!)).toBeCloseTo(bruto, 6);
  });

  it('acepta una tasa distinta de la chilena', () => {
    expect(aBruto(100, 0)).toBe(100);
    expect(aBruto(100, 10)).toBeCloseTo(110, 6);
  });

  it('devuelve null en vez de NaN o Infinity ante entradas imposibles', () => {
    expect(aNeto(NaN)).toBeNull();
    expect(aBruto(Infinity)).toBeNull();
    // Una tasa de −100% haría dividir por cero.
    expect(aNeto(100, -100)).toBeNull();
  });

  it('la tasa por defecto es la chilena', () => {
    expect(TASA_IVA).toBe(19);
  });
});

describe('precio sugerido', () => {
  it('35% de margen sobre el costo con IVA equivale a dividir por 0,65', () => {
    expect(precioSugerido(1000, 0.35)).toBeCloseTo(1000 / 0.65, 6);
    expect(precioSugerido(1000)).toBeCloseTo(1000 / 0.65, 6);
    expect(MARGEN_POR_DEFECTO).toBe(0.35);
  });

  it('un margen del 0% deja el precio en el costo', () => {
    expect(precioSugerido(1234, 0)).toBe(1234);
  });

  it('costo cero da precio cero, no una división rara', () => {
    expect(precioSugerido(0, 0.35)).toBe(0);
  });

  it('un margen del 100% no tiene solución y devuelve null', () => {
    // venta − costo = venta sólo si el costo es 0: el precio sería infinito.
    expect(precioSugerido(1000, 1)).toBeNull();
    expect(precioSugerido(1000, 1.5)).toBeNull();
  });

  it('rechaza márgenes negativos y costos negativos', () => {
    expect(precioSugerido(1000, -0.1)).toBeNull();
    expect(precioSugerido(-1000, 0.35)).toBeNull();
  });
});

describe('margen real', () => {
  it('responde cuánto deja el precio que ya está puesto', () => {
    // Compro a 1.000 con IVA, vendo a 2.000: la mitad es margen.
    expect(margenReal(2000, 1000)).toBeCloseTo(0.5, 6);
  });

  it('es el inverso exacto del precio sugerido', () => {
    const sugerido = precioSugerido(1000, 0.35)!;
    expect(margenReal(sugerido, 1000)).toBeCloseTo(0.35, 6);
  });

  it('es negativo cuando se vende bajo el costo — el caso que hay que ver', () => {
    expect(margenReal(900, 1000)).toBeCloseTo(-0.1111, 3);
  });

  it('un precio de venta de cero no tiene margen definido', () => {
    expect(margenReal(0, 1000)).toBeNull();
    expect(margenReal(-5, 1000)).toBeNull();
  });
});

describe('redondeo comercial', () => {
  it('siempre sube: nunca se come margen en silencio', () => {
    expect(redondear(1231, 'decena')).toBe(1240);
    expect(redondear(1231, 'centena')).toBe(1300);
    expect(redondear(1231, 'terminacion90')).toBe(1290);
    expect(redondear(1231, 'ninguno')).toBe(1231);
  });

  it('deja quieto lo que ya cae justo', () => {
    expect(redondear(1240, 'decena')).toBe(1240);
    expect(redondear(1300, 'centena')).toBe(1300);
    expect(redondear(1290, 'terminacion90')).toBe(1290);
  });

  it('terminación 90 salta a la centena siguiente cuando se pasa por uno', () => {
    expect(redondear(1291, 'terminacion90')).toBe(1390);
    expect(redondear(50, 'terminacion90')).toBe(90);
    expect(redondear(95, 'terminacion90')).toBe(190);
  });

  it('no se deja engañar por el error de coma flotante', () => {
    // 1000/0.65*0.65 no vuelve exactamente a 1000 en binario.
    expect(redondear(1289.9999999997, 'terminacion90')).toBe(1290);
    expect(redondear(1240.0000000001, 'decena')).toBe(1240);
  });

  it('cero se queda en cero en todos los modos', () => {
    expect(redondear(0, 'decena')).toBe(0);
    expect(redondear(0, 'terminacion90')).toBe(0);
    expect(redondear(-10, 'centena')).toBe(0);
  });

  it('devuelve null ante entradas imposibles', () => {
    expect(redondear(NaN, 'decena')).toBeNull();
  });
});

describe('variación de costo', () => {
  it('mide cuánto subió o bajó el proveedor', () => {
    expect(variacionCosto(1000, 1120)).toBeCloseTo(0.12, 6);
    expect(variacionCosto(1000, 900)).toBeCloseTo(-0.1, 6);
  });

  it('manda a revisión sólo si el cambio supera el umbral', () => {
    expect(requiereRevision(1000, 1020)).toBe(false); // 2%
    expect(requiereRevision(1000, 1050)).toBe(true); // 5% justo
    expect(requiereRevision(1000, 1200)).toBe(true);
    // Una bajada fuerte también importa: se puede vender más barato.
    expect(requiereRevision(1000, 800)).toBe(true);
  });

  it('sin costo anterior no hay variación que medir', () => {
    expect(variacionCosto(0, 1000)).toBeNull();
    expect(requiereRevision(0, 1000)).toBe(false);
  });
});

describe('calcularPrecio', () => {
  it('va del costo neto del proveedor al precio propuesto en un paso', () => {
    // Costo neto 1.000 → con IVA 1.190 → /0.65 = 1.830,77 → decena arriba 1.840
    const r = calcularPrecio({ costoNeto: 1000 });

    expect(r.costoBruto).toBeCloseTo(1190, 6);
    expect(r.sugeridoExacto).toBeCloseTo(1830.769, 2);
    expect(r.sugerido).toBe(1840);
    expect(r.margen).toBe(0.35);
  });

  it('respeta el margen y el redondeo que le pasen', () => {
    const r = calcularPrecio({ costoNeto: 1000, margen: 0.4, redondeo: 'terminacion90' });
    // 1.190 / 0.6 = 1.983,33 → 1.990
    expect(r.sugerido).toBe(1990);
  });

  it('no inventa un precio cuando el margen es imposible', () => {
    const r = calcularPrecio({ costoNeto: 1000, margen: 1 });
    expect(r.sugeridoExacto).toBeNull();
    expect(r.sugerido).toBeNull();
  });
});

describe('diagnosticarPrecio', () => {
  it('detecta que se está vendiendo por debajo del costo', () => {
    const d = diagnosticarPrecio({ costoNeto: 1000, precioVenta: 1100 });

    expect(d.costoBruto).toBeCloseTo(1190, 6);
    expect(d.bajoCosto).toBe(true);
    expect(d.bajoMargen).toBe(true);
    expect(d.margenActual).toBeLessThan(0);
    expect(d.diferencia).toBe(1840 - 1100); // cuánto habría que subirlo
  });

  it('detecta margen erosionado sin llegar a vender a pérdida', () => {
    // Deja 20%, la regla pide 35%.
    const d = diagnosticarPrecio({ costoNeto: 1000, precioVenta: 1500 });

    expect(d.bajoCosto).toBe(false);
    expect(d.bajoMargen).toBe(true);
    expect(d.margenActual).toBeCloseTo(0.2067, 3);
  });

  it('no marca como problema un precio que cumple la regla', () => {
    const d = diagnosticarPrecio({ costoNeto: 1000, precioVenta: 1840 });

    expect(d.bajoCosto).toBe(false);
    expect(d.bajoMargen).toBe(false);
    expect(d.diferencia).toBe(0);
  });
});

describe('formato', () => {
  it('muestra el margen como porcentaje en formato chileno', () => {
    expect(formatearMargen(0.352)).toBe('35,2%');
    expect(formatearMargen(-0.05)).toBe('-5,0%');
  });

  it('un margen que no se puede calcular se muestra como raya, no como 0%', () => {
    expect(formatearMargen(null)).toBe('—');
  });
});

describe('derivarCostoProveedor', () => {
  it('completa el campo que falta y propone precio, escribiendo con IVA', () => {
    const r = derivarCostoProveedor('conIva', '1190')!;

    expect(r.conIva).toBe('1190'); // el campo tecleado se devuelve intacto
    expect(r.sinIva).toBe('1000.00');
    expect(r.sugerido).toBe('1831'); // 1190/0,65 = 1830,77 → sube al peso
  });

  it('funciona igual escribiendo sin IVA', () => {
    const r = derivarCostoProveedor('sinIva', '1000')!;

    expect(r.sinIva).toBe('1000');
    expect(r.conIva).toBe('1190.00');
    expect(r.sugerido).toBe('1831');
  });

  it('no reformatea el campo que se está tecleando', () => {
    // "12." es un decimal a medio escribir: reformatearlo borra lo que el
    // usuario venía escribiendo.
    const r = derivarCostoProveedor('sinIva', '12.')!;
    expect(r.sinIva).toBe('12.');
  });

  it('devuelve null si lo tecleado todavía no es un número', () => {
    expect(derivarCostoProveedor('conIva', '')).toBeNull();
    expect(derivarCostoProveedor('conIva', 'abc')).toBeNull();
  });

  it('acepta margen y redondeo distintos del por defecto', () => {
    const r = derivarCostoProveedor('conIva', '1190', { margen: 0.4, redondeo: 'terminacion90' })!;
    expect(r.sugerido).toBe('1990');
  });

  it('un producto exento no lleva IVA en ninguno de los dos campos', () => {
    const r = derivarCostoProveedor('sinIva', '1000', { tasa: 0 })!;
    expect(r.conIva).toBe('1000.00');
  });
});

describe('de dónde viene el costo que se muestra', () => {
  it('marca el costo heredado de la ficha del producto', () => {
    expect(esCostoHeredado({ cost_source: 'product', purchase_price: 1200 })).toBe(true);
  });

  it('no marca el costo propio del proveedor', () => {
    expect(esCostoHeredado({ cost_source: 'supplier', purchase_price: 1450 })).toBe(false);
  });

  it('no marca nada cuando el origen no viene informado', () => {
    // Sin saberlo no se puede afirmar que esté heredado, y marcar de más
    // enseña a ignorar la marca.
    expect(esCostoHeredado({ purchase_price: 1200 })).toBe(false);
    expect(esCostoHeredado({ cost_source: null, purchase_price: 1200 })).toBe(false);
  });

  it('no marca un costo heredado que además es cero', () => {
    // Ya se muestra como "—": avisar de un número que no se está mostrando
    // sólo agrega ruido.
    expect(esCostoHeredado({ cost_source: 'product', purchase_price: 0 })).toBe(false);
    expect(esCostoHeredado({ cost_source: 'product', purchase_price: null })).toBe(false);
  });
});
