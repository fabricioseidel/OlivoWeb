import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Devolver el stock de una orden cuyo pago se rechazó.
 *
 * Las claves NO son las mismas a los dos lados de la orden: el checkout busca
 * el producto por código de barras y reserva el stock con ese código, pero
 * guarda `order_items.product_id` con `products.id`, la clave numérica.
 *
 * El intento anterior salvaba esa distancia con un embed de PostgREST,
 * `order_items → products(barcode)`. Ese embed no puede existir —PostgREST arma
 * las relaciones desde las claves foráneas y `order_items` sólo tiene una,
 * hacia `orders`—, así que la consulta devolvía error, un `if (!error && data)`
 * lo descartaba y la devolución de stock se saltaba entera mientras el log
 * seguía diciendo "stock restaurado".
 *
 * Lo que estos tests fijan es que la traducción sea explícita, que nada quede
 * en silencio, y que el error vuelva a informarse en vez de tragarse.
 */

type Fila = { product_id: unknown; quantity: unknown };

const estado: {
  orderItems: Fila[];
  products: Array<{ id: number | string; barcode: string }>;
  rpc: Array<{ name: string; args: any }>;
  selects: Array<{ tabla: string; columnas: string }>;
  errorOrderItems: any;
  errorRpc: any;
} = {
  orderItems: [],
  products: [],
  rpc: [],
  selects: [],
  errorOrderItems: null,
  errorRpc: null,
};

vi.mock('@/lib/supabase-server', () => ({
  supabaseServer: {
    rpc: async (name: string, args: any) => {
      estado.rpc.push({ name, args });
      return { data: estado.errorRpc ? null : true, error: estado.errorRpc };
    },
    from: (tabla: string) => {
      const filtros: Record<string, any> = {};

      const resultado = () => {
        if (tabla === 'order_items') {
          return estado.errorOrderItems
            ? { data: null, error: estado.errorOrderItems }
            : { data: estado.orderItems, error: null };
        }
        if (tabla === 'products') {
          if (filtros.id) {
            const pedidos = (filtros.id as any[]).map(String);
            return {
              data: estado.products.filter((p) => pedidos.includes(String(p.id))),
              error: null,
            };
          }
          if (filtros.barcode) {
            const pedidos = (filtros.barcode as any[]).map(String);
            return {
              data: estado.products.filter((p) => pedidos.includes(String(p.barcode))),
              error: null,
            };
          }
          return { data: [], error: null };
        }
        return { data: [], error: null };
      };

      const api: any = {
        select: (columnas: string) => {
          estado.selects.push({ tabla, columnas });
          return api;
        },
        eq: (col: string, val: any) => {
          filtros[col] = val;
          return api;
        },
        in: (col: string, vals: any[]) => {
          filtros[col] = vals;
          return api;
        },
        then: (resolver: any) => resolver(resultado()),
      };
      return api;
    },
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: { error: () => {}, warn: () => {}, info: () => {} },
}));

import { restoreOrderStock } from '@/server/inventory.service';

beforeEach(() => {
  estado.orderItems = [];
  estado.products = [
    { id: 5171, barcode: '7801620009717' },
    { id: 204083, barcode: '7591016871089' },
  ];
  estado.rpc = [];
  estado.selects = [];
  estado.errorOrderItems = null;
  estado.errorRpc = null;
});

const devoluciones = () => estado.rpc.filter((c) => c.name === 'increment_product_stock');

describe('devolución de stock de una orden', () => {
  it('traduce products.id a código de barras y devuelve el stock', async () => {
    // Así lo guarda el checkout de verdad: la clave numérica, no el barcode.
    estado.orderItems = [
      { product_id: '5171', quantity: 3 },
      { product_id: '204083', quantity: 2 },
    ];

    const res = await restoreOrderStock('orden-1', { reason: 'MP_REJECTED' });

    expect(res).toMatchObject({ ok: true, devueltos: 2, fallidos: 0, sinResolver: [] });
    expect(devoluciones().map((c) => [c.args.p_barcode, c.args.p_quantity])).toEqual([
      ['7801620009717', 3],
      ['7591016871089', 2],
    ]);
    expect(devoluciones()[0].args.p_reference).toBe('orden-1');
    expect(devoluciones()[0].args.p_reason).toBe('MP_REJECTED');
  });

  it('no le pide a PostgREST el embed que no puede resolver', async () => {
    // Es el error concreto que se está cerrando: pedir `products(...)` desde
    // `order_items` devuelve PGRST200 y tira abajo toda la devolución.
    estado.orderItems = [{ product_id: '5171', quantity: 1 }];

    await restoreOrderStock('orden-1');

    const deOrderItems = estado.selects.filter((s) => s.tabla === 'order_items');
    expect(deOrderItems).toHaveLength(1);
    expect(deOrderItems[0].columnas).not.toContain('products');
  });

  it('informa el ítem que no pudo resolver en vez de descartarlo callado', async () => {
    estado.orderItems = [
      { product_id: '5171', quantity: 3 },
      { product_id: '999999', quantity: 7 }, // no existe
    ];

    const res = await restoreOrderStock('orden-1');

    expect(res).toMatchObject({ ok: true, devueltos: 1, sinResolver: ['999999'] });
    // El que sí existía igual volvió al inventario: un ítem roto no puede
    // arrastrar al resto de la orden.
    expect(devoluciones().map((c) => c.args.p_barcode)).toEqual(['7801620009717']);
  });

  it('resuelve una orden vieja guardada con el código de barras', async () => {
    estado.orderItems = [{ product_id: '7801620009717', quantity: 4 }];

    const res = await restoreOrderStock('orden-vieja');

    expect(res).toMatchObject({ ok: true, devueltos: 1, sinResolver: [] });
    expect(devoluciones()[0].args.p_barcode).toBe('7801620009717');
  });

  it('devuelve el error de la base en vez de dar la devolución por buena', async () => {
    estado.orderItems = [{ product_id: '5171', quantity: 3 }];
    estado.errorOrderItems = { message: 'conexión caída' };

    const res = await restoreOrderStock('orden-1');

    expect(res).toEqual({ ok: false, error: 'conexión caída' });
    expect(devoluciones()).toHaveLength(0);
  });

  it('cuenta como fallido el movimiento que la RPC rechaza', async () => {
    estado.orderItems = [{ product_id: '5171', quantity: 3 }];
    estado.errorRpc = { message: 'sucursal inexistente' };

    const res = await restoreOrderStock('orden-1');

    expect(res).toMatchObject({ ok: true, devueltos: 0, fallidos: 1 });
  });

  it('una orden sin ítems no mueve stock ni se reporta como error', async () => {
    const res = await restoreOrderStock('orden-vacia');

    expect(res).toEqual({ ok: true, devueltos: 0, fallidos: 0, sinResolver: [] });
    expect(devoluciones()).toHaveLength(0);
  });
});
