import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/address/search/route';

/** Respuesta mínima con la forma que devuelve Nominatim. */
const lugar = (
  place_id: number,
  display_name: string,
  address: Record<string, string>,
  osm_id = place_id
) => ({ place_id, osm_type: 'way', osm_id, display_name, address, lat: '-33.4', lon: '-70.6' });

const PUEBLO_QUILLOTA = lugar(1, 'San Isidro, Quillota, Región de Valparaíso', {
  village: 'San Isidro',
  state: 'Región de Valparaíso',
});
const PUEBLO_CAUQUENES = lugar(2, 'San Isidro, Cauquenes, Región del Maule', {
  village: 'San Isidro',
  state: 'Región del Maule',
});
const CALLE_SANTIAGO = lugar(3, 'San Isidro 292, Santiago, Región Metropolitana', {
  road: 'San Isidro',
  house_number: '292',
  state: 'Región Metropolitana',
});

const llamadas: string[] = [];

function responder(urls: Record<string, unknown[]>) {
  return vi.fn(async (input: any) => {
    const url = String(input);
    llamadas.push(url);
    const clave = url.includes('street=') ? 'estructurada' : 'libre';
    return {
      ok: true,
      json: async () => urls[clave] ?? [],
    } as any;
  });
}

const pedir = (q: string) =>
  GET({
    nextUrl: new URL(`http://localhost/api/address/search?q=${encodeURIComponent(q)}`),
    headers: new Headers(),
  } as any);

describe('API /address/search', () => {
  beforeEach(() => {
    llamadas.length = 0;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sesga la búsqueda hacia Santiago en vez de pedir sólo "país = Chile"', async () => {
    vi.stubGlobal('fetch', responder({ libre: [CALLE_SANTIAGO] }));
    await pedir('Bellavista 100 sesgo');

    expect(llamadas[0]).toContain('viewbox=');
    // Sesgo, no filtro: una dirección de regiones se sigue encontrando.
    expect(llamadas[0]).toContain('bounded=0');
    expect(llamadas[0]).toContain('countrycodes=cl');
  });

  it('consulta también en modo estructurado cuando la dirección trae número', async () => {
    vi.stubGlobal('fetch', responder({ libre: [], estructurada: [CALLE_SANTIAGO] }));
    const res = await pedir('San Isidro 293');
    const data = await res.json();

    // Nominatim espera "<número> <calle>"; escrito al revés como texto libre,
    // la calle no aparecía.
    expect(llamadas.some((u) => u.includes('street=292+San+Isidro') || u.includes('street=293+San+Isidro'))).toBe(true);
    expect(data).toHaveLength(1);
  });

  it('pone primero la calle de la Región Metropolitana y no el pueblo homónimo', async () => {
    vi.stubGlobal(
      'fetch',
      responder({ libre: [PUEBLO_QUILLOTA, PUEBLO_CAUQUENES, CALLE_SANTIAGO] })
    );
    const res = await pedir('San Isidro ordena');
    const data = await res.json();

    expect(data[0].place_id).toBe(CALLE_SANTIAGO.place_id);
    // Las de regiones siguen ahí, sólo que después.
    expect(data).toHaveLength(3);
  });

  it('no repite un lugar que vino en las dos consultas', async () => {
    vi.stubGlobal(
      'fetch',
      responder({ libre: [CALLE_SANTIAGO], estructurada: [CALLE_SANTIAGO] })
    );
    const res = await pedir('San Isidro 294');
    const data = await res.json();

    expect(data).toHaveLength(1);
  });

  it('reconoce el mismo objeto de OSM aunque cambie el place_id', async () => {
    // Nominatim asigna un `place_id` distinto por consulta al mismo objeto:
    // "Av. José Pedro Alessandri 2010" aparecía cuatro veces en la lista.
    const mismoObjeto = { ...CALLE_SANTIAGO, place_id: 99999 };
    vi.stubGlobal(
      'fetch',
      responder({ libre: [CALLE_SANTIAGO], estructurada: [mismoObjeto] })
    );
    const res = await pedir('San Isidro 295');
    const data = await res.json();

    expect(data).toHaveLength(1);
  });

  it('no muestra dos veces la misma dirección escrita igual', async () => {
    // Dos portales del mismo edificio: distinto osm_id, misma dirección para
    // quien tiene que elegir una.
    const otroPortal = { ...CALLE_SANTIAGO, place_id: 4242, osm_id: 4242 };
    vi.stubGlobal('fetch', responder({ libre: [CALLE_SANTIAGO, otroPortal] }));
    const res = await pedir('San Isidro portales');
    const data = await res.json();

    expect(data).toHaveLength(1);
  });
});
