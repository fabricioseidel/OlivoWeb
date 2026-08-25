import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * `branch_stock` es la fuente de verdad y `products.stock` es su suma
 * recalculada. Lo que estos tests protegen es que NADIE escriba esa columna a
 * mano: cada movimiento tiene que salir como una RPC con el signo y la
 * cantidad correctos.
 *
 * El caso que rompía datos en producción era el ajuste manual: se mandaba el
 * total absoluto y pisaba la recepción que otra persona acababa de registrar.
 * Ahora se manda la diferencia, así que dos operaciones concurrentes se suman
 * en vez de pisarse.
 */

const state: {
  rpcCalls: Array<{ name: string; args: any }>;
  productStock: number | null;
  productExists: boolean;
  rpcError: any;
  rpcData: any;
} = { rpcCalls: [], productStock: 0, productExists: true, rpcError: null, rpcData: 1 };

vi.mock('@/lib/supabase-server', () => ({
  supabaseServer: {
    rpc: async (name: string, args: any) => {
      state.rpcCalls.push({ name, args });
      return { data: state.rpcError ? null : state.rpcData, error: state.rpcError };
    },
    from: () => {
      const api: any = {
        select: () => api,
        eq: () => api,
        maybeSingle: async () => ({
          data: state.productExists ? { stock: state.productStock } : null,
          error: null,
        }),
      };
      return api;
    },
  },
}));

import {
  applyReception,
  applyPosSale,
  reverseReception,
  reserveStockForWebSale,
  setStockLevel,
  STOCK_REASON,
} from '@/server/inventory.service';

beforeEach(() => {
  state.rpcCalls = [];
  state.productStock = 0;
  state.productExists = true;
  state.rpcError = null;
  state.rpcData = 1;
});

const lastCall = () => state.rpcCalls[state.rpcCalls.length - 1];

describe('movimientos de stock', () => {
  it('una recepción entra como apply_reception con la cantidad recibida', async () => {
    const res = await applyReception([{ barcode: '123', qty: 5 }]);

    expect(res.ok).toBe(true);
    expect(lastCall().name).toBe('apply_reception');
    expect(lastCall().args.p_items).toEqual([{ barcode: '123', qty: 5, name: null }]);
    expect(lastCall().args.p_notes).toBe(STOCK_REASON.RECEPTION);
  });

  it('una venta de mostrador sale como movimiento OUT, no como recepción', async () => {
    await applyPosSale([{ barcode: '123', qty: 2 }], { reference: '99' });

    expect(lastCall().name).toBe('apply_reception_reverse');
    expect(lastCall().args.p_notes).toBe(STOCK_REASON.POS_SALE);
    expect(lastCall().args.p_reference).toBe('99');
  });

  it('la reversión de una recepción se distingue de una venta por el motivo', async () => {
    await reverseReception([{ barcode: '123', qty: 3 }]);

    expect(lastCall().name).toBe('apply_reception_reverse');
    expect(lastCall().args.p_notes).toBe(STOCK_REASON.RECEPTION_REVERSE);
  });

  it('descarta ítems sin código o con cantidad no positiva', async () => {
    const res = await applyReception([
      { barcode: '', qty: 5 },
      { barcode: '123', qty: 0 },
      { barcode: '456', qty: -2 },
    ]);

    expect(res.ok).toBe(false);
    expect(state.rpcCalls).toHaveLength(0);
  });

  it('propaga el error de la base en vez de dar por buena la operación', async () => {
    state.rpcError = { message: 'branch inexistente' };
    const res = await applyReception([{ barcode: '123', qty: 1 }]);

    expect(res).toEqual({ ok: false, error: 'branch inexistente' });
  });

  it('la venta web reserva stock y respeta el rechazo por falta de stock', async () => {
    // La RPC devuelve un booleano: true si alcanzó a reservar.
    state.rpcData = true;
    const ok = await reserveStockForWebSale('123', 2, { reference: 'order-1' });
    expect(lastCall().name).toBe('decrement_stock_atomic');
    expect(lastCall().args.p_reason).toBe(STOCK_REASON.WEB_SALE);
    expect(ok).toBe(true);

    // Sin stock suficiente la RPC devuelve false y no mueve nada.
    state.rpcData = false;
    expect(await reserveStockForWebSale('123', 2)).toBe(false);

    state.rpcError = { message: 'sin stock' };
    expect(await reserveStockForWebSale('123', 2)).toBe(false);
  });
});

describe('ajuste manual de stock', () => {
  it('sube la diferencia, no el total, cuando el objetivo es mayor', async () => {
    state.productStock = 8;
    const res = await setStockLevel('123', 10);

    expect(res.ok).toBe(true);
    expect(lastCall().name).toBe('apply_reception');
    expect(lastCall().args.p_items).toEqual([{ barcode: '123', qty: 2, name: null }]);
    expect(lastCall().args.p_notes).toBe(STOCK_REASON.MANUAL_ADJUSTMENT);
  });

  it('baja la diferencia cuando el objetivo es menor', async () => {
    state.productStock = 8;
    await setStockLevel('123', 3);

    expect(lastCall().name).toBe('apply_reception_reverse');
    expect(lastCall().args.p_items).toEqual([{ barcode: '123', qty: 5, name: null }]);
  });

  it('no toca la base si el stock ya es el pedido', async () => {
    state.productStock = 7;
    const res = await setStockLevel('123', 7);

    expect(res).toEqual({ ok: true, count: 0 });
    expect(state.rpcCalls).toHaveLength(0);
  });

  it('parte de cero cuando el producto todavía no tiene stock', async () => {
    state.productStock = null;
    await setStockLevel('123', 4);

    expect(lastCall().name).toBe('apply_reception');
    expect(lastCall().args.p_items[0].qty).toBe(4);
  });

  it('rechaza cantidades inválidas antes de llegar a la base', async () => {
    expect((await setStockLevel('123', -1)).ok).toBe(false);
    expect((await setStockLevel('123', NaN)).ok).toBe(false);
    expect((await setStockLevel('', 5)).ok).toBe(false);
    expect(state.rpcCalls).toHaveLength(0);
  });

  it('falla claro si el producto no existe', async () => {
    state.productExists = false;
    const res = await setStockLevel('999', 5);

    expect(res.ok).toBe(false);
    expect(state.rpcCalls).toHaveLength(0);
  });
});
