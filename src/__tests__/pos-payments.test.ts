import { describe, it, expect } from 'vitest';
import {
  normalizePaymentMethod,
  paymentLabel,
  cuentaEnArqueo,
  aplicarDescuentoPersonal,
  STAFF_DISCOUNT_RATE,
} from '@/lib/pos/payments';

describe('normalizePaymentMethod', () => {
  it('colapsa débito, crédito y prepago en CARD', () => {
    for (const m of ['debito', 'débito', 'DEBIT', 'credito', 'crédito', 'CREDIT', 'wallet', 'prepago', 'tarjeta']) {
      expect(normalizePaymentMethod(m)).toBe('CARD');
    }
  });

  it('reconoce efectivo y transferencia', () => {
    expect(normalizePaymentMethod('efectivo')).toBe('CASH');
    expect(normalizePaymentMethod('CASH')).toBe('CASH');
    expect(normalizePaymentMethod('transferencia')).toBe('TRANSFER');
  });

  it('reconoce la compra de personal por cobrar', () => {
    expect(normalizePaymentMethod('STAFF_CREDIT')).toBe('STAFF_CREDIT');
    expect(normalizePaymentMethod('por cobrar')).toBe('STAFF_CREDIT');
  });

  it('cae en efectivo ante valores vacíos o desconocidos', () => {
    expect(normalizePaymentMethod(undefined)).toBe('CASH');
    expect(normalizePaymentMethod('')).toBe('CASH');
  });
});

describe('cuentaEnArqueo', () => {
  it('la compra por cobrar no suma al arqueo de caja', () => {
    expect(cuentaEnArqueo('STAFF_CREDIT')).toBe(false);
  });

  it('efectivo, tarjeta y transferencia sí cuentan', () => {
    expect(cuentaEnArqueo('CASH')).toBe(true);
    expect(cuentaEnArqueo('CARD')).toBe(true);
    expect(cuentaEnArqueo('TRANSFER')).toBe(true);
  });
});

describe('paymentLabel', () => {
  it('muestra los históricos como tarjeta, sin perder el detalle', () => {
    expect(paymentLabel('DEBIT')).toBe('Tarjeta (débito)');
    expect(paymentLabel('CREDIT')).toBe('Tarjeta (crédito)');
    expect(paymentLabel('CARD')).toBe('Tarjeta');
  });

  it('no rompe con métodos nulos o desconocidos', () => {
    expect(paymentLabel(null)).toBe('—');
    expect(paymentLabel('RARO')).toBe('RARO');
  });
});

describe('aplicarDescuentoPersonal', () => {
  it('aplica exactamente 25%', () => {
    expect(STAFF_DISCOUNT_RATE).toBe(0.25);
    expect(aplicarDescuentoPersonal(10000)).toBe(7500);
    expect(aplicarDescuentoPersonal(4000)).toBe(3000);
  });

  it('redondea a peso entero', () => {
    expect(Number.isInteger(aplicarDescuentoPersonal(3333))).toBe(true);
    expect(aplicarDescuentoPersonal(3333)).toBe(2500);
  });

  it('un total de 0 sigue siendo 0', () => {
    expect(aplicarDescuentoPersonal(0)).toBe(0);
  });
});
