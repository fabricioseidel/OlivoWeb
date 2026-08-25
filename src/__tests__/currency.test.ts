import { describe, it, expect } from 'vitest';
import { formatCLP, formatCurrency } from '@/utils/currency';

/**
 * El peso chileno no tiene decimales: "$1.990,00" está mal escrito, no es una
 * preferencia. Antes cada pantalla armaba su propio `Intl.NumberFormat` y
 * bastaba con que una omitiera `maximumFractionDigits` para que el catálogo y
 * el panel mostraran el mismo precio distinto.
 */
describe('formatCLP', () => {
  it('no muestra decimales', () => {
    expect(formatCLP(1990)).not.toMatch(/[.,]\d\d$/);
  });

  it('separa los miles', () => {
    expect(formatCLP(35000)).toContain('35.000');
  });

  it('redondea en vez de truncar hacia abajo', () => {
    expect(formatCLP(1990.6)).toContain('1.991');
  });

  it('trata null/NaN como cero en vez de imprimir "NaN"', () => {
    expect(formatCLP(undefined as unknown as number)).toContain('0');
    expect(formatCLP(NaN)).toContain('0');
  });

  it('formatea el cero, no lo deja vacío', () => {
    expect(formatCLP(0)).toContain('0');
  });
});

describe('formatCurrency', () => {
  it('en CLP da exactamente lo mismo que formatCLP', () => {
    for (const value of [0, 990, 35000, 1234567]) {
      expect(formatCurrency(value)).toBe(formatCLP(value));
    }
  });

  it('acepta otra moneda cuando el valor no es en pesos', () => {
    expect(formatCurrency(1000, 'USD', 'en-US')).toContain('1,000');
  });
});
