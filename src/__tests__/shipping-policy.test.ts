import { describe, it, expect } from 'vitest';
import { quoteShipping, comunaToSlug, TOPE_POR_COMUNA } from '@/lib/shipping-policy';

const MIN = 35000;

describe('comunaToSlug', () => {
  it('normaliza tildes y ñ', () => {
    expect(comunaToSlug('Ñuñoa')).toBe('nunoa');
    expect(comunaToSlug('ñuñoa')).toBe('nunoa');
    expect(comunaToSlug('Peñalolén')).toBe('penalolen');
    expect(comunaToSlug('PEÑALOLEN')).toBe('penalolen');
  });

  it('normaliza espacios a guiones', () => {
    expect(comunaToSlug('San Joaquín')).toBe('san-joaquin');
    expect(comunaToSlug('La Reina')).toBe('la-reina');
  });

  it('devuelve null para comunas fuera de cobertura o vacías', () => {
    expect(comunaToSlug('Providencia')).toBeNull();
    expect(comunaToSlug('')).toBeNull();
    expect(comunaToSlug(null)).toBeNull();
    expect(comunaToSlug(undefined)).toBeNull();
  });
});

describe('quoteShipping — tope por comuna', () => {
  it('aplica tope de 1500 en Ñuñoa cuando la distancia da más', () => {
    const q = quoteShipping({ rawPrice: 3000, subtotal: 10000, ciudad: 'Ñuñoa', freeShippingMinimum: MIN });
    expect(q.price).toBe(1500);
    expect(q.capApplied).toBe(true);
    expect(q.rawPrice).toBe(3000);
  });

  it('aplica tope de 1500 en Macul', () => {
    const q = quoteShipping({ rawPrice: 4200, subtotal: 10000, ciudad: 'Macul', freeShippingMinimum: MIN });
    expect(q.price).toBe(TOPE_POR_COMUNA.macul);
  });

  it('no infla el precio si la distancia da menos que el tope', () => {
    const q = quoteShipping({ rawPrice: 1100, subtotal: 10000, ciudad: 'Ñuñoa', freeShippingMinimum: MIN });
    expect(q.price).toBe(1100);
    expect(q.capApplied).toBe(false);
  });

  it('no aplica tope en comunas sin tope definido', () => {
    const q = quoteShipping({ rawPrice: 4000, subtotal: 10000, ciudad: 'Peñalolén', freeShippingMinimum: MIN });
    expect(q.price).toBe(4000);
    expect(q.capApplied).toBe(false);
  });
});

describe('quoteShipping — envío gratis por monto', () => {
  it('es gratis sobre el mínimo en comuna con cobertura', () => {
    const q = quoteShipping({ rawPrice: 4000, subtotal: 35000, ciudad: 'Peñalolén', freeShippingMinimum: MIN });
    expect(q.price).toBe(0);
    expect(q.freeApplied).toBe(true);
  });

  it('el gratis tiene prioridad sobre el tope', () => {
    const q = quoteShipping({ rawPrice: 3000, subtotal: 40000, ciudad: 'Ñuñoa', freeShippingMinimum: MIN });
    expect(q.price).toBe(0);
    expect(q.freeApplied).toBe(true);
    expect(q.capApplied).toBe(false);
  });

  it('justo bajo el mínimo todavía cobra', () => {
    const q = quoteShipping({ rawPrice: 2000, subtotal: 34999, ciudad: 'La Reina', freeShippingMinimum: MIN });
    expect(q.price).toBe(2000);
    expect(q.freeApplied).toBe(false);
  });

  it('no regala el envío fuera del radio de cobertura', () => {
    const q = quoteShipping({ rawPrice: 6000, subtotal: 50000, ciudad: 'Providencia', freeShippingMinimum: MIN });
    expect(q.price).toBe(6000);
    expect(q.freeApplied).toBe(false);
  });

  it('respeta la regla desactivada (mínimo null)', () => {
    const q = quoteShipping({ rawPrice: 2000, subtotal: 99999, ciudad: 'Macul', freeShippingMinimum: null });
    expect(q.freeApplied).toBe(false);
    expect(q.price).toBe(1500); // sigue aplicando el tope
  });
});

