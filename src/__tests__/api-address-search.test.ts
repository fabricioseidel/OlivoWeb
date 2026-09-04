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

function responder(urls: Record<string, unknown[]>, google?: { falla?: boolean; suggestions?: unknown[] }) {
  return vi.fn(async (input: any, init?: any) => {
    const url = String(input);
    llamadas.push(url);
    if (url.includes('places.googleapis.com')) {
      if (google?.falla) return { ok: false, status: 429, text: async () => 'RESOURCE_EXHAUSTED' } as any;
      return { ok: true, json: async () => ({ suggestions: google?.suggestions ?? [] }) } as any;
    }
    const clave = url.includes('street=') ? 'estructurada' : 'libre';
    return {
      ok: true,
      json: async () => urls[clave] ?? [],
    } as any;
  });
}

const pedir = (q: string, session = '') =>
  GET({
    nextUrl: new URL(
      `http://localhost/api/address/search?q=${encodeURIComponent(q)}${session ? `&session=${session}` : ''}`
    ),
    headers: new Headers(),
  } as any);

const PREDICCION_GOOGLE = {
  placePrediction: {
    placeId: 'ChIJ-google-1',
    text: { text: 'San Isidro 292, Santiago, Región Metropolitana' },
  },
};

describe('API /address/search', () => {
  beforeEach(() => {
    llamadas.length = 0;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GOOGLE_MAPS_API_KEY;
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

  describe('con Google Places configurado', () => {
    it('usa Google y no gasta una llamada a Nominatim', async () => {
      process.env.GOOGLE_MAPS_API_KEY = 'clave-de-prueba';
      vi.stubGlobal('fetch', responder({ libre: [CALLE_SANTIAGO] }, { suggestions: [PREDICCION_GOOGLE] }));

      const res = await pedir('San Isidro google uno', 'sesion-1');
      const data = await res.json();

      expect(llamadas.every((u) => u.includes('places.googleapis.com'))).toBe(true);
      expect(data[0].fuente).toBe('google');
      // El detalle se pide sólo al elegir, nunca por predicción.
      expect(data[0].necesitaDetalle).toBe(true);
    });

    it('manda el token de sesión, que es lo que hace que se cobre por sesión', async () => {
      process.env.GOOGLE_MAPS_API_KEY = 'clave-de-prueba';
      const fetchMock = responder({}, { suggestions: [PREDICCION_GOOGLE] });
      vi.stubGlobal('fetch', fetchMock);

      await pedir('San Isidro google token', 'sesion-abc');

      const cuerpo = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(cuerpo.sessionToken).toBe('sesion-abc');
      expect(cuerpo.includedRegionCodes).toEqual(['cl']);
    });

    it('cae a Nominatim si Google falla: el checkout no se queda sin buscador', async () => {
      // El caso que importa: cuota agotada o clave mal puesta.
      process.env.GOOGLE_MAPS_API_KEY = 'clave-de-prueba';
      vi.stubGlobal('fetch', responder({ libre: [CALLE_SANTIAGO] }, { falla: true }));

      const res = await pedir('San Isidro google falla', 'sesion-2');
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data).toHaveLength(1);
      expect(data[0].fuente).toBe('nominatim');
    });

    it('cae a Nominatim si Google no encuentra nada', async () => {
      process.env.GOOGLE_MAPS_API_KEY = 'clave-de-prueba';
      vi.stubGlobal('fetch', responder({ libre: [CALLE_SANTIAGO] }, { suggestions: [] }));

      const data = await (await pedir('San Isidro google vacio', 'sesion-3')).json();
      expect(data[0].fuente).toBe('nominatim');
    });

    it('sin clave sigue usando Nominatim, sin tocar Google', async () => {
      vi.stubGlobal('fetch', responder({ libre: [CALLE_SANTIAGO] }));

      const data = await (await pedir('San Isidro sin clave', 'sesion-4')).json();
      expect(llamadas.some((u) => u.includes('places.googleapis.com'))).toBe(false);
      expect(data[0].fuente).toBe('nominatim');
    });
  });
});
