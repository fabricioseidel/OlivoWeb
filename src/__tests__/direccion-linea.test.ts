import { describe, expect, it } from 'vitest';

import { componerLineaDeCalle, numeroEscrito } from '@/lib/direccion';

/** La respuesta real de Nominatim para "San Isidro 292", recortada. */
const CALLE_SIN_NUMERO = {
  name: 'San Isidro',
  display_name:
    'San Isidro, Santiago, Provincia de Santiago, Región Metropolitana de Santiago, 8320000, Chile',
  address: {
    road: 'San Isidro',
    city: 'Santiago',
    state: 'Región Metropolitana de Santiago',
    postcode: '8320000',
    country: 'Chile',
  },
};

describe('componerLineaDeCalle', () => {
  it('conserva el número que escribió el cliente cuando OSM no lo tiene', () => {
    // El caso real: OpenStreetMap casi no trae numeración chilena, así que
    // guardar `display_name` dejaba la entrega en "San Isidro" sin altura.
    const { linea, numero } = componerLineaDeCalle(CALLE_SIN_NUMERO, 'San Isidro 292');
    expect(linea).toBe('San Isidro 292');
    expect(numero).toBe('292');
  });

  it('deja sólo la calle: la comuna y la región van en sus propios campos', () => {
    const { linea } = componerLineaDeCalle(CALLE_SIN_NUMERO, 'San Isidro 292');
    // Esta tira completa se mandaba a Uber como `street_address`.
    expect(linea).not.toContain('Provincia de Santiago');
    expect(linea).not.toContain('Chile');
    expect(linea).not.toContain('8320000');
  });

  it('prefiere el número de la sugerencia por sobre el escrito', () => {
    const item = { ...CALLE_SIN_NUMERO, address: { ...CALLE_SIN_NUMERO.address, house_number: '292' } };
    expect(componerLineaDeCalle(item, 'San Isidro 999').linea).toBe('San Isidro 292');
  });

  it('sin número escrito devuelve la calle sola', () => {
    expect(componerLineaDeCalle(CALLE_SIN_NUMERO, 'San Isidro').linea).toBe('San Isidro');
  });

  it('cae a display_name cuando la sugerencia no es una calle', () => {
    const pueblo = {
      display_name: 'San Isidro, Cauquenes, Región del Maule, Chile',
      address: { village: 'San Isidro', state: 'Región del Maule' },
    };
    expect(componerLineaDeCalle(pueblo, 'San Isidro').linea).toBe(pueblo.display_name);
  });
});

describe('numeroEscrito', () => {
  it('toma el número final', () => {
    expect(numeroEscrito('San Isidro 292')).toBe('292');
    expect(numeroEscrito('Av. José Pedro Alessandri 2010')).toBe('2010');
    expect(numeroEscrito('San Isidro, 292')).toBe('292');
  });

  it('ignora lo que no termina en número', () => {
    expect(numeroEscrito('San Isidro')).toBe(null);
    expect(numeroEscrito('')).toBe(null);
    expect(numeroEscrito(null)).toBe(null);
  });
});