describe('quoteShipping — envío gratis por distancia', () => {
  // El caso que motivó el cambio: el buscador de direcciones devuelve
  // "Santiago" o "Región Metropolitana" en vez de la comuna, y antes eso
  // bastaba para cobrarle el despacho a un pedido de $80.000.
  it('aplica el gratis aunque la comuna no se reconozca, si está en rango', () => {
    const q = quoteShipping({
      rawPrice: 4000, subtotal: 80000, ciudad: 'Santiago',
      distanceKm: 3.2, freeShippingMinimum: MIN,
    });
    expect(q.price).toBe(0);
    expect(q.freeApplied).toBe(true);
    expect(q.freeBlockedReason).toBeNull();
  });

  it('aplica el gratis sin ciudad alguna, si está en rango', () => {
    const q = quoteShipping({
      rawPrice: 4000, subtotal: 40000, ciudad: null,
      distanceKm: 5, freeShippingMinimum: MIN,
    });
    expect(q.freeApplied).toBe(true);
  });

  it('no lo aplica fuera del radio, aunque la comuna sea de cobertura', () => {
    const q = quoteShipping({
      rawPrice: 6000, subtotal: 80000, ciudad: 'Peñalolén',
      distanceKm: 14, freeShippingMinimum: MIN,
    });
    expect(q.price).toBe(6000);
    expect(q.freeApplied).toBe(false);
    expect(q.freeBlockedReason).toBe('fuera-de-rango');
  });

  it('respeta el radio configurado por el admin', () => {
    const lejos = {
      rawPrice: 5000, subtotal: 40000, ciudad: 'Santiago',
      distanceKm: 12, freeShippingMinimum: MIN,
    };
    expect(quoteShipping(lejos).freeApplied).toBe(false);
    expect(quoteShipping({ ...lejos, maxDistanceKm: 20 }).freeApplied).toBe(true);
  });

  it('un radio inválido cae al valor por defecto en vez de anular el reparto', () => {
    const q = quoteShipping({
      rawPrice: 4000, subtotal: 40000, ciudad: 'Santiago',
      distanceKm: 4, maxDistanceKm: 0, freeShippingMinimum: MIN,
    });
    expect(q.freeApplied).toBe(true);
  });

  it('el borde exacto del radio cuenta como dentro', () => {
    const q = quoteShipping({
      rawPrice: 4000, subtotal: 40000, ciudad: null,
      distanceKm: 8, maxDistanceKm: 8, freeShippingMinimum: MIN,
    });
    expect(q.freeApplied).toBe(true);
  });

  it('sigue aplicando el tope por comuna cuando el gratis no corresponde', () => {
    const q = quoteShipping({
      rawPrice: 3000, subtotal: 10000, ciudad: 'Ñuñoa',
      distanceKm: 2, freeShippingMinimum: MIN,
    });
    expect(q.price).toBe(1500);
    expect(q.capApplied).toBe(true);
    expect(q.distanceKm).toBe(2);
  });

  it('una distancia no numérica cae al criterio por comuna', () => {
    const q = quoteShipping({
      rawPrice: 4000, subtotal: 40000, ciudad: 'Macul',
      distanceKm: NaN, freeShippingMinimum: MIN,
    });
    expect(q.freeApplied).toBe(true);
    expect(q.distanceKm).toBeNull();
  });
});

describe('quoteShipping — casos límite', () => {
  it('sin comuna detectada cobra la tarifa completa (conservador)', () => {
    const q = quoteShipping({ rawPrice: 5000, subtotal: 40000, ciudad: null, freeShippingMinimum: MIN });
    expect(q.price).toBe(5000);
    expect(q.comuna).toBeNull();
  });

  it('nunca devuelve un precio negativo', () => {
    const q = quoteShipping({ rawPrice: -100, subtotal: 0, ciudad: 'Ñuñoa', freeShippingMinimum: MIN });
    expect(q.price).toBeGreaterThanOrEqual(0);
  });

  it('redondea a peso entero', () => {
    const q = quoteShipping({ rawPrice: 1234.67, subtotal: 0, ciudad: 'La Reina', freeShippingMinimum: MIN });
    expect(Number.isInteger(q.price)).toBe(true);
    expect(q.price).toBe(1235);
  });
});
