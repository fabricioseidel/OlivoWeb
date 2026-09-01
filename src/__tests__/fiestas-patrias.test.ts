import { describe, it, expect } from 'vitest';
import {
  diasParaElDieciocho,
  enTemporadaDieciochera,
  esProductoDieciochero,
  ordenarDieciocheros,
  textoCuentaRegresiva,
} from '@/lib/fiestas-patrias';

/**
 * La campaña se enciende y se apaga sola según el calendario chileno. Si esa
 * conversión de zona horaria se rompe, el sitio queda con guirnaldas en
 * octubre o sin ellas el 1 de septiembre, y nadie se entera hasta que un
 * cliente lo reporta. Estas pruebas fijan las fechas de borde.
 */

// Chile está en UTC-3 (horario de verano) en septiembre: las 02:00 UTC del 1
// de septiembre son todavía las 23:00 del 31 de agosto en Santiago.
const utc = (iso: string) => new Date(iso);

describe('enTemporadaDieciochera', () => {
  it('está encendida durante septiembre', () => {
    expect(enTemporadaDieciochera(utc('2025-09-01T15:00:00Z'))).toBe(true);
    expect(enTemporadaDieciochera(utc('2025-09-18T12:00:00Z'))).toBe(true);
    expect(enTemporadaDieciochera(utc('2025-09-30T20:00:00Z'))).toBe(true);
  });

  it('está apagada fuera de septiembre', () => {
    expect(enTemporadaDieciochera(utc('2025-08-15T15:00:00Z'))).toBe(false);
    expect(enTemporadaDieciochera(utc('2025-10-05T15:00:00Z'))).toBe(false);
  });

  it('usa la hora de Chile y no la del servidor', () => {
    // 01:00 UTC del 1 de septiembre = 22:00 del 31 de agosto en Santiago.
    // Un servidor en UTC encendería la campaña un día antes.
    expect(enTemporadaDieciochera(utc('2025-09-01T01:00:00Z'))).toBe(false);
    // Y la apagaría un día antes de tiempo el 30 a las 22:00 hora local.
    expect(enTemporadaDieciochera(utc('2025-10-01T01:00:00Z'))).toBe(true);
  });
});

describe('diasParaElDieciocho', () => {
  it('cuenta los días que faltan', () => {
    expect(diasParaElDieciocho(utc('2025-09-01T15:00:00Z'))).toBe(17);
    expect(diasParaElDieciocho(utc('2025-09-17T15:00:00Z'))).toBe(1);
  });

  it('devuelve 0 el mismo 18 y negativo después', () => {
    expect(diasParaElDieciocho(utc('2025-09-18T15:00:00Z'))).toBe(0);
    expect(diasParaElDieciocho(utc('2025-09-19T15:00:00Z'))).toBe(-1);
  });
});

describe('textoCuentaRegresiva', () => {
  it('cambia de mensaje en cada tramo', () => {
    expect(textoCuentaRegresiva(utc('2025-09-01T15:00:00Z'))).toBe('Faltan 17 días para el 18');
    expect(textoCuentaRegresiva(utc('2025-09-17T15:00:00Z'))).toBe('¡Mañana es 18!');
    expect(textoCuentaRegresiva(utc('2025-09-18T15:00:00Z'))).toBe('¡Hoy es 18 de septiembre!');
    expect(textoCuentaRegresiva(utc('2025-09-19T15:00:00Z'))).toBe('¡Feliz 19! Sigue la celebración');
  });
});

describe('esProductoDieciochero', () => {
  it('reconoce la empanada de pino cargada en Panadería', () => {
    expect(
      esProductoDieciochero({
        name: 'Empanada de Pino',
        description: 'Horneada, con carne, cebolla, huevo y aceituna',
        categories: ['Panadería'],
      })
    ).toBe(true);
  });

  it('ignora tildes y mayúsculas', () => {
    expect(esProductoDieciochero({ name: 'CHORIPÁN LISTO', categories: [] })).toBe(true);
    expect(esProductoDieciochero({ name: 'choripan listo', categories: [] })).toBe(true);
  });

  it('acepta cualquier producto de la categoría curada', () => {
    expect(
      esProductoDieciochero({ name: 'Vaso plástico x50', categories: ['Fiestas Patrias'] })
    ).toBe(true);
  });

  it('deja fuera el resto del catálogo', () => {
    expect(
      esProductoDieciochero({
        name: 'Detergente líquido 3L',
        description: 'Para ropa blanca y de color',
        categories: ['Aseo'],
      })
    ).toBe(false);
  });
});

describe('ordenarDieciocheros', () => {
  it('pone primero lo curado a mano, después lo destacado y luego el resto', () => {
    const orden = ordenarDieciocheros([
      { name: 'Pan amasado', categories: ['Panadería'] },
      { name: 'Anticucho', categories: ['Carnes'], featured: true },
      { name: 'Pack dieciochero', categories: ['Fiestas Patrias'] },
    ]).map(p => p.name);

    expect(orden).toEqual(['Pack dieciochero', 'Anticucho', 'Pan amasado']);
  });
});
