import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TOPE_FLASH_DESPACHO_CLP } from '@/lib/flash-policy';

/**
 * El despacho es el único punto del sistema donde la tienda gasta plata de
 * verdad: crear la entrega le cobra a Uber lo que Uber diga, sin que nadie lo
 * apruebe.
 *
 * Y la cotización que se usa acá **no la vio nadie**. La que el cliente aceptó
 * caduca a los pocos minutos, así que entre el pago y la confirmación de
 * MercadoPago se pide una nueva. Sin tope, esa recotización creaba la entrega
 * al precio que fuera: un pico de lluvia dejaba una entrega de $20.000 sobre
 * un envío cobrado a $3.000 —o sobre uno regalado— en silencio.
 */

const llamadas: { cotizar: number; crear: number } = { cotizar: 0, crear: 0 };
const ordenes: Record<string, any> = {};
const auditorias: any[] = [];

let cotizacionQueDevuelve: { quoteId: string; costoCLP: number; etaMin: number | null; expira: string | null } | null =
  { quoteId: 'q-nueva', costoCLP: 3000, etaMin: 20, expira: null };

vi.mock('@/server/uber-direct.service', () => ({
  cotizarFlash: async () => {
    llamadas.cotizar++;
    return cotizacionQueDevuelve;
  },
  crearEntregaFlash: async () => {
    llamadas.crear++;
    return { id: 'del-1', tracking: 'https://uber/t/1', estado: 'pending', feeCLP: 3000 };
  },
}));

vi.mock('@/server/audit.service', () => ({
  auditLog: async (entrada: any) => {
    auditorias.push(entrada);
  },
}));

vi.mock('@/lib/supabase-server', () => ({
  supabaseServer: {
    from: () => {
      let cambios: any = null;
      const api: any = {
        update: (valores: any) => {
          cambios = valores;
          return api;
        },
        eq: (_col: string, valor: string) => {
          api._id = valor;
          return api;
        },
        is: () => api,
        or: () => api,
        select: () => {
          // Es el UPDATE condicional que toma el pedido en exclusiva: sólo
          // devuelve fila si nadie lo tomó antes.
          const orden = ordenes[api._id];
          if (!orden || orden.express_delivery_id || orden.express_status === 'creando') {
            return Promise.resolve({ data: [], error: null });
          }
          Object.assign(orden, cambios);
          return Promise.resolve({ data: [{ id: api._id }], error: null });
        },
        then: (resolve: any) => {
          if (ordenes[api._id]) Object.assign(ordenes[api._id], cambios);
          return resolve({ error: null });
        },
      };
      return api;
    },
  },
}));

import { despacharPedidoFlash } from '@/server/entrega-flash.service';

/** Un pedido pagado, con la cotización del checkout ya vencida. */
const pedidoPagado = (extra: Record<string, any> = {}) => {
  const id = 'ord-1';
  ordenes[id] = { id, express_delivery_id: null, express_status: null };
  return {
    id,
    total: 25000,
    shipping_cost: 3000,
    shipping_address: {
      address: 'Av. Irarrázaval 3400',
      city: 'Ñuñoa',
      fullName: 'Cliente de prueba',
      phone: '+56912345678',
      // Vencida: fuerza la recotización, que es el camino sin tope.
      uberQuoteId: 'q-vieja',
      uberQuoteExpira: new Date(Date.now() - 60_000).toISOString(),
      ...extra,
    },
    express_delivery_id: null,
  };
};

beforeEach(() => {
  llamadas.cotizar = 0;
  llamadas.crear = 0;
  auditorias.length = 0;
  cotizacionQueDevuelve = { quoteId: 'q-nueva', costoCLP: 3000, etaMin: 20, expira: null };
  for (const k of Object.keys(ordenes)) delete ordenes[k];
});

