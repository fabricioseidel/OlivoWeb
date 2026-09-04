import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * El panel de estado de apertura decide si la tienda puede vender. Lo que se
 * protege acá es que no mienta en los dos sentidos peligrosos: dar por listo
 * algo que falta, y —sobre todo— **filtrar un secreto** al describir la
 * configuración. De un token solo puede salir si existe y de qué tipo es.
 */

const TOKEN_FALSO = 'APP_USR-1234567890-ultrasecreto-no-debe-salir';

const state: {
  settings: { data: any; error: any };
  products: any[];
  branchStock: any[];
} = { settings: { data: {}, error: null }, products: [], branchStock: [] };

vi.mock('@/lib/api-auth', () => ({
  requireApiAdmin: async () => ({ ok: true, session: {}, userId: '1', role: 'ADMIN' }),
}));

/**
 * El mock respeta la lista de columnas del `select`.
 *
 * Un mock que devuelve la fila entera pase lo que pase no puede detectar la
 * clase de error más común contra Supabase: **olvidarse una columna**. Fue
 * exactamente lo que dejó pasar el bug de `purchase_price` — el panel no la
 * pedía, así que en producción llegaba `undefined` y todo producto parecía
 * tener costo. En el test, en cambio, el objeto completo estaba ahí y todo
 * pasaba en verde.
 *
 * Proyectando como proyecta Postgres, un `select` incompleto vuelve a fallar
 * acá antes de llegar a producción.
 */
const proyectar = (filas: any[], columnas: string) => {
  const pedidas = columnas.split(',').map((c) => c.trim()).filter(Boolean);
  if (pedidas.includes('*')) return filas;
  return filas.map((fila) =>
    Object.fromEntries(pedidas.filter((c) => c in fila).map((c) => [c, fila[c]]))
  );
};

vi.mock('@/lib/supabase-server', () => ({
  supabaseServer: {
    from: (tabla: string) => {
      let columnas = '*';
      const api: any = {
        select: (cols?: string) => {
          columnas = cols ?? '*';
          return api;
        },
        eq: () => api,
        range: () => api,
        maybeSingle: async () => state.settings,
        then: (resolve: any) =>
          resolve(
            tabla === 'products'
              ? { data: proyectar(state.products, columnas), error: null }
              : { data: proyectar(state.branchStock, columnas), error: null }
          ),
      };
      return api;
    },
  },
}));

import { GET } from '@/app/api/admin/estado-apertura/route';

const leer = async () => {
  const res = await GET();
  return res.json();
};

const buscar = (body: any, id: string) =>
  body.grupos.flatMap((g: any) => g.checks).find((c: any) => c.id === id);

beforeEach(() => {
  vi.unstubAllEnvs();
  state.settings = { data: { preview_mode: true }, error: null };
  state.products = [];
  state.branchStock = [];
});

describe('secretos', () => {
  it('nunca devuelve el valor de un token, solo si existe y de qué tipo es', async () => {
    vi.stubEnv('MERCADOPAGO_ACCESS_TOKEN', TOKEN_FALSO);
    vi.stubEnv('MERCADOPAGO_WEBHOOK_SECRET', 'secreto-del-webhook');
    vi.stubEnv('RESEND_API_KEY', 're_clave_secreta');
    vi.stubEnv('CRON_SECRET', 'cron-secreto');

    const body = await leer();
    const serializado = JSON.stringify(body);

    expect(serializado).not.toContain(TOKEN_FALSO);
    expect(serializado).not.toContain('ultrasecreto');
    expect(serializado).not.toContain('secreto-del-webhook');
    expect(serializado).not.toContain('re_clave_secreta');
    expect(serializado).not.toContain('cron-secreto');

    // Pero sí informa lo útil: que es de producción.
    expect(buscar(body, 'mp-token').detail).toMatch(/producción/i);
  });

  it('distingue un token de prueba de uno de producción', async () => {
    vi.stubEnv('MERCADOPAGO_ACCESS_TOKEN', 'TEST-abc');
    const body = await leer();

    const token = buscar(body, 'mp-token');
    expect(token.status).toBe('warn');
    expect(token.detail).toMatch(/prueba/i);
  });
});

describe('base de datos', () => {
  it('detecta que falta la migración por el error de la columna', async () => {
    state.settings = {
      data: null,
      error: { message: 'column settings.preview_mode does not exist' },
    };

    const body = await leer();
    const check = buscar(body, 'migracion');

    expect(check.status).toBe('error');
    expect(check.hint).toContain('supabase db push');
    expect(body.bloqueantes).toBeGreaterThan(0);
  });

  it('marca la vitrina activa como algo a revisar, no como error', async () => {
    state.settings = { data: { preview_mode: true }, error: null };
    const body = await leer();

    expect(buscar(body, 'vitrina').status).toBe('warn');
  });

  it('con la tienda abierta el estado de la vitrina queda en orden', async () => {
    state.settings = { data: { preview_mode: false }, error: null };
    const body = await leer();

    expect(buscar(body, 'vitrina').status).toBe('ok');
  });
});

