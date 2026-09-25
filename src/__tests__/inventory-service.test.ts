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
  /** Códigos que `apply_stock_absolute` reporta como inexistentes. */
  desconocidos: string[];
  /** Cuántas filas dice la RPC que movió de verdad. */
  ajustados: number;
} = {
  rpcCalls: [],
  branchStock: new Map(),
  productExists: true,
  rpcError: null,
  rpcData: 1,
  rows: [],
  defaultBranchId: SUCURSAL_POR_DEFECTO,
  desconocidos: [],
  ajustados: 1,
};

vi.mock('@/lib/supabase-server', () => ({
  supabaseServer: {
    rpc: async (name: string, args: any) => {
      state.rpcCalls.push({ name, args });
      if (state.rpcError) return { data: null, error: state.rpcError };

      // `apply_stock_absolute` devuelve jsonb, no un entero como las demás.
      if (name === 'apply_stock_absolute') {
        return {
          data: {
            ok: true,
            aplicados: args.p_items.length,
            ajustados: state.ajustados,
            desconocidos: state.desconocidos,
          },
          error: null,
        };
      }

      return { data: state.rpcData, error: state.rpcError };
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
  state.desconocidos = [];
  state.ajustados = 1;
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
  /**
   * El contrato cambió en `20260910000000_conteo_fisico_de_inventario.sql`: acá
   * ya no se calcula ninguna diferencia. Se manda la cantidad que tiene que
   * quedar y `apply_stock_absolute` resuelve el delta contra `branch_stock` en
   * la misma transacción, con la fila bloqueada.
   *
   * Lo que estos tests protegen es justamente que no vuelva a haber
   * aritmética de stock en TypeScript: leer el stock acá y escribirlo después
   * son dos viajes distintos, y una venta que entre en el medio se pierde.
   */
  it('manda la cantidad objetivo, no una diferencia calculada acá', async () => {
    state.branchStock.set('123', 8);
    const res = await setStockLevel('123', 10);

    expect(res.ok).toBe(true);
    expect(lastCall().name).toBe('apply_stock_absolute');
    expect(lastCall().args.p_items).toEqual([{ barcode: '123', qty: 10 }]);
    expect(lastCall().args.p_reason).toBe(STOCK_REASON.MANUAL_ADJUSTMENT);
  });

  it('bajar el stock usa la misma llamada: el signo lo decide la base', async () => {
    state.branchStock.set('123', 8);
    await setStockLevel('123', 3);

    expect(lastCall().name).toBe('apply_stock_absolute');
    expect(lastCall().args.p_items).toEqual([{ barcode: '123', qty: 3 }]);
  });

  it('cero es una cantidad válida: es como se deja un producto sin existencias', async () => {
    state.branchStock.set('123', 4);
    const res = await setStockLevel('123', 0);

    expect(res.ok).toBe(true);
    expect(lastCall().args.p_items).toEqual([{ barcode: '123', qty: 0 }]);
  });

  it('cuando el stock ya era el pedido, la base no mueve nada y lo informa', async () => {
    state.ajustados = 0;
    const res = await setStockLevel('123', 7);

    expect(res).toEqual({ ok: true, count: 0 });
  });

  it('rechaza cantidades inválidas antes de llegar a la base', async () => {
    expect((await setStockLevel('123', -1)).ok).toBe(false);
    expect((await setStockLevel('123', NaN)).ok).toBe(false);
    expect((await setStockLevel('', 5)).ok).toBe(false);
    expect(state.rpcCalls).toHaveLength(0);
  });

  it('falla claro si el producto no existe', async () => {
    state.desconocidos = ['999'];
    state.ajustados = 0;
    const res = await setStockLevel('999', 5);

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain('999');
  });
});

describe('ajuste masivo de stock', () => {
  it('todo en una sola llamada, no una por producto ni una por signo', async () => {
    state.ajustados = 2;
    const res = await setStockLevels([
      { barcode: 'sube', target: 6 },
      { barcode: 'baja', target: 4 },
      { barcode: 'igual', target: 5 },
    ]);

    expect(res.ok).toBe(true);
    expect(state.rpcCalls).toHaveLength(1);
    expect(lastCall().name).toBe('apply_stock_absolute');
    expect(lastCall().args.p_items).toEqual([
      { barcode: 'sube', qty: 6 },
      { barcode: 'baja', qty: 4 },
      { barcode: 'igual', qty: 5 },
    ]);
  });

  it('cuenta sólo lo que la base movió de verdad', async () => {
    state.ajustados = 0;
    const res = await setStockLevels([{ barcode: 'a', target: 3 }]);

    expect(res).toEqual({ ok: true, count: 0 });
  });

  it('ajusta los que existen y reporta los que no', async () => {
    state.desconocidos = ['fantasma'];
    state.ajustados = 1;
    const res = await setStockLevels([
      { barcode: 'existe', target: 4 },
      { barcode: 'fantasma', target: 10 },
    ]);

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toContain('fantasma');
      // El que sí existe se ajustó igual: el fallo es parcial, no total.
      expect(res.count).toBe(1);
    }
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

describe('el ajuste se aplica sobre una sucursal concreta', () => {
  /**
   * Es el error que dejó el inventario mal en agosto de 2026: medir el ajuste
   * contra `products.stock` (la suma de las sucursales) y aplicarlo a UNA
   * sucursal da un total plausible y un detalle inventado, y nadie lo nota
   * hasta que el checkout falla por falta de stock.
   *
   * Ahora la medición la hace la RPC contra la fila de `branch_stock` de la
   * sucursal que recibe, así que lo que hay que asegurar acá es que la
   * sucursal viaje siempre y sea la correcta.
   */
  it('aplica en la sucursal por defecto cuando no se indica otra', async () => {
    await setStockLevel('123', 9);

    expect(lastCall().args.p_branch_id).toBe(SUCURSAL_POR_DEFECTO);
  });

  it('respeta la sucursal indicada en vez de la de por defecto', async () => {
    await setStockLevel('123', 9, { branchId: 'otra-sucursal' });

    expect(lastCall().args.p_branch_id).toBe('otra-sucursal');
  });

  it('el masivo también manda la sucursal, nunca null', async () => {
    await setStockLevels([{ barcode: 'a', target: 50 }]);

    expect(lastCall().args.p_branch_id).toBe(SUCURSAL_POR_DEFECTO);
  });

  it('un producto que existe pero nunca tuvo movimiento cuenta cero, no falta', async () => {
    // Sin fila en `branch_stock`: la RPC la crea en cero y sube las 10.
    const res = await setStockLevels([{ barcode: 'nuevo', target: 10 }]);

    expect(res.ok).toBe(true);
    expect(lastCall().args.p_items).toEqual([{ barcode: 'nuevo', qty: 10 }]);
  });

  it('sin sucursal por defecto activa no adivina: falla y no mueve nada', async () => {
    state.defaultBranchId = null;

    const res = await setStockLevel('123', 9);

    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toMatch(/sucursal/i);
    expect(state.rpcCalls).toHaveLength(0);
  });

  it('lo mismo en el masivo: sin sucursal, ni una llamada', async () => {
    state.defaultBranchId = null;

    const res = await setStockLevels([{ barcode: 'a', target: 5 }]);

    expect(res.ok).toBe(false);
    expect(state.rpcCalls).toHaveLength(0);
  });
});
