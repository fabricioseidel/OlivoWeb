import { describe, expect, it } from 'vitest';

import { telefonoE164 } from '@/server/uber-direct.service';
import { BUSINESS } from '@/lib/seo/business';

describe('telefonoE164', () => {
  it('completa el código de país de un móvil chileno escrito como lo escribe la gente', () => {
    // El caso que rompía la cotización: el checkout mandaba esto tal cual y
    // Uber respondía invalid_params.
    expect(telefonoE164('933030295')).toBe('+56933030295');
    expect(telefonoE164('9 3303 0295')).toBe('+56933030295');
    expect(telefonoE164('9-3303-0295')).toBe('+56933030295');
  });

  it('respeta un número que ya trae código de país', () => {
    expect(telefonoE164('+56933030295')).toBe('+56933030295');
    expect(telefonoE164('56933030295')).toBe('+56933030295');
    expect(telefonoE164('+56 9 3303 0295')).toBe('+56933030295');
  });

  it('acepta un fijo de Santiago y el 0 de larga distancia', () => {
    expect(telefonoE164('223456789')).toBe('+56223456789');
    expect(telefonoE164('0933030295')).toBe('+56933030295');
  });

  it('cae al teléfono de la tienda cuando no hay nada usable', () => {
    // Preferible una entrega con un contacto válido a perder el envío flash.
    expect(telefonoE164('')).toBe(BUSINESS.phoneE164);
    expect(telefonoE164(null)).toBe(BUSINESS.phoneE164);
    expect(telefonoE164('123')).toBe(BUSINESS.phoneE164);
  });
});
