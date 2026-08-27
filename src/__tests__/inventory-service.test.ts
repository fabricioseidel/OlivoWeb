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

const SUCURSAL_POR_DEFECTO = 'branch-principal';

const state: {
  rpcCalls: Array<{ name: string; args: any }>;
  /** Stock en la sucursal, por código. Es lo que manda para calcular el ajuste. */
  branchStock: Map<string, number>;
  productExists: boolean;
  rpcError: any;
  rpcData: any;
  rows: Array<{ barcode: string; stock: number }>;
  /** `null` simula que no hay sucursal por defecto activa. */
  defaultBranchId: string | null;
} = {
  rpcCalls: [],
  branchStock: new Map(),
  productExists: true,
  rpcError: null,
  rpcData: 1,
  rows: [],
  defaultBranchId: SUCURSAL_POR_DEFECTO,
};

vi.mock('@/lib/supabase-server', () => ({
  supabaseServer: {
    rpc: async (name: string, args: any) => {
      state.rpcCalls.push({ name, args });
      return { data: state.rpcError ? null : state.rpcData, error: state.rpcError };
    },
    // El mock distingue por tabla a propósito: el ajuste lee el stock de
    // `branch_stock` y la existencia del producto de `products`. Un mock que
    // devolviera lo mismo para las dos dejaría pasar justamente el error que
    // estos tests vigilan.
    from: (tabla: string) => {
      const api: any = {
        select: () => api,
        eq: () => api,
        in: async () => {
          if (tabla === 'branch_stock') {
            return {
              data: [...state.branchStock].map(([product_barcode, stock]) => ({
                product_barcode,
                stock,
              })),
              error: null,
            };
          }
          // products: sólo se consulta qué códigos existen.
          return { data: state.rows.map((r) => ({ barcode: r.barcode })), error: null };
        },
        maybeSingle: async () => {
          if (tabla === 'branches') {
            return {
              data: state.defaultBranchId ? { id: state.defaultBranchId } : null,
              error: null,
            };
          }
          return { data: state.productExists ? { barcode: '123' } : null, error: null };
        },
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
  setStockLevels,
  STOCK_REASON,
} from '@/server/inventory.service';

beforeEach(() => {
  state.rpcCalls = [];
  state.branchStock = new Map();
  state.productExists = true;
  state.rpcError = null;
  state.rpcData = 1;
  state.rows = [];
  state.defaultBranchId = SUCURSAL_POR_DEFECTO;
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
    state.branchStock.set('123', 8);
    const res = await setStockLevel('123', 10);

    expect(res.ok).toBe(true);
    expect(lastCall().name).toBe('apply_reception');
    expect(lastCall().args.p_items).toEqual([{ barcode: '123', qty: 2, name: null }]);
    expect(lastCall().args.p_notes).toBe(STOCK_REASON.MANUAL_ADJUSTMENT);
  });

  it('baja la diferencia cuando el objetivo es menor', async () => {
    state.branchStock.set('123', 8);
    await setStockLevel('123', 3);

    expect(lastCall().name).toBe('apply_reception_reverse');
    expect(lastCall().args.p_items).toEqual([{ barcode: '123', qty: 5, name: null }]);
  });

  it('no toca la base si el stock ya es el pedido', async () => {
    state.branchStock.set('123', 7);
    const res = await setStockLevel('123', 7);

    expect(res).toEqual({ ok: true, count: 0 });
    expect(state.rpcCalls).toHaveLength(0);
  });

  it('parte de cero cuando el producto todavía no tiene stock', async () => {
    // Sin fila en `branch_stock`: no está faltante, está en cero.
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

describe('ajuste masivo de stock', () => {
  it('agrupa todo en dos llamadas, no una por producto', async () => {
    state.rows = [{ barcode: 'sube', stock: 0 }, { barcode: 'baja', stock: 0 }, { barcode: 'igual', stock: 0 }];
    state.branchStock = new Map([['sube', 2], ['baja', 9], ['igual', 5]]);

    const res = await setStockLevels([
      { barcode: 'sube', target: 6 },
      { barcode: 'baja', target: 4 },
      { barcode: 'igual', target: 5 },
    ]);

    expect(res.ok).toBe(true);
    expect(state.rpcCalls).toHaveLength(2);

    const entrada = state.rpcCalls.find((c) => c.name === 'apply_reception')!;
    const salida = state.rpcCalls.find((c) => c.name === 'apply_reception_reverse')!;

    // Diferencias, no totales, y el que no cambia no viaja.
    expect(entrada.args.p_items).toEqual([{ barcode: 'sube', qty: 4, name: null }]);
    expect(salida.args.p_items).toEqual([{ barcode: 'baja', qty: 5, name: null }]);
  });

  it('no llama a la base cuando ningún stock cambia', async () => {
    state.rows = [{ barcode: 'a', stock: 0 }];
    state.branchStock = new Map([['a', 3]]);
    const res = await setStockLevels([{ barcode: 'a', target: 3 }]);

    expect(res).toEqual({ ok: true, count: 0 });
    expect(state.rpcCalls).toHaveLength(0);
  });

  it('ajusta los que existen y reporta los que no', async () => {
    state.rows = [{ barcode: 'existe', stock: 0 }];
    state.branchStock = new Map([['existe', 1]]);
    const res = await setStockLevels([
      { barcode: 'existe', target: 4 },
      { barcode: 'fantasma', target: 10 },
    ]);

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain('fantasma');
    // El que sí existe se ajustó igual.
    expect(lastCall().args.p_items).toEqual([{ barcode: 'existe', qty: 3, name: null }]);
  });

  it('ignora objetivos inválidos sin tocar la base', async () => {
    const res = await setStockLevels([
      { barcode: 'a', target: -5 },
      { barcode: '', target: 3 },
    ]);

    expect(res).toEqual({ ok: true, count: 0 });
    expect(state.rpcCalls).toHaveLength(0);
  });
});

describe('el ajuste se mide contra la sucursal, no contra el total', () => {
  /**
   * Es el error que dejó el inventario mal en agosto de 2026.
   *
   * `products.stock` es la suma de las sucursales. Usarlo como base del delta
   * y aplicar ese delta a UNA sola sucursal da un ajuste equivocado apenas hay
   * más de una con existencias, y el resultado es plausible: el total queda
   * cerca y el detalle por sucursal queda inventado, así que nadie lo nota
   * hasta que el checkout falla por falta de stock.
   */
  it('con 42 en la sucursal y 84 en el total, pedir 50 sube 8 y no baja 34', async () => {
    state.branchStock.set('123', 42); // lo que hay en la sucursal
    // El total del producto sería 84 (otra sucursal con otras 42). Si el
    // cálculo mirara ahí, esto saldría como una BAJA de 34.
    await setStockLevel('123', 50);

    expect(lastCall().name).toBe('apply_reception');
    expect(lastCall().args.p_items).toEqual([{ barcode: '123', qty: 8, name: null }]);
  });

  it('aplica el movimiento en la misma sucursal que midió', async () => {
    state.branchStock.set('123', 5);
    await setStockLevel('123', 9);

    expect(lastCall().args.p_branch_id).toBe(SUCURSAL_POR_DEFECTO);
  });

  it('respeta la sucursal indicada en vez de la de por defecto', async () => {
    state.branchStock.set('123', 5);
    await setStockLevel('123', 9, { branchId: 'otra-sucursal' });

    expect(lastCall().args.p_branch_id).toBe('otra-sucursal');
  });

  it('el ajuste masivo también mide contra la sucursal', async () => {
    state.rows = [{ barcode: 'a', stock: 0 }];
    state.branchStock = new Map([['a', 42]]);

    await setStockLevels([{ barcode: 'a', target: 50 }]);

    expect(lastCall().name).toBe('apply_reception');
    expect(lastCall().args.p_items).toEqual([{ barcode: 'a', qty: 8, name: null }]);
    expect(lastCall().args.p_branch_id).toBe(SUCURSAL_POR_DEFECTO);
  });

  it('un producto que existe pero nunca tuvo movimiento cuenta cero, no falta', async () => {
    // Sin fila en `branch_stock` pero presente en `products`: hay que cargarle
    // las 10 unidades, no reportarlo como inexistente.
    state.rows = [{ barcode: 'nuevo', stock: 0 }];

    const res = await setStockLevels([{ barcode: 'nuevo', target: 10 }]);

    expect(res.ok).toBe(true);
    expect(lastCall().args.p_items).toEqual([{ barcode: 'nuevo', qty: 10, name: null }]);
  });

  it('sin sucursal por defecto activa no adivina: falla y no mueve nada', async () => {
    state.defaultBranchId = null;
    state.branchStock.set('123', 5);

    const res = await setStockLevel('123', 9);

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/sucursal/i);
    expect(state.rpcCalls).toHaveLength(0);
  });

  it('lo mismo en el masivo: sin sucursal, ni una llamada', async () => {
    state.defaultBranchId = null;
    state.rows = [{ barcode: 'a', stock: 0 }];

    const res = await setStockLevels([{ barcode: 'a', target: 5 }]);

    expect(res.ok).toBe(false);
    expect(state.rpcCalls).toHaveLength(0);
  });
});