describe('tope de despacho', () => {
  it('crea la entrega cuando la recotización está dentro del tope', async () => {
    cotizacionQueDevuelve = { quoteId: 'q-nueva', costoCLP: 4200, etaMin: 20, expira: null };

    const r = await despacharPedidoFlash(pedidoPagado(), 'test');

    expect(r.ok).toBe(true);
    expect(llamadas.crear).toBe(1);
  });

  it('NO crea la entrega cuando la recotización se dispara', async () => {
    // El caso que costaba plata: Uber a $20.000 sobre un envío cobrado a $3.000.
    cotizacionQueDevuelve = { quoteId: 'q-cara', costoCLP: 20000, etaMin: 20, expira: null };

    const r = await despacharPedidoFlash(pedidoPagado(), 'test');

    expect(r.ok).toBe(false);
    // Lo que importa: no se le pidió el repartidor a Uber.
    expect(llamadas.crear).toBe(0);
  });

  it('deja el precio a la vista para que una persona decida', async () => {
    cotizacionQueDevuelve = { quoteId: 'q-cara', costoCLP: 20000, etaMin: 20, expira: null };

    const r = await despacharPedidoFlash(pedidoPagado(), 'test');

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.motivo).toContain('20.000');
    expect(ordenes['ord-1'].express_status).toBe('failed');
    expect(ordenes['ord-1'].express_error).toContain('20.000');

    const fallo = auditorias.find((a) => a.action === 'UBER_DELIVERY_FAILED');
    expect(fallo.details).toMatchObject({
      motivo: 'sobre-el-tope-de-despacho',
      costoRecotizado: 20000,
      tope: TOPE_FLASH_DESPACHO_CLP,
      cobradoAlCliente: 3000,
    });
  });

  it('el borde justo del tope se despacha', async () => {
    cotizacionQueDevuelve = {
      quoteId: 'q-borde',
      costoCLP: TOPE_FLASH_DESPACHO_CLP,
      etaMin: 20,
      expira: null,
    };

    const r = await despacharPedidoFlash(pedidoPagado(), 'test');

    expect(r.ok).toBe(true);
    expect(llamadas.crear).toBe(1);
  });

  it('un peso por encima ya no', async () => {
    cotizacionQueDevuelve = {
      quoteId: 'q-borde',
      costoCLP: TOPE_FLASH_DESPACHO_CLP + 1,
      etaMin: 20,
      expira: null,
    };

    const r = await despacharPedidoFlash(pedidoPagado(), 'test');

    expect(r.ok).toBe(false);
    expect(llamadas.crear).toBe(0);
  });

  it('protege también al envío regalado, donde la tienda paga todo', async () => {
    cotizacionQueDevuelve = { quoteId: 'q-cara', costoCLP: 15000, etaMin: 20, expira: null };
    const pedido = { ...pedidoPagado(), shipping_cost: 0 };

    const r = await despacharPedidoFlash(pedido, 'test');

    expect(r.ok).toBe(false);
    expect(llamadas.crear).toBe(0);
    const fallo = auditorias.find((a) => a.action === 'UBER_DELIVERY_FAILED');
    expect(fallo.details.cobradoAlCliente).toBe(0);
  });
});

describe('lo que ya andaba sigue andando', () => {
  it('no recotiza si la cotización del checkout sigue viva', async () => {
    const pedido = pedidoPagado({
      uberQuoteId: 'q-viva',
      uberQuoteExpira: new Date(Date.now() + 5 * 60_000).toISOString(),
    });

    const r = await despacharPedidoFlash(pedido, 'test');

    expect(r.ok).toBe(true);
    // Esa cotización ya pasó por el tope al crear el pedido: no se vuelve a pedir.
    expect(llamadas.cotizar).toBe(0);
    expect(llamadas.crear).toBe(1);
  });

  it('marca fallo sin crear nada cuando Uber no cubre la dirección', async () => {
    cotizacionQueDevuelve = null;

    const r = await despacharPedidoFlash(pedidoPagado(), 'test');

    expect(r.ok).toBe(false);
    expect(llamadas.crear).toBe(0);
    expect(ordenes['ord-1'].express_status).toBe('failed');
  });

  it('no pide un segundo repartidor si la orden ya tiene entrega', async () => {
    const pedido = { ...pedidoPagado(), express_delivery_id: 'del-ya-existe' };

    const r = await despacharPedidoFlash(pedido, 'test');

    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.yaTenia).toBe(true);
    expect(llamadas.crear).toBe(0);
  });
});
