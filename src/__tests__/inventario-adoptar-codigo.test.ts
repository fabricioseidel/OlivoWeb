import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * El código escaneado se perdía.
 *
 * Al inventariar, un producto cargado a mano tiene código interno
 * (900000000xxx). Se escanea el código real, no aparece, se busca por
 * nombre y se elige de la lista: hasta ahora eso sólo lo marcaba como
 * verificado, con su código viejo. A la vuelta siguiente el escáner volvía
 * a no encontrarlo, para siempre.
 *
 * Lo que protege este test es que elegir el producto lo deje con el código
 * escaneado, y que el renombrado pase por la RPC —que arrastra ventas,
 * movimientos, stock y conteos— y no por un UPDATE suelto.
 */

const state: {
  producto: any;
  rpcCalls: Array<{ name: string; args: any }>;
  rpcError: { message: string } | null;
  updates: any[];
} = { producto: null, rpcCalls: [], rpcError: null, updates: [] };

vi.mock('@/lib/api-auth', () => ({
  requireApiAdminOrSeller: async () => ({
    ok: true,
    userId: 'vendedor-1',
    session: { user: { name: 'Cajera' } },
  }),
}));

vi.mock('@/lib/supabase-server', () => ({
  supabaseServer: {
    from: () => {
      const api: any = {
        select: () => api,
        eq: (_col: string, _val: string) => api,
        maybeSingle: async () => ({ data: state.producto, error: null }),
        update: (valores: any) => {
          state.updates.push(valores);
          return { eq: async () => ({ error: null }) };
        },
      };
      return api;
    },
    rpc: async (name: string, args: any) => {
      state.rpcCalls.push({ name, args });
      return { error: state.rpcError };
    },
  },
}));

import { POST } from '@/app/api/admin/inventario/adoptar-codigo/route';

const pedir = (body: unknown) =>
  POST({ json: async () => body } as any);

beforeEach(() => {
  state.producto = {
    barcode: '900000000122',
    name: 'Compota Watts Manzana 90 gr',
    is_active: false,
  };
  state.rpcCalls = [];
  state.rpcError = null;
  state.updates = [];
});

describe('POST /api/admin/inventario/adoptar-codigo', () => {
  it('renombra por RPC y deja el producto con el código escaneado', async () => {
    const res = await pedir({ oldBarcode: '900000000122', newBarcode: '7801620011840' });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(state.rpcCalls).toEqual([
      {
        name: 'rename_product_barcode',
        args: { p_old_barcode: '900000000122', p_new_barcode: '7801620011840' },
      },
    ]);
    expect(data.barcode).toBe('7801620011840');
    expect(data.codigoAnterior).toBe('900000000122');
  });

  it('lo marca verificado y activo, que es lo que significa escanearlo', async () => {
    const res = await pedir({ oldBarcode: '900000000122', newBarcode: '7801620011840' });
    const data = await res.json();

    expect(state.updates).toHaveLength(1);
    expect(state.updates[0].is_active).toBe(true);
    expect(state.updates[0].verified_at).toEqual(expect.any(String));
    expect(state.updates[0].verified_by).toBe('Cajera');
    // Estaba inactivo: la pantalla lo muestra como "recién activado"
    expect(data.recienActivado).toBe(true);
  });

  it('no toca nada si el producto de destino no existe', async () => {
    state.producto = null;

    const res = await pedir({ oldBarcode: '900000000999', newBarcode: '7801620011840' });

    expect(res.status).toBe(404);
    expect(state.rpcCalls).toEqual([]);
    expect(state.updates).toEqual([]);
  });

  it('devuelve 409 cuando el código escaneado ya es de otro producto', async () => {
    state.rpcError = { message: 'El código 7801620011840 ya está en uso por otro producto' };

    const res = await pedir({ oldBarcode: '900000000122', newBarcode: '7801620011840' });
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toMatch(/ya está en uso/);
    // El renombrado falló: el producto no puede quedar marcado como verificado
    expect(state.updates).toEqual([]);
  });

  it('rechaza el caso en que el código escaneado es el que ya tenía', async () => {
    const res = await pedir({ oldBarcode: '900000000122', newBarcode: '900000000122' });

    expect(res.status).toBe(400);
    expect(state.rpcCalls).toEqual([]);
  });
});
