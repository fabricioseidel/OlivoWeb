import { describe, expect, it } from 'vitest';

import { mapearComponentes } from '@/server/google-places.service';
import { elegirComuna } from '@/lib/direccion';

const componente = (longText: string, ...types: string[]) => ({ longText, types });

/** Lo que Google devuelve para una dirección de Ñuñoa. */
const NUNOA = [
  componente('2010', 'street_number'),
  componente('Avenida José Pedro Alessandri', 'route'),
  componente('Ñuñoa', 'locality', 'political'),
  componente('Provincia de Santiago', 'administrative_area_level_2', 'political'),
  componente('Región Metropolitana de Santiago', 'administrative_area_level_1', 'political'),
  componente('Chile', 'country', 'political'),
  componente('7800280', 'postal_code'),
];

describe('mapearComponentes', () => {
  it('traduce los componentes de Google a los campos que ya usa el checkout', () => {
    const addr = mapearComponentes(NUNOA);
    expect(addr.house_number).toBe('2010');
    expect(addr.road).toBe('Avenida José Pedro Alessandri');
    expect(addr.city).toBe('Ñuñoa');
    expect(addr.state).toBe('Región Metropolitana de Santiago');
    expect(addr.postcode).toBe('7800280');
  });

  it('deja que elegirComuna reconozca la comuna, esté en el campo que esté', () => {
    // En Chile la comuna a veces es `locality` y a veces
    // `administrative_area_level_3`: por eso se rellenan todos.
    expect(elegirComuna(mapearComponentes(NUNOA))).toMatchObject({
      nombre: 'Ñuñoa',
      reconocida: true,
    });

    const conNivel3 = [
      componente('Macul', 'administrative_area_level_3', 'political'),
      componente('Santiago', 'locality', 'political'),
      componente('Región Metropolitana de Santiago', 'administrative_area_level_1'),
    ];
    expect(elegirComuna(mapearComponentes(conNivel3))).toMatchObject({
      nombre: 'Macul',
      reconocida: true,
    });
  });

  it('no deja que un componente general pise a uno específico', () => {
    const addr = mapearComponentes([
      componente('Ñuñoa', 'locality'),
      componente('Santiago', 'locality'),
    ]);
    expect(addr.city).toBe('Ñuñoa');
  });

  it('tolera una respuesta sin componentes', () => {
    expect(mapearComponentes(undefined)).toEqual({});
    expect(mapearComponentes([])).toEqual({});
    expect(mapearComponentes([{ types: ['route'] }])).toEqual({});
  });
});