describe('catálogo', () => {
  /** Un producto que la tienda sí muestra: le tienen que sobrar los cinco datos. */
  const visible = (barcode: string, name: string) => ({
    barcode,
    name,
    category: 'Abarrotes',
    sale_price: 2500,
    image_url: 'x.jpg',
    purchase_price: 1800,
    is_active: true,
  });

  it('cuenta los productos que no se ven y dice por qué', async () => {
    state.products = [
      visible('1', 'Harina PAN'),
      { ...visible('2', 'Sin foto'), image_url: '' },
      { ...visible('3', 'Sin precio'), sale_price: 0 },
      // Inactivo: no cuenta, no está a la venta a propósito.
      { barcode: '4', name: 'Descatalogado', category: '', sale_price: 0, image_url: '', is_active: false },
    ];

    const body = await leer();

    expect(buscar(body, 'visibles').detail).toContain('2 de 3');
    expect(buscar(body, 'sin-foto').detail).toContain('Sin foto');
    expect(buscar(body, 'sin-precio').detail).toContain('Sin precio');
  });

  /**
   * El agujero que tenía este panel el día que la tienda salió en vivo.
   *
   * La vitrina esconde todo producto sin costo de proveedor —sin costo no se
   * sabe si el precio deja margen o pierde plata— pero el panel no miraba ese
   * campo. Informaba 78 productos invisibles cuando eran 457: decía "listo
   * para abrir" con el 62% del catálogo apagado.
   */
  it('cuenta como invisible al producto sin costo de proveedor', async () => {
    state.products = [
      visible('1', 'Harina PAN'),
      { ...visible('2', 'Sin costo cargado'), purchase_price: 0 },
      { ...visible('3', 'Costo en null'), purchase_price: null },
    ];

    const body = await leer();

    expect(buscar(body, 'visibles').detail).toContain('2 de 3');
    expect(buscar(body, 'sin-costo').detail).toContain('Sin costo cargado');
    expect(buscar(body, 'sin-costo').detail).toContain('Costo en null');
    // No se le echa la culpa a la foto ni al precio, que están bien.
    expect(buscar(body, 'sin-foto')).toBeUndefined();
    expect(buscar(body, 'sin-precio')).toBeUndefined();
  });

  it('no inventa problemas cuando el catálogo está completo', async () => {
    state.products = [visible('1', 'Harina PAN')];

    const body = await leer();
    expect(buscar(body, 'visibles').status).toBe('ok');
    expect(buscar(body, 'sin-foto')).toBeUndefined();
    expect(buscar(body, 'sin-costo')).toBeUndefined();
  });
});

describe('inventario', () => {
  it('detecta el stock del catálogo desalineado con el de sucursal', async () => {
    state.products = [
      { barcode: '1', name: 'Nescafé', stock: 4, category: 'x', sale_price: 1, image_url: 'i', is_active: true },
    ];
    // Dos sucursales que suman 2, contra los 4 que dice el catálogo.
    state.branchStock = [
      { product_barcode: '1', stock: 1 },
      { product_barcode: '1', stock: 1 },
    ];

    const body = await leer();
    const check = buscar(body, 'stock-coherente');

    expect(check.status).toBe('warn');
    expect(check.detail).toContain('Nescafé');
    expect(check.detail).toContain('4 vs 2');
  });

  it('marca como bloqueante un producto con stock que no existe en la sucursal', async () => {
    state.products = [
      { barcode: '9', name: 'Fantasma', stock: 7, category: 'x', sale_price: 1, image_url: 'i', is_active: true },
    ];
    state.branchStock = [];

    const body = await leer();
    const check = buscar(body, 'sin-sucursal');

    // Sin fila en la sucursal, la venta web se rechaza por falta de stock.
    expect(check.status).toBe('error');
    expect(check.detail).toContain('Fantasma');
  });

  it('acepta como correcto el stock que sí cuadra', async () => {
    state.products = [
      { barcode: '1', name: 'Ok', stock: 3, category: 'x', sale_price: 1, image_url: 'i', is_active: true },
    ];
    state.branchStock = [{ product_barcode: '1', stock: 3 }];

    const body = await leer();
    expect(buscar(body, 'stock-coherente').status).toBe('ok');
    expect(buscar(body, 'sin-sucursal')).toBeUndefined();
  });
});

describe('resumen', () => {
  it('un solo bloqueante manda sobre cualquier cantidad de aciertos', async () => {
    vi.stubEnv('MERCADOPAGO_ACCESS_TOKEN', 'APP_USR-x');
    vi.stubEnv('MERCADOPAGO_WEBHOOK_SECRET', 'x');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.olivomarket.cl');
    vi.stubEnv('RESEND_API_KEY', 'x');
    // Falta CRON_SECRET a propósito.

    const body = await leer();

    expect(body.estado).toBe('error');
    expect(buscar(body, 'cron').status).toBe('error');
  });
});
